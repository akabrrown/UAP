import fs from 'fs';
import path from 'path';

const runId = 'run-2026-11-03-01';
const baseDir = path.join('c:/Users/Dell/Desktop/PROjects/UAP/uat-pack/runs', runId);

const dirs = [
  'inbox',
  'outbox',
  'board',
  'evidence',
  'findings',
  'report'
];

for (const d of dirs) {
  const p = path.join(baseDir, d);
  fs.mkdirSync(p, { recursive: true });
}

// Initialize board/handoff.jsonl if not exists
const handoffPath = path.join(baseDir, 'board/handoff.jsonl');
if (!fs.existsSync(handoffPath)) {
  fs.writeFileSync(handoffPath, '');
}

console.log('Initialized run directory at:', baseDir);

