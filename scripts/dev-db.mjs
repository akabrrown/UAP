import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bin = process.env.PG_BIN ?? 'C:\\Program Files\\PostgreSQL\\18\\bin';
const data = join(root, '.local', 'pgdata');
const log = join(root, '.local', 'pg.log');
const exe = (name) => join(bin, process.platform === 'win32' ? `${name}.exe` : name);
const run = (name, args) => spawnSync(exe(name), args, { stdio: 'inherit' });

const action = process.argv[2];
if (action === 'start') {
  mkdirSync(join(root, '.local'), { recursive: true });
  if (!existsSync(join(data, 'PG_VERSION'))) run('initdb', ['-D', data, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--locale=C']);
  run('pg_ctl', ['-D', data, '-o', '-p 54329 -c listen_addresses=127.0.0.1', '-l', log, '-w', 'start']);
} else if (action === 'stop') {
  run('pg_ctl', ['-D', data, '-m', 'fast', 'stop']);
} else {
  console.error('usage: dev-db.mjs start|stop');
  process.exit(1);
}
