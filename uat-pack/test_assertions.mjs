import pg from 'pg';
import fs from 'fs';

async function main() {
  const assertions = JSON.parse(fs.readFileSync('c:/Users/Dell/Desktop/PROjects/UAP/uat-pack/sql/assertions.json', 'utf8'));
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  console.log(`Loaded ${assertions.length} assertions.`);
  const client = await pool.connect();
  try {
    for (const a of assertions.slice(0, 5)) {
      try {
        const res = await client.query(a.sql);
        console.log(`Assertion ${a.id} [${a.title}]: PASS (rows: ${res.rows?.length ?? 0})`);
      } catch (err) {
        console.log(`Assertion ${a.id} [${a.title}]: FAIL/ERROR -> ${err.message}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

