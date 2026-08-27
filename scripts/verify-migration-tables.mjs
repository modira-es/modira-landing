import postgres from 'postgres';
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
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
  console.log(JSON.stringify({ tables }, null, 2));

  const policies = await sql`
    SELECT polname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('companies', 'profiles', 'clients')
    ORDER BY tablename, polname
  `;
  console.log(JSON.stringify({ policies }, null, 2));

  const profileCount = await sql`SELECT count(*)::int AS count FROM public.profiles`;
  console.log(JSON.stringify({ profileCount }, null, 2));
} catch (error) {
  console.error('ERROR', error);
  process.exit(2);
} finally {
  await sql.end();
}
