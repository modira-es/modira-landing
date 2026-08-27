import postgres from 'postgres';
import 'dotenv/config';
import { writeFileSync } from 'fs';

const url = process.env.DATABASE_URL;
const output = {
  database_url: url || null,
  tables: null,
  error: null,
};

if (!url) {
  output.error = 'DATABASE_URL not found';
  writeFileSync('scripts/check-db-result.json', JSON.stringify(output, null, 2));
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

try {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('companies', 'profiles', 'clients')
    ORDER BY table_name
  `;
  output.tables = tables;
} catch (error) {
  output.error = error && error.message ? error.message : String(error);
} finally {
  await sql.end();
  writeFileSync('scripts/check-db-result.json', JSON.stringify(output, null, 2));
}
