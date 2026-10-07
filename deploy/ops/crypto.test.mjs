import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { encrypt, decrypt } from './crypto.mjs';
test('encrypted backups round trip and reject tampering or a wrong key', () => {
  const key = randomBytes(32),
    original = Buffer.from('PGDMP: isolated fixture');
  const encrypted = encrypt(original, key);
  assert.deepEqual(decrypt(encrypted, key), original);
  assert.throws(() => decrypt(encrypted, randomBytes(32)));
  const modified = Buffer.from(encrypted);
  modified[modified.length - 1] ^= 1;
  assert.throws(() => decrypt(modified, key));
  assert.throws(() => decrypt(Buffer.from('invalid'), key));
});
