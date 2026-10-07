import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { parse } from 'dotenv';
import { Client } from 'pg';
const root = resolve('.local');
mkdirSync(root, { recursive: true });
const bin = process.env.PG_BIN || 'C:/Program Files/PostgreSQL/18/bin';
const data = join(root, 'postgres');
const envPath = resolve('apps/api/.env');
let password;
if (existsSync(envPath)) {
  const url = parse(readFileSync(envPath)).DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const connection = new URL(url);
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(connection.hostname) ||
    Number(connection.port || 5432) !== 55432
  ) {
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      await client.query('SELECT 1');
      console.log(
        `Configured PostgreSQL is ready on ${connection.hostname}:${connection.port || 5432}.`,
      );
    } finally {
      await client.end();
    }
    process.exit(0);
  }
  password = decodeURIComponent(connection.password);
} else {
  password = randomBytes(20).toString('hex');
  writeFileSync(
    envPath,
    `DATABASE_URL=postgresql://oyla:${password}@127.0.0.1:55432/oyla?schema=public\nREDIS_URL=redis://127.0.0.1:56379\nJWT_SECRET=${randomBytes(48).toString('hex')}\nPORT=3001\nWEB_ORIGIN=http://localhost:5173\nNODE_ENV=development\nDEMO_PASSWORD=OylaDemo2026!\n`,
  );
}
const passwordFile = join(root, 'pg-password');
if (!existsSync(join(data, 'PG_VERSION'))) {
  writeFileSync(passwordFile, password);
  try {
    execFileSync(
      join(bin, 'initdb.exe'),
      [
        '-D',
        data,
        '-U',
        'oyla',
        '--pwfile',
        passwordFile,
        '--auth-host=scram-sha-256',
        '--auth-local=scram-sha-256',
        '--encoding=UTF8',
        '--locale=C',
      ],
      { stdio: 'pipe' },
    );
  } finally {
    unlinkSync(passwordFile);
  }
}
try {
  execFileSync(join(bin, 'pg_ctl.exe'), ['status', '-D', data], {
    stdio: 'ignore',
    timeout: 10000,
  });
} catch {
  execFileSync(
    join(bin, 'pg_ctl.exe'),
    ['start', '-D', data, '-l', join(root, 'postgres.log'), '-o', '-p 55432 -h 127.0.0.1', '-w'],
    { stdio: 'ignore', timeout: 60000 },
  );
}
const pgEnv = { ...process.env, PGPASSWORD: password };
const result = execFileSync(
  join(bin, 'psql.exe'),
  [
    '-h',
    '127.0.0.1',
    '-p',
    '55432',
    '-U',
    'oyla',
    '-d',
    'postgres',
    '-tAc',
    "SELECT 1 FROM pg_database WHERE datname='oyla'",
  ],
  { env: pgEnv },
)
  .toString()
  .trim();
if (!result)
  execFileSync(
    join(bin, 'createdb.exe'),
    ['-h', '127.0.0.1', '-p', '55432', '-U', 'oyla', 'oyla'],
    { env: pgEnv, stdio: 'pipe' },
  );
console.log(
  'Isolated OYLA PostgreSQL is ready on 127.0.0.1:55432. Existing databases are untouched.',
);
