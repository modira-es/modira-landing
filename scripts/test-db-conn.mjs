import postgres from 'postgres';

(async () => {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error(JSON.stringify({ error: 'DATABASE_URL not set in environment' }));
      process.exit(2);
    }

    let host = null;
    let database = null;
    try {
      const parsed = new URL(url);
      host = parsed.hostname;
      database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : null;
    } catch (e) {
      // ignore parse errors
    }

    const sql = postgres(url, { max: 1 });

    // read-only queries only
    const result = await sql`select current_database() as db, current_schema() as schema, version() as version limit 1`;

    const row = result[0] || {};

    console.log(JSON.stringify({
      ok: true,
      connected_database: row.db || database || null,
      host: host || null,
      server_version: row.version || null
    }));

    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({ error: err && err.message ? err.message : String(err) }));
    process.exit(3);
  }
})();
