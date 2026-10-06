import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const path = 'apps/api/prisma/migrations/20261006000000_initial';
if (existsSync(`${path}/migration.sql`))
  throw new Error(
    'Initial migration already exists. Create a new migration for subsequent schema changes.',
  );
mkdirSync(path, { recursive: true });
const sql = execFileSync(
  process.execPath,
  [
    'node_modules/prisma/build/index.js',
    'migrate',
    'diff',
    '--from-empty',
    '--to-schema-datamodel',
    'apps/api/prisma/schema.prisma',
    '--script',
  ],
  { encoding: 'utf8' },
);
writeFileSync(`${path}/migration.sql`, sql);
writeFileSync('apps/api/prisma/migrations/migration_lock.toml', 'provider = "postgresql"\n');
console.log('Created initial migration.');
