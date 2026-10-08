import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createValidationPipe } from '../src/common/validation';
import { UpdateProfileDto } from '../src/profile/profile.dto';
import { AvatarDto, UpdateAvatarDto } from '../src/profile/avatars';
import catalog from '../src/profile/avatar-catalog.json';

test('avatar-only profile edits accept a catalog ID and reject authority and arbitrary images', async () => {
  const pipe = createValidationPipe();
  const dto = await pipe.transform(
    { avatarId: catalog[0]!.id },
    { type: 'body', metatype: UpdateProfileDto },
  );
  assert.equal(dto.avatarId, catalog[0]!.id);
  assert.equal(dto.name, undefined);
  for (const body of [
    { avatarId: 'fox' },
    { avatarId: null },
    { avatarId: catalog[0]!.id, userId: 'other' },
    { avatarUrl: '/avatars/fox.svg' },
    { avatarId: catalog[0]!.id, xp: 20 },
  ])
    await assert.rejects(pipe.transform(body, { type: 'body', metatype: UpdateProfileDto }));
});

test('admin avatar DTO permits only reviewed assets and validated catalog metadata', async () => {
  const pipe = createValidationPipe();
  await pipe.transform(
    { name: 'Tulki', imageUrl: catalog[0]!.imageUrl },
    { type: 'body', metatype: AvatarDto },
  );
  for (const extra of [
    { imageUrl: 'https://example.com/unreviewed.svg' },
    { imageUrl: '/avatars/../secret.svg' },
    { active: 'true' },
    { position: -1 },
    { xp: 100 },
  ])
    await assert.rejects(
      pipe.transform(
        { name: 'Tulki', imageUrl: catalog[0]!.imageUrl, ...extra },
        { type: 'body', metatype: AvatarDto },
      ),
    );
  const patch = await pipe.transform(
    { active: false },
    { type: 'body', metatype: UpdateAvatarDto },
  );
  assert.equal(patch.active, false);
  assert.equal(patch.name, undefined);
  assert.equal(catalog.length, 12);
  assert.equal(new Set(catalog.map((avatar) => avatar.id)).size, 12);
});
