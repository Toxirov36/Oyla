import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiExceptionFilter } from '../src/common/exception.filter';
import { localizedText } from '../src/common/locale';
import texts from '../src/common/locale-text.json';

const sourceMessages = () => {
  const found = new Set<string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith('.ts'))
        for (const m of readFileSync(path, 'utf8').matchAll(
          /(?:Exception|HttpException)\(\s*'([^']*)'|message: '([^']*)'/g,
        ))
          found.add(m[1] ?? m[2]);
    }
  };
  walk(join(__dirname, '../src'));
  return [...found];
};

test('every hard-coded exception message has Russian and English translations', () => {
  const dictionary = texts as Record<string, { ru: string; en: string }>;
  const missing = sourceMessages().filter((text) => !dictionary[text]?.ru || !dictionary[text]?.en);
  assert.deepEqual(missing, [], 'Add these messages to src/common/locale-text.json');
  const stale = Object.keys(dictionary).filter((text) => !sourceMessages().includes(text));
  assert.deepEqual(stale, [], 'Remove unused entries from src/common/locale-text.json');
});

test('plain messages stay in Uzbek by default and fall back for unknown text', () => {
  assert.equal(localizedText('Dars topilmadi.', 'uz'), 'Dars topilmadi.');
  assert.equal(localizedText('Dars topilmadi.', 'ru'), 'Урок не найден.');
  assert.equal(localizedText('Dars topilmadi.', 'en'), 'Lesson not found.');
  assert.equal(localizedText('Noma’lum matn', 'en'), 'Noma’lum matn');
});

test('the exception filter localizes uncoded and coded errors from Accept-Language', () => {
  const run = (error: unknown, language?: string) => {
    let payload: Record<string, unknown> = {};
    const response = {
      status: () => ({ json: (body: Record<string, unknown>) => (payload = body) }),
    };
    const request = { headers: { 'accept-language': language }, method: 'GET', path: '/x' };
    new ApiExceptionFilter().catch(error, {
      switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
    } as never);
    return payload;
  };
  assert.equal(run(new NotFoundException('Dars topilmadi.'), 'en').message, 'Lesson not found.');
  assert.equal(run(new NotFoundException('Dars topilmadi.'), 'ru-RU').message, 'Урок не найден.');
  assert.equal(run(new NotFoundException('Dars topilmadi.')).message, 'Dars topilmadi.');
  assert.equal(
    run(new BadRequestException({ code: 'AUTH_INVALID_CREDENTIALS', message: 'x' }), 'en').message,
    'Incorrect email or password.',
  );
});
