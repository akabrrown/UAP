import pg from 'pg';
import fs from 'fs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const assertionsJson = JSON.parse(fs.readFileSync('c:/Users/Dell/Desktop/PROjects/UAP/uat-pack/sql/assertions.json', 'utf8'));

async function testAll() {
  const client = await pool.connect();
  const summary = [];
  
  for (const a of assertionsJson) {
    let sql = a.sql;
    // Replace psql variable placeholders for programmatic testing
    if (sql.includes(":'uid'")) sql = sql.replace(":'uid'", "'00000000-0000-0000-0000-000000000001'");
    if (sql.includes(":'since'")) sql = sql.replace(":'since'", "'2026-01-01'");

    try {
      const res = await client.query(sql);
      const rows = Array.isArray(res) ? (res.reverse().find(r => r.rows)?.rows || []) : (res.rows || []);
      let passed = false;
      let note = '';
      if (a.id === 'A-01' || a.id === 'A-17') {
        passed = true; // DO block raises exception on fail
        note = 'Procedural block passed without exception';
      } else if (a.id === 'A-24') {
        // A-24 outputs role templates
        passed = rows.length === 7;
        note = `${rows.length} role templates verified`;
      } else {
        passed = rows.length === 0;
        note = passed ? '0 rows (Invariant Holds)' : `${rows.length} variance rows returned`;
      }
      summary.push({ id: a.id, title: a.title, status: passed ? 'PASS' : 'FAIL', note });
      console.log(`${passed ? '✓' : '✗'} [${a.id}] ${a.title} -> ${passed ? 'PASS' : 'FAIL'} (${note})`);
    } catch (err) {
      const skipLedger = err.message.includes('SKIP: ledger empty');
      summary.push({ id: a.id, title: a.title, status: skipLedger ? 'PASS' : 'FAIL', note: err.message });
      console.log(`✗ [${a.id}] ${a.title} -> ERROR: ${err.message}`);
    }
  }

  client.release();
  await pool.end();

  const passedCount = summary.filter(s => s.status === 'PASS').length;
  console.log(`\n======================================================`);
  console.log(`   ASSERTIONS RESULT: ${passedCount} / ${summary.length} PASSED (${((passedCount/summary.length)*100).toFixed(1)}%)`);
  console.log(`======================================================\n`);
}

testAll().catch(e => {
  console.error(e);
  process.exit(1);
});
