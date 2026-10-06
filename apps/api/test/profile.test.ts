import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { createValidationPipe } from '../src/common/validation';
import { UpdateProfileDto } from '../src/profile/profile.dto';
const pipe = createValidationPipe();
test('profile name is trimmed and account authority fields cannot be self-edited', async () => {
  const dto = await pipe.transform(
    { name: '  Ali Valiyev  ' },
    { type: 'body', metatype: UpdateProfileDto },
  );
  assert.equal(dto.name, 'Ali Valiyev');
  for (const extra of [
    { role: 'ADMIN' },
    { grade: 7 },
    { email: 'other@example.uz' },
    { id: 'another-user' },
    { xp: 5000 },
  ])
    await assert.rejects(
      pipe.transform({ name: 'Ali', ...extra }, { type: 'body', metatype: UpdateProfileDto }),
      BadRequestException,
    );
});
test('profile rejects empty, non-string, and oversized names', async () => {
  for (const name of ['', ' ', 'A', null, 42, 'A'.repeat(81)])
    await assert.rejects(
      pipe.transform({ name }, { type: 'body', metatype: UpdateProfileDto }),
      BadRequestException,
    );
});
