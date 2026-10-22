import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../src/auth/auth.service';
import { RateGuard, SecurityGuard } from '../src/common/security';
import { TokenService } from '../src/common/token.service';
import { config } from '../src/common/config';
import { Prisma } from '../generated/prisma/client';
import type { PrismaService } from '../src/common/prisma.service';
import type { RedisService } from '../src/common/redis.service';

const ID = '11111111-1111-4111-8111-111111111111';
const SID = '22222222-2222-4222-8222-222222222222';
const digest = (token: string) => createHash('sha256').update(token).digest('hex');

type Row = Record<string, unknown>;
async function build(user: Row | null, sessions: Row[] = []) {
  const created: Row[] = [];
  const tx = {
    user: { findUniqueOrThrow: async () => user },
    session: {
      create: async ({ data }: { data: Row }) => {
        created.push(data);
        return { id: SID, ...data };
      },
      findUnique: async ({ where }: { where: { tokenHash: string } }) =>
        sessions.find((s) => s.tokenHash === where.tokenHash) ?? null,
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const row = sessions.find((s) => s.id === where.id && s.tokenHash === where.tokenHash);
        if (!row || row.revokedAt) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
  };
  const db = {
    user: {
      findUnique: async () => user,
      create: async () => {
        throw new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        });
      },
      findUniqueOrThrow: async () => ({ id: ID, name: 'Ali', email: 'a@b.uz', role: 'STUDENT' }),
    },
    session: tx.session,
    withUserLock: async (_id: string, work: (t: typeof tx) => Promise<unknown>) => work(tx),
    $transaction: async (work: (t: typeof tx) => Promise<unknown>) => work(tx),
  };
  const service = new AuthService(db as unknown as PrismaService, new TokenService());
  await service.onModuleInit();
  return { service, created };
}
const student = async (overrides: Row = {}) => ({
  id: ID,
  email: 'a@b.uz',
  active: true,
  passwordHash: await argon2.hash('Correct-Password-1', { type: argon2.argon2id }),
  ...overrides,
});

test('login rejects unknown email, wrong password and inactive accounts with one generic error', async () => {
  for (const user of [null, await student(), await student({ active: false })]) {
    const { service } = await build(user);
    await assert.rejects(
      service.login({ email: 'a@b.uz', password: user?.active ? 'wrong' : 'Correct-Password-1' }),
      (error: UnauthorizedException) =>
        error instanceof UnauthorizedException &&
        (error.getResponse() as { code: string }).code === 'AUTH_INVALID_CREDENTIALS',
    );
  }
});

test('successful login stores only a hash of the refresh token and issues a verifiable access token', async () => {
  const { service, created } = await build(await student());
  const result = await service.login({ email: 'a@b.uz', password: 'Correct-Password-1' });
  assert.equal(created.length, 1);
  assert.equal(created[0].tokenHash, digest(result.refreshToken));
  assert.notEqual(created[0].tokenHash, result.refreshToken);
  const claims = await new TokenService().verifyAsync(result.accessToken, {
    secret: config.JWT_SECRET,
    issuer: 'oyla',
    audience: 'oyla-web',
  });
  assert.deepEqual(claims, { sub: ID, sid: SID });
});

test('registering an existing email maps the unique violation to a conflict', async () => {
  const { service } = await build(await student());
  await assert.rejects(
    service.register({ email: 'a@b.uz', name: 'Ali', password: 'Correct-Password-1', grade: 6 }),
    ConflictException,
  );
});

test('refresh rotates the token, and replaying the old token fails', async () => {
  const old = 'old-refresh-token';
  const session = {
    id: SID,
    userId: ID,
    tokenHash: digest(old),
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60000),
    user: { active: true },
  };
  const { service } = await build(await student(), [session]);
  const next = await service.refresh(old);
  assert.equal(session.tokenHash, digest(next.refreshToken));
  await assert.rejects(service.refresh(old), UnauthorizedException);
});

test('refresh rejects missing, oversized, expired, revoked and deactivated sessions', async () => {
  const base = {
    id: SID,
    userId: ID,
    tokenHash: digest('t'),
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60000),
    user: { active: true },
  };
  const { service: empty } = await build(await student());
  await assert.rejects(empty.refresh(undefined), UnauthorizedException);
  await assert.rejects(empty.refresh('x'.repeat(201)), UnauthorizedException);
  for (const patch of [
    { expiresAt: new Date(Date.now() - 1) },
    { revokedAt: new Date() },
    { user: { active: false } },
  ]) {
    const { service } = await build(await student(), [{ ...base, ...patch }]);
    await assert.rejects(service.refresh('t'), UnauthorizedException);
  }
});

test('logout revokes only the given active session', async () => {
  const session = { id: SID, tokenHash: 'h', revokedAt: null as Date | null };
  const { service } = await build(await student(), [session]);
  const calls: Row[] = [];
  const original = (service as unknown as { db: PrismaService }).db;
  (original.session as unknown as { updateMany: (a: Row) => Promise<unknown> }).updateMany = async (
    args: Row,
  ) => {
    calls.push(args);
    return { count: 1 };
  };
  assert.deepEqual(await service.logout(SID), { success: true });
  assert.deepEqual(calls[0].where, { id: SID, revokedAt: null });
});

function context(request: Row, handlerMeta: Record<string, unknown> = {}) {
  return {
    getHandler: () => handlerMeta,
    getClass: () => handlerMeta,
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}
function guard(meta: Record<string, unknown>, session: Row | null) {
  const reflector = {
    getAllAndOverride: (key: string) => meta[key],
  } as unknown as Reflector;
  const db = { session: { findFirst: async () => session } } as unknown as PrismaService;
  return new SecurityGuard(reflector, new TokenService(), db);
}

test('cross-site state-changing requests are rejected before authentication', async () => {
  const g = guard({ public: true }, null);
  await assert.rejects(
    g.canActivate(context({ method: 'POST', headers: { origin: 'https://evil.example' } })),
    ForbiddenException,
  );
  await assert.rejects(
    g.canActivate(context({ method: 'DELETE', headers: { 'sec-fetch-site': 'cross-site' } })),
    ForbiddenException,
  );
  assert.equal(
    await g.canActivate(context({ method: 'GET', headers: { origin: 'https://evil.example' } })),
    true,
  );
});

test('protected routes require a valid bearer token, a live session and the right role', async () => {
  const token = await new TokenService().signAsync(
    { sub: ID, sid: SID },
    { secret: config.JWT_SECRET, issuer: 'oyla', audience: 'oyla-web', expiresIn: '5m' },
  );
  const live = {
    id: SID,
    user: {
      id: ID,
      name: 'A',
      email: 'a@b.uz',
      role: 'STUDENT',
      teacherAccess: false,
      student: { grade: 6 },
    },
  };
  const request = (extra: Row = {}) => ({
    method: 'GET',
    headers: { authorization: `Bearer ${token}`, ...extra },
  });
  await assert.rejects(
    guard({}, live).canActivate(context({ method: 'GET', headers: {} })),
    UnauthorizedException,
  );
  await assert.rejects(
    guard({}, live).canActivate(
      context({ method: 'GET', headers: { authorization: 'Bearer garbage' } }),
    ),
    UnauthorizedException,
  );
  await assert.rejects(guard({}, null).canActivate(context(request())), UnauthorizedException);
  await assert.rejects(
    guard({ roles: ['ADMIN'] }, live).canActivate(context(request())),
    ForbiddenException,
  );
  const req = request() as Row;
  assert.equal(await guard({ roles: ['STUDENT'] }, live).canActivate(context(req)), true);
  assert.equal((req.user as { grade: number }).grade, 6);
});

test('an administrator with teacher access may use teacher routes, one without may not', async () => {
  const token = await new TokenService().signAsync(
    { sub: ID, sid: SID },
    { secret: config.JWT_SECRET, issuer: 'oyla', audience: 'oyla-web', expiresIn: '5m' },
  );
  const session = (teacherAccess: boolean) => ({
    id: SID,
    user: { id: ID, name: 'A', email: 'a@b.uz', role: 'ADMIN', teacherAccess, student: null },
  });
  const req = () => ({ method: 'GET', headers: { authorization: `Bearer ${token}` } });
  assert.equal(
    await guard({ roles: ['TEACHER'] }, session(true)).canActivate(context(req())),
    true,
  );
  await assert.rejects(
    guard({ roles: ['TEACHER'] }, session(false)).canActivate(context(req())),
    ForbiddenException,
  );
});

test('the rate guard blocks sensitive routes at the auth limit and counts per client address', async () => {
  const keys: string[] = [];
  let count = 0;
  const redis = {
    incrementWindow: async (key: string) => {
      keys.push(key);
      return ++count;
    },
  } as unknown as RedisService;
  const rate = new RateGuard(redis);
  const login = context({ path: '/api/v1/auth/login', method: 'POST', ip: '10.0.0.1' });
  count = config.AUTH_RATE_LIMIT - 1;
  assert.equal(await rate.canActivate(login), true);
  await assert.rejects(
    rate.canActivate(login),
    (e: { getStatus: () => number }) => e.getStatus() === 429,
  );
  assert.equal(keys[0], 'rate:auth:10.0.0.1');
  count = 0;
  await rate.canActivate(context({ path: '/api/v1/classes', method: 'GET', ip: '10.0.0.2' }));
  assert.equal(keys.at(-1), 'rate:api:10.0.0.2');
});
