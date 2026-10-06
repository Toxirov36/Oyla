import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { parse } from 'dotenv';

export function browserEnvironment() {
  const local = existsSync('apps/api/.env') ? parse(readFileSync('apps/api/.env')) : {};
  const databaseUrl =
    process.env.BROWSER_DATABASE_URL || local.DATABASE_URL || process.env.DATABASE_URL;
  const redisUrl = process.env.BROWSER_REDIS_URL || local.REDIS_URL || process.env.REDIS_URL;
  if (!databaseUrl || !redisUrl)
    throw new Error('Browser tests require configured local PostgreSQL and Redis.');
  for (const value of [databaseUrl, redisUrl])
    if (!['localhost', '127.0.0.1', '::1'].includes(new URL(value).hostname))
      throw new Error('Browser tests require local infrastructure.');
  if (
    process.env.NODE_ENV === 'production' ||
    (local.NODE_ENV === 'production' && !process.env.BROWSER_DATABASE_URL)
  )
    throw new Error('Browser tests cannot target production.');
  const redis = new URL(redisUrl);
  redis.pathname = '/1';
  mkdirSync('.local', { recursive: true });
  const envPath = resolve('.local/browser-api.env');
  const values = {
    DATABASE_URL: databaseUrl,
    REDIS_URL: redis.href,
    JWT_SECRET: randomBytes(48).toString('hex'),
    PORT: '3101',
    WEB_ORIGIN: 'http://localhost:5180',
    NODE_ENV: 'test',
    TRUST_PROXY: '0',
    AUTH_RATE_LIMIT: '1000',
    API_RATE_LIMIT: '3000',
  };
  writeFileSync(
    envPath,
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n',
  );
  return { envPath, databaseUrl };
}
