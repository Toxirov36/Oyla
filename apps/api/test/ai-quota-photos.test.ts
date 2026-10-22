import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AiQuotaService } from '../src/common/ai-quota.service';
import { PhotosService } from '../src/profile/photos';
import type { ObjectStorageService } from '../src/common/object-storage.service';
import type { PrismaService } from '../src/common/prisma.service';
import type { ProfileService } from '../src/profile/profile.service';
import type { Actor } from '../src/common/security';

const DAY = 24 * 60 * 60 * 1000;

function quota() {
  const rows: { scope: string; createdAt: Date }[] = [];
  const tx = {
    $executeRaw: async () => 1,
    aiUsage: {
      count: async ({ where }: { where: { scope: string; createdAt: { gt: Date } } }) =>
        rows.filter((r) => r.scope === where.scope && r.createdAt > where.createdAt.gt).length,
      create: async ({ data }: { data: { scope: string; createdAt: Date } }) => rows.push(data),
      deleteMany: async ({ where }: { where: { scope: string; createdAt: { lt: Date } } }) => {
        for (let i = rows.length - 1; i >= 0; i--)
          if (rows[i]!.scope === where.scope && rows[i]!.createdAt < where.createdAt.lt)
            rows.splice(i, 1);
      },
    },
  };
  const db = { $transaction: async (work: (t: typeof tx) => unknown) => work(tx) };
  return { service: new AiQuotaService(db as unknown as PrismaService), rows };
}

test('the AI quota is a sliding 24 hour window that survives a cache flush', async () => {
  const { service, rows } = quota();
  const start = new Date('2026-10-22T08:00:00Z');
  assert.equal(await service.reserve('memory', 2, start), true);
  assert.equal(await service.reserve('memory', 2, new Date(start.getTime() + 3600_000)), true);
  assert.equal(await service.reserve('memory', 2, new Date(start.getTime() + 7200_000)), false);
  // The first request leaves the window after 24h, freeing exactly one slot.
  const later = new Date(start.getTime() + DAY + 60_000);
  assert.equal(await service.reserve('memory', 2, later), true);
  assert.equal(await service.reserve('memory', 2, new Date(later.getTime() + 1000)), false);
  assert.equal(rows.length, 3);
});

test('AI quotas are per scope and a zero limit disables the feature', async () => {
  const { service } = quota();
  assert.equal(await service.reserve('questions:a', 1), true);
  assert.equal(await service.reserve('questions:a', 1), false);
  assert.equal(await service.reserve('questions:b', 1), true);
  assert.equal(await service.reserve('memory', 0), false);
});

test('rows older than the retention period are pruned on the next reservation', async () => {
  const { service, rows } = quota();
  const old = new Date('2026-10-01T00:00:00Z');
  await service.reserve('memory', 5, old);
  await service.reserve('memory', 5, new Date(old.getTime() + 8 * DAY));
  assert.equal(rows.length, 1);
});

const actor = { id: 'user-1' } as Actor;
const png = async () => {
  const sharp = (await import('sharp')).default;
  return sharp({ create: { width: 8, height: 8, channels: 3, background: '#336699' } })
    .png()
    .toBuffer();
};

function photos(
  enabled: boolean,
  existing: Record<string, unknown> | null = null,
  failPut = false,
) {
  const stored: Record<string, unknown>[] = existing ? [existing] : [];
  const objects = new Map<string, Buffer>();
  const removed: string[] = [];
  const tx = {
    profilePhoto: {
      findUnique: async () => stored[0] ?? null,
      upsert: async ({
        create,
        update,
      }: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        stored[0] = stored[0] ? { ...stored[0], ...update } : create;
      },
      deleteMany: async () => stored.splice(0),
    },
  };
  const db = {
    withUserLock: async (_id: string, work: (t: typeof tx) => unknown) => work(tx),
    profilePhoto: { findFirst: async () => stored[0] ?? null },
  };
  const storage = {
    enabled,
    put: async (key: string, body: Buffer) => {
      if (failPut) throw new Error('R2 unreachable');
      objects.set(key, body);
    },
    get: async (key: string) => objects.get(key)!,
    remove: async (key: string) => void (objects.delete(key), removed.push(key)),
  };
  const service = new PhotosService(
    db as unknown as PrismaService,
    { get: async () => ({}) } as unknown as ProfileService,
    storage as unknown as ObjectStorageService,
  );
  return { service, stored, objects, removed };
}

test('with object storage configured a new photo is stored as an object, not inline bytes', async () => {
  const { service, stored, objects } = photos(true);
  await service.save(actor, await png());
  assert.equal(stored.length, 1);
  assert.equal(stored[0]!.data, null);
  const key = stored[0]!.storageKey as string;
  assert.match(key, /^profile-photos\//);
  assert.ok(objects.get(key)!.length > 0);
  assert.deepEqual(await service.get('any'), objects.get(key));
});

test('without object storage the photo stays inline and is served from the database', async () => {
  const { service, stored } = photos(false);
  await service.save(actor, await png());
  assert.equal(stored[0]!.storageKey, null);
  assert.ok((stored[0]!.data as Uint8Array).length > 0);
  assert.ok((await service.get('any')).length > 0);
});

test('replacing or removing a photo deletes the previous stored object', async () => {
  const { service, removed, objects } = photos(true, {
    id: 'old',
    storageKey: 'profile-photos/old',
    data: null,
  });
  objects.set('profile-photos/old', Buffer.from('x'));
  await service.save(actor, await png());
  assert.deepEqual(removed, ['profile-photos/old']);
  await service.remove(actor);
  assert.equal(removed.length, 2);
  assert.equal(objects.size, 0);
});

test('legacy inline photos are still served after object storage is enabled', async () => {
  const { service } = photos(true, {
    id: 'old',
    storageKey: null,
    data: new Uint8Array([1, 2, 3]),
  });
  assert.deepEqual([...(await service.get('old'))], [1, 2, 3]);
});

test('an unreachable object store falls back to inline storage instead of failing the upload', async () => {
  const { service, stored, objects } = photos(true, null, true);
  await service.save(actor, await png());
  assert.equal(stored[0]!.storageKey, null);
  assert.ok((stored[0]!.data as Uint8Array).length > 0);
  assert.equal(objects.size, 0);
});
