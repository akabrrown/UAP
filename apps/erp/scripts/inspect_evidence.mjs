import fs from 'fs';
import path from 'path';
import pg from 'pg';

const baseDir = 'c:/Users/Dell/Desktop/PROjects/UAP/uat-pack/runs/run-2026-11-03-01/evidence';
const steps = fs.readdirSync(baseDir);
const logIssues = [];

for (const step of steps) {
  const p = path.join(baseDir, step);
  if (!fs.statSync(p).isDirectory()) continue;
  
  const failedReqPath = path.join(p, 'failed_requests.log');
  if (fs.existsSync(failedReqPath)) {
    const content = fs.readFileSync(failedReqPath, 'utf8').trim();
    if (content) {
      logIssues.push({ step, type: 'failed_requests', content });
    }
  }

  const consolePath = path.join(p, 'console.log');
  if (fs.existsSync(consolePath)) {
    const c = fs.readFileSync(consolePath, 'utf8');
    const errors = c.split('\n').filter(line => line.includes('[error]') && !line.includes('favicon'));
    if (errors.length > 0) {
      logIssues.push({ step, type: 'console_errors', content: errors.join('\n') });
    }
  }
}

console.log('--- LOG ISSUES IN EVIDENCE ---');
console.log(JSON.stringify(logIssues, null, 2));

// Now inspect the failed assertions
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const assertionsJson = JSON.parse(fs.readFileSync('c:/Users/Dell/Desktop/PROjects/UAP/uat-pack/sql/assertions.json', 'utf8'));
const failedAssertionIds = ['A-24', 'A-06', 'A-18', 'A-03', 'A-10', 'A-05', 'A-07', 'A-20'];

async function inspectAssertions() {
  const client = await pool.connect();
  console.log('\n--- FAILED ASSERTION DETAILS ---');
  for (const id of failedAssertionIds) {
    const a = assertionsJson.find(x => x.id === id);
    if (!a) continue;
    console.log(`\n================== [${id}] ${a.title} ==================`);
    console.log('SQL:', a.sql);
    try {
      const res = await client.query(a.sql);
      console.log(`Returned Rows Count: ${res.rows.length}`);
      if (res.rows.length > 0) {
        console.log('Sample Rows (up to 3):', JSON.stringify(res.rows.slice(0, 3), null, 2));
      }
    } catch (err) {
      console.log('Execution Error:', err.message);
    }
  }
  client.release();
  await pool.end();
}

inspectAssertions().catch(err => {
  console.error('Inspect failed:', err);
  process.exit(1);
});

