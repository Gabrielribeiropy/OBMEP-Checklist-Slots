import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status, headers });
const allowedNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) &&
  value >= 1 && value <= 999999;

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  try { return !origin || new URL(origin).host === request.nextUrl.host; }
  catch { return false; }
}

export async function GET() {
  try {
    const slots = await db()`
      SELECT s.number, COALESCE(s.level, CASE
               WHEN s.number BETWEEN 100 AND 180 THEN 1
               WHEN s.number BETWEEN 200 AND 280 THEN 2
               WHEN s.number BETWEEN 300 AND 380 THEN 3
             END) AS level, s.pistolado_at, s.correcao_at, s.revisao_at, s.notas_at, s.deleted_at,
             COALESCE(last_event.created_at, s.created_at) AS last_movement_at
      FROM slots s
      LEFT JOIN LATERAL (
        SELECT created_at FROM slot_events
        WHERE slot_id = s.id ORDER BY created_at DESC, id DESC LIMIT 1
      ) last_event ON true
      WHERE s.year = 2026
      ORDER BY s.number`;
    return NextResponse.json({ slots }, { headers });
  } catch (reason) {
    console.error("checklist GET", reason);
    return fail("Não foi possível carregar os lotes. Tente novamente.", 503);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return fail("Origem não permitida.", 403);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 2048) return fail("Dados muito grandes.", 413);

  let body: { action?: unknown; number?: unknown; numbers?: unknown; level?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 2048) return fail("Dados muito grandes.", 413);
    body = JSON.parse(raw);
  } catch { return fail("Dados inválidos."); }

  const number = body?.number as number;
  const numbers = body?.numbers;
  const action = body?.action;
  const level = body?.level;
  const bulk = action === "delete_many";
  if (bulk) {
    if (!Array.isArray(numbers) || numbers.length < 1 || numbers.length > 100 ||
        !numbers.every(allowedNumber) || new Set(numbers).size !== numbers.length) {
      return fail("Selecione de 1 a 100 lotes válidos, sem repetir números.");
    }
  } else if (!allowedNumber(number)) return fail("Número de lote inválido.");
  if (action === "add" && (level !== 1 && level !== 2 && level !== 3)) {
    return fail("Escolha um nível válido.");
  }
  if (action !== "add" && action !== "pistolado" && action !== "pending" && action !== "correcao_confirmada" && action !== "correcao_pendente" && action !== "notas_pistolado" && action !== "notas_pending" && action !== "delete" && action !== "restore" && action !== "delete_many") {
    return fail("Ação inválida.");
  }

  try {
    // A Vercel substitui x-forwarded-for pelo IP real, evitando spoofing desse cabeçalho.
    const source = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const sourceHash = createHash("sha256").update(source).digest("hex");
    const limit = await db()`INSERT INTO public_action_limits(source_hash, window_start, attempts)
      VALUES (${sourceHash}, now(), 1)
      ON CONFLICT (source_hash) DO UPDATE SET
        attempts = CASE WHEN public_action_limits.window_start < now() - interval '1 minute'
          THEN 1 ELSE public_action_limits.attempts + 1 END,
        window_start = CASE WHEN public_action_limits.window_start < now() - interval '1 minute'
          THEN now() ELSE public_action_limits.window_start END
      WHERE public_action_limits.window_start < now() - interval '1 minute'
         OR public_action_limits.attempts < 30
      RETURNING attempts`;
    if (!limit.length) return fail("Muitas alterações. Aguarde um minuto.", 429);

    if (bulk) {
      const bulkHash = createHash("sha256").update(`bulk:${source}`).digest("hex");
      const bulkLimit = await db()`INSERT INTO public_action_limits(source_hash, window_start, attempts)
        VALUES (${bulkHash}, now(), 1)
        ON CONFLICT (source_hash) DO UPDATE SET attempts = 1, window_start = now()
        WHERE public_action_limits.window_start < now() - interval '1 minute'
        RETURNING attempts`;
      if (!bulkLimit.length) return fail("Aguarde um minuto para fazer outra exclusão múltipla.", 429);
      try {
        const deletedCount: number = await db().begin(async (tx) => {
          const rows = await tx`WITH changed AS (
              UPDATE slots SET deleted_at = now()
              WHERE year = 2026 AND number = ANY(${numbers as number[]}::integer[])
                AND deleted_at IS NULL AND notas_at IS NULL
              RETURNING id, number
            ), logged AS (
              INSERT INTO slot_events(slot_id, year, number, action, actor)
              SELECT id, 2026, number, 'deleted', NULL FROM changed
              RETURNING id
            ) SELECT (SELECT count(*)::int FROM changed) AS changed,
                     (SELECT count(*)::int FROM logged) AS logged`;
          if (rows[0].changed !== (numbers as number[]).length || rows[0].logged !== (numbers as number[]).length) {
            throw new Error("BULK_CHANGED");
          }
          return rows[0].changed as number;
        });
        return NextResponse.json({ ok: true, deleted: deletedCount }, { headers });
      } catch (reason) {
        if (reason instanceof Error && reason.message === "BULK_CHANGED") {
          return fail("Algum lote mudou em outro acesso. Atualize a lista e selecione novamente.", 409);
        }
        throw reason;
      }
    }

    const changed = await db().begin(async (tx) => {
      let rows;
      if (action === "add") {
        await tx`SELECT pg_advisory_xact_lock(2026, 1)`;
        rows = await tx`INSERT INTO slots(year, number, level)
          SELECT 2026, ${number}, ${level as number}
          WHERE (SELECT count(*) FROM slots WHERE year = 2026) < 1000
          ON CONFLICT (year, number) DO NOTHING RETURNING id`;
      } else if (action === "pistolado") {
        rows = await tx`UPDATE slots SET pistolado_at = now(), pistolado_by = NULL
          WHERE year = 2026 AND number = ${number} AND deleted_at IS NULL AND pistolado_at IS NULL
          RETURNING id`;
      } else if (action === "pending") {
        rows = await tx`UPDATE slots SET pistolado_at = NULL, pistolado_by = NULL
          WHERE year = 2026 AND number = ${number} AND deleted_at IS NULL AND pistolado_at IS NOT NULL
            AND correcao_at IS NULL AND revisao_at IS NULL AND notas_at IS NULL
          RETURNING id`;
      } else if (action === "correcao_confirmada") {
        rows = await tx`UPDATE slots SET correcao_at = COALESCE(correcao_at, now()),
            revisao_at = COALESCE(revisao_at, now())
          WHERE year = 2026 AND number = ${number} AND deleted_at IS NULL
            AND pistolado_at IS NOT NULL AND notas_at IS NULL
            AND (correcao_at IS NULL OR revisao_at IS NULL)
          RETURNING id`;
      } else if (action === "correcao_pendente") {
        rows = await tx`UPDATE slots SET correcao_at = NULL, revisao_at = NULL
          WHERE year = 2026 AND number = ${number} AND deleted_at IS NULL
            AND (correcao_at IS NOT NULL OR revisao_at IS NOT NULL) AND notas_at IS NULL
          RETURNING id`;
      } else if (action === "notas_pistolado") {
        rows = await tx`UPDATE slots SET notas_at = now()
          WHERE year = 2026 AND number = ${number} AND deleted_at IS NULL
            AND pistolado_at IS NOT NULL AND correcao_at IS NOT NULL
            AND revisao_at IS NOT NULL AND notas_at IS NULL
          RETURNING id`;
      } else if (action === "notas_pending") {
        rows = await tx`UPDATE slots SET notas_at = NULL
          WHERE year = 2026 AND number = ${number} AND deleted_at IS NULL AND notas_at IS NOT NULL
          RETURNING id`;
      } else if (action === "delete") {
        rows = await tx`UPDATE slots SET deleted_at = now()
          WHERE year = 2026 AND number = ${number} AND deleted_at IS NULL AND notas_at IS NULL
          RETURNING id`;
      } else {
        rows = await tx`UPDATE slots SET deleted_at = NULL
          WHERE year = 2026 AND number = ${number} AND deleted_at IS NOT NULL
          RETURNING id`;
      }
      if (!rows.length) return false;
      const eventAction = action === "add" ? "created" : action === "delete" ? "deleted" : action === "restore" ? "restored" : action;
      await tx`INSERT INTO slot_events(slot_id, year, number, action, actor)
        VALUES (${rows[0].id}, 2026, ${number}, ${eventAction}, NULL)`;
      return true;
    });
    if (!changed) return fail(action === "add"
      ? "Esse lote já existe ou o limite de 1000 lotes foi atingido. Se estiver excluído, use Restaurar."
      : "O lote já mudou em outro acesso. A lista será atualizada.", 409);
    return NextResponse.json({ ok: true }, { headers });
  } catch (reason) {
    console.error("checklist POST", reason);
    return fail("Não foi possível salvar. Tente novamente.", 503);
  }
}
