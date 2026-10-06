import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54329/uap';
const reset = process.argv.includes('--reset');
const isProduction = process.env.NODE_ENV === 'production';

if (reset && isProduction) {
  console.error('Refusing to reset a production database.');
  process.exit(1);
}

const target = new URL(url);
const dbName = target.pathname.slice(1);

async function ensureDatabase() {
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    if (reset) {
      await client.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`, [dbName]);
      await client.query(`drop database if exists "${dbName}"`);
    }
    const found = await client.query('select 1 from pg_database where datname = $1', [dbName]);
    if (found.rowCount === 0) await client.query(`create database "${dbName}"`);
  } finally {
    await client.end();
  }
}

async function run() {
  if (!isProduction) await ensureDatabase();
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    if (!isProduction) {
      const stub = await readFile(join(root, 'dev', '000_supabase_stub.sql'), 'utf8');
      await client.query(stub);
    }
    await client.query(`create table if not exists public.schema_migrations (
      name text primary key, checksum text not null, applied_at timestamptz not null default now())`);
    const files = (await readdir(join(root, 'migrations'))).filter((f) => f.endsWith('.sql')).sort();
    for (const name of files) {
      const sql = await readFile(join(root, 'migrations', name), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const done = await client.query('select checksum from public.schema_migrations where name = $1', [name]);
      if (done.rowCount) {
        if (done.rows[0].checksum !== checksum) throw new Error(`Migration ${name} was modified after it was applied.`);
        continue;
      }
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into public.schema_migrations(name, checksum) values ($1, $2)', [name, checksum]);
        await client.query('commit');
        console.log(`applied ${name}`);
      } catch (error) {
        await client.query('rollback');
        throw new Error(`${name}: ${error.message}`);
      }
    }
    console.log('database up to date');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
