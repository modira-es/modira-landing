import postgres from 'postgres';

const queries = [
  {
    name: 'columns',
    sql: `SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'companies', 'clients')
ORDER BY table_name, ordinal_position;`,
  },
  {
    name: 'constraints',
    sql: `SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('profiles', 'companies', 'clients')
ORDER BY tc.table_name, tc.constraint_name;`,
  },
  {
    name: 'profiles_count',
    sql: `SELECT count(*) AS profile_count FROM public.profiles;`,
  },
  {
    name: 'profiles_without_auth',
    sql: `SELECT count(*) AS missing_auth_count FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);`,
  },
];

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const sql = postgres(url, { max: 1 });
  try {
    for (const q of queries) {
      const result = await sql.unsafe(q.sql);
      console.log(`--- ${q.name} ---`);
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('ERROR', error);
  } finally {
    await sql.end();
  }
})();
