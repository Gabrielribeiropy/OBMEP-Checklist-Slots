import fs from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada");
const host = new URL(process.env.DATABASE_URL).hostname;
const local = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: local ? false : "require" });
try {
  const migration = await fs.readFile(new URL("./migrations/2026-10-31-correction-review.sql", import.meta.url), "utf8");
  await sql.unsafe(migration);
  const rows = await sql`SELECT count(*)::int AS total,
    count(*) FILTER (WHERE notas_at IS NOT NULL)::int AS notas_existentes
    FROM slots WHERE year = 2026`;
  console.log(`Migração aplicada. Lotes: ${rows[0].total}; notas já confirmadas preservadas: ${rows[0].notas_existentes}.`);
} finally {
  await sql.end();
}
