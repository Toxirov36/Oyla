import { test as base, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import type { Grade } from '../../apps/api/prisma/curriculum/types';
import type { User } from '../../apps/web/src/lib/types';

const require = createRequire(resolve('apps/api/package.json'));
const { PrismaClient } = require('@prisma/client') as typeof import('../../apps/api/prisma/client');
const testEnvironment = parse(readFileSync('.local/browser-api.env'));
export const db = new PrismaClient({ datasourceUrl: testEnvironment.DATABASE_URL });
const local = (() => {
  try {
    return parse(readFileSync('apps/api/.env'));
  } catch {
    return {};
  }
})();
export const demoPassword = process.env.DEMO_PASSWORD || local.DEMO_PASSWORD;
export const origin = 'http://localhost:5180';
interface Learner {
  user: User;
  password: string;
  token: string;
}

export const test = base.extend<{ learner: Learner; learnerGrade: Grade }>({
  learnerGrade: [6, { option: true }],
  learner: async ({ page, learnerGrade }, use) => {
    const password = `Browser${randomBytes(18).toString('hex')}!`;
    const response = await page.request.post('/api/v1/auth/register', {
      headers: { Origin: origin },
      data: {
        name: 'Browser Learner',
        email: `browser-${randomUUID()}@example.uz`,
        password,
        grade: learnerGrade,
      },
    });
    expect(response.status()).toBe(201);
    const session = (await response.json()) as { user: User; accessToken: string };
    try {
      await use({ user: session.user, password, token: session.accessToken });
    } finally {
      await db.user.deleteMany({ where: { id: session.user.id } });
    }
  },
});
test.afterAll(async () => {
  await db.$disconnect();
});
export { expect };
