import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { TokenService } from '../src/common/token.service';
const tokens = new TokenService();
const secret = 'unit-test-only-secret-with-at-least-32-characters';
test('JWT verifies issuer, audience and signature', async () => {
  const payload = { sub: randomUUID(), sid: randomUUID() };
  const token = await tokens.signAsync(payload, {
    secret,
    issuer: 'oyla',
    audience: 'oyla-web',
    expiresIn: 60,
  });
  assert.deepEqual(
    await tokens.verifyAsync(token, { secret, issuer: 'oyla', audience: 'oyla-web' }),
    payload,
  );
  await assert.rejects(
    tokens.verifyAsync(token, { secret: 'wrong-secret', issuer: 'oyla', audience: 'oyla-web' }),
  );
  await assert.rejects(
    tokens.verifyAsync(token, { secret, issuer: 'wrong-issuer', audience: 'oyla-web' }),
  );
  await assert.rejects(
    tokens.verifyAsync(token, { secret, issuer: 'oyla', audience: 'wrong-audience' }),
  );
});
test('JWT rejects expired tokens and malformed session claims', async () => {
  const expired = await tokens.signAsync(
    { sub: randomUUID(), sid: randomUUID() },
    { secret, expiresIn: -1 },
  );
  const malformed = await tokens.signAsync(
    { sub: 'not-a-uuid', sid: randomUUID() },
    { secret, expiresIn: 60 },
  );
  await assert.rejects(tokens.verifyAsync(expired, { secret }));
  await assert.rejects(tokens.verifyAsync(malformed, { secret }));
});
