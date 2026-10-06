import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
config({ path: new URL('../.env', import.meta.url), override: true, quiet: true });
const require = createRequire(import.meta.url);
const prismaConfig = fileURLToPath(new URL('../../../prisma.config.ts', import.meta.url));
const result = spawnSync(
  process.execPath,
  [require.resolve('prisma/build/index.js'), ...process.argv.slice(2), '--config', prismaConfig],
  { stdio: 'inherit', env: process.env },
);
process.exit(result.status ?? 1);
