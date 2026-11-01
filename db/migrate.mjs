import fs from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  console.error('Defina DATABASE_URL antes de executar a migração.');
  process.exit(1);
}

const host = new URL(process.env.DATABASE_URL).hostname;
const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: local ? false : 'require' });
try {
  const schema = await fs.readFile(path.join(import.meta.dirname, 'schema.sql'), 'utf8');
  await sql.unsafe(schema);
  const rows = await sql`SELECT count(*)::integer AS count FROM slots WHERE year = 2026`;
  console.log(`Banco preparado: ${rows[0].count} lotes em 2026.`);
} finally {
  await sql.end();
}
