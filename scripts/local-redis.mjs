/**
 * Starts an isolated local Redis instance on port 56379 for development.
 * Uses the bundled Redis Windows binary from .local/redis/ if it exists.
 * Falls back to checking if an external Redis is already running.
 */
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createConnection } from 'node:net';

const REDIS_PORT = 56379;
const REDIS_HOST = '127.0.0.1';

/** Check if Redis is already accepting connections on the target port */
function isRedisRunning() {
  return new Promise((resolve) => {
    const socket = createConnection({ host: REDIS_HOST, port: REDIS_PORT }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

const alreadyRunning = await isRedisRunning();
if (alreadyRunning) {
  console.log(`Redis is already running on ${REDIS_HOST}:${REDIS_PORT}.`);
  process.exit(0);
}

// Find the bundled Redis binary
const localRedisDir = resolve('.local', 'redis');
const candidates = [
  join(localRedisDir, 'Redis-7.4.7-Windows-x64-cygwin', 'redis-server.exe'),
  join(localRedisDir, 'redis-server.exe'),
];
const redisBin = candidates.find((p) => existsSync(p));

if (!redisBin) {
  console.error(
    `Redis binary not found under .local/redis/. ` +
      `Please start Redis manually on port ${REDIS_PORT} or run: npm run infra`,
  );
  process.exit(1);
}

console.log(`Starting local Redis on ${REDIS_HOST}:${REDIS_PORT}...`);
const child = spawn(
  redisBin,
  ['--port', String(REDIS_PORT), '--bind', REDIS_HOST, '--loglevel', 'notice'],
  {
    cwd: resolve(redisBin, '..'),
    stdio: 'ignore',
    detached: true,
  },
);
child.unref();

// Wait up to 5 seconds for Redis to be ready
for (let i = 0; i < 10; i++) {
  await new Promise((r) => setTimeout(r, 500));
  if (await isRedisRunning()) {
    console.log(`Redis is ready on ${REDIS_HOST}:${REDIS_PORT}.`);
    process.exit(0);
  }
}

console.error('Redis did not start within 5 seconds.');
process.exit(1);
