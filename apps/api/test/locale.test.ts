import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { localizedMessage, resolveLocale } from '../src/common/locale';
import { createValidationPipe } from '../src/common/validation';
import { UpdateProfileDto } from '../src/profile/profile.dto';

test('language negotiation supports variants, quality weights and a safe default', () => {
  assert.equal(resolveLocale(), 'uz');
  assert.equal(resolveLocale('fr-FR,ru-RU;q=0.9,en;q=0.7'), 'ru');
  assert.equal(resolveLocale('RU-ru;q=0.2,en-US;q=1'), 'en');
  assert.equal(resolveLocale('ru;q=0,en;q=0'), 'uz');
  assert.equal(resolveLocale('de,ru;q=garbage'), 'uz');
  assert.equal(localizedMessage('AUTH_INVALID_CREDENTIALS', 'ru'), 'Неверный email или пароль.');
  assert.equal(localizedMessage('AUTH_INVALID_CREDENTIALS', 'en'), 'Incorrect email or password.');
});
test('a user can change only a supported interface language through the profile DTO', async () => {
  const pipe = createValidationPipe();
  for (const preferredLocale of ['uz', 'ru', 'en']) {
    const dto = await pipe.transform(
      { preferredLocale },
      { type: 'body', metatype: UpdateProfileDto },
    );
    assert.equal(dto.preferredLocale, preferredLocale);
    assert.equal(dto.name, undefined);
  }
  for (const preferredLocale of ['de', 'ru-RU', '', null, 1])
    await assert.rejects(
      pipe.transform({ preferredLocale }, { type: 'body', metatype: UpdateProfileDto }),
      BadRequestException,
    );
});
