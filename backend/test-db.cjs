const { Client } = require('C:/Users/SUDHIR~1/AppData/Local/Temp/opencode/pgtest/node_modules/pg');

async function test(url, label) {
  const c = new Client({ connectionString: url, connectionTimeoutMillis: 15000, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    const r = await c.query('SELECT current_database() db, current_user usr, version() v');
    console.log(`OK [${label}]: db=${r.rows[0].db} user=${r.rows[0].usr}`);
    const tbls = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    console.log(`  tables: ${tbls.rows.map(x => x.tablename).join(', ') || '(none)'}`);
    await c.end();
    return true;
  } catch (e) {
    console.log(`FAIL [${label}]:`, e.message.split('\n')[0]);
    await c.end().catch(() => {});
    return false;
  }
}

(async () => {
  const candidates = [
    ['us-east-1', 'postgresql://digiwise:Ben10new@digiwise-digiwisesoftech-zkadty.us-east-1.aws.neon.tech:5432/digiwise-softech'],
    ['pooler.us-east-1', 'postgresql://digiwise:Ben10new@digiwise-digiwisesoftech-zkadty-pooler.us-east-1.aws.neon.tech:5432/digiwise-softech'],
  ];
  let ok = false;
  for (const [label, url] of candidates) {
    if (await test(url, label)) { ok = true; break; }
  }
  process.exit(ok ? 0 : 1);
})();
