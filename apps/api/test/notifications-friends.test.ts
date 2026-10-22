import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FriendsService } from '../src/friends/friends.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import type { Actor } from '../src/common/security';
import type { PrismaService } from '../src/common/prisma.service';
import type { RedisService } from '../src/common/redis.service';

type Args = Record<string, unknown>;
const actor: Actor = {
  id: 'student-1',
  role: 'STUDENT',
  teacherAccess: false,
  name: 'Ali',
  email: 'ali@example.uz',
  grade: 6,
  sessionId: 'session',
};

function notifications(overrides: Record<string, unknown> = {}) {
  const calls: { method: string; args: Args }[] = [];
  const record =
    (method: string, result: unknown) =>
    async (args: Args = {}) => {
      calls.push({ method, args });
      return result;
    };
  const notification = {
    findMany: record('findMany', []),
    count: record('count', 0),
    findFirst: record('findFirst', { id: 'n1' }),
    updateMany: record('updateMany', { count: 1 }),
    deleteMany: record('deleteMany', { count: 1 }),
    ...overrides,
  };
  const db = {
    notification,
    $transaction: async (work: unknown) =>
      typeof work === 'function'
        ? (work as (tx: unknown) => unknown)({ notification })
        : Promise.all(work as Promise<unknown>[]),
  };
  return { service: new NotificationsService(db as unknown as PrismaService), calls };
}

test('notification lists are always scoped to the actor and apply filters and paging', async () => {
  const { service, calls } = notifications();
  const result = await service.list(actor, {
    page: 3,
    limit: 10,
    type: 'BADGE',
    unreadOnly: true,
    search: 'dars',
  } as never);
  const find = calls.find((c) => c.method === 'findMany')!.args;
  assert.equal((find.where as Args).userId, actor.id);
  assert.equal((find.where as Args).type, 'BADGE');
  assert.equal((find.where as Args).readAt, null);
  assert.equal(find.skip, 20);
  assert.equal(find.take, 10);
  assert.equal(result.page, 3);
  const unreadCount = calls.filter((c) => c.method === 'count').at(-1)!.args;
  assert.deepEqual(unreadCount.where, { userId: actor.id, readAt: null });
});

test("another user's notification cannot be read, unread or deleted", async () => {
  const { service } = notifications({
    findFirst: async () => null,
    deleteMany: async () => ({ count: 0 }),
  });
  await assert.rejects(service.read(actor, 'foreign'), NotFoundException);
  await assert.rejects(service.read(actor, 'foreign', false), NotFoundException);
  await assert.rejects(service.remove(actor, 'foreign'), NotFoundException);
});

test('marking read is idempotent and only touches rows in the matching state', async () => {
  const { service, calls } = notifications();
  assert.deepEqual(await service.read(actor, 'n1'), { success: true });
  assert.deepEqual(calls.find((c) => c.method === 'updateMany')!.args.where, {
    id: 'n1',
    userId: actor.id,
    readAt: null,
  });
  await service.read(actor, 'n1', false);
  const unread = calls.filter((c) => c.method === 'updateMany').at(-1)!.args;
  assert.deepEqual(unread.where, { id: 'n1', userId: actor.id, readAt: { not: null } });
  assert.equal((unread.data as Args).readAt, null);
  const all = await service.readAll(actor);
  assert.equal(all.updated, 1);
});

function friends(
  options: { role?: string; active?: boolean; target?: string | null; limit?: number } = {},
) {
  const tx = {
    user: {
      findUniqueOrThrow: async () => ({
        role: options.role ?? 'STUDENT',
        active: options.active ?? true,
      }),
      count: async () => 2,
    },
    friendProfile: {
      upsert: async () => ({ inviteCode: 'code-1' }),
      findFirst: async () => ({ userId: 'other' }),
    },
    $queryRaw: async () => [],
  };
  const db = {
    withUserLock: async (_id: string, work: (t: typeof tx) => unknown) => work(tx),
    $transaction: async (work: (t: typeof tx) => unknown) => work(tx),
    friendProfile: {
      findUnique: async () =>
        options.target === null ? null : { userId: options.target ?? 'other' },
    },
    friendship: { findMany: async () => [] },
  };
  let used = 0;
  const redis = { incrementWindow: async () => ++used + (options.limit ?? 0) };
  return new FriendsService(db as unknown as PrismaService, redis as unknown as RedisService);
}

test('only active students can open the friends section', async () => {
  await assert.rejects(friends({ role: 'TEACHER' }).list(actor), ForbiddenException);
  await assert.rejects(friends({ active: false }).list(actor), ForbiddenException);
  const result = await friends().list(actor);
  assert.deepEqual(result, { inviteCode: 'code-1', friends: [], incoming: [], outgoing: [] });
});

test('friend requests reject unknown codes, self requests and over-limit senders', async () => {
  await assert.rejects(friends({ target: null }).request(actor, 'bad'), NotFoundException);
  await assert.rejects(friends({ target: actor.id }).request(actor, 'mine'), BadRequestException);
  await assert.rejects(
    friends({ limit: 20 }).request(actor, 'code'),
    (error: { getStatus: () => number }) => error.getStatus() === 429,
  );
  await assert.rejects(friends().requestClassmate(actor, 'class', actor.id), BadRequestException);
});
