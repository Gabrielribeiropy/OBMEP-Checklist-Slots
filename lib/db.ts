import postgres from "postgres";

const globalForDb = globalThis as unknown as { obmepSql?: ReturnType<typeof postgres> };

export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada");
  const host = new URL(process.env.DATABASE_URL).hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  return (globalForDb.obmepSql ??= postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
    ssl: local ? false : "require",
    idle_timeout: 20,
  }));
}
