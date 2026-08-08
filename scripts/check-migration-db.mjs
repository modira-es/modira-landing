import postgres from 'postgres';
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(JSON.stringify({ error: 'DATABASE_URL not set in environment' }));
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

  const drizzle = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'drizzle%'
    ORDER BY table_name
  `;

  console.log(JSON.stringify({ tables, drizzle }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: error.message || String(error) }, null, 2));
  process.exit(2);
} finally {
  await sql.end();
}
