import postgres from 'postgres';
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

const tableNames = [
  'profiles',
  'companies',
  'clients',
  'projects',
  'quotations',
  'invoices',
  'payments',
  'budgets',
  'support_tickets',
  'automations',
  'stripe_products',
  'stripe_prices',
  'user_subscriptions',
];

try {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY(${tableNames})
    ORDER BY table_name;
  `;

  const columns = await sql`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY(${tableNames})
    ORDER BY table_name, ordinal_position;
  `;

  const policies = await sql`
    SELECT tablename, policyname, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(${tableNames})
    ORDER BY tablename, policyname;
  `;

  const indexes = await sql`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = ANY(${tableNames})
    ORDER BY tablename, indexname;
  `;

  console.log(JSON.stringify({ tables, columns, policies, indexes }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: error.message || String(error) }, null, 2));
  process.exit(2);
} finally {
  await sql.end();
}
