// test/hash.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSources } from '../skill/templates/lib/hash.mjs';

test('hashSources is deterministic for same input', () => {
  assert.equal(hashSources(['a', 'b']), hashSources(['a', 'b']));
});

test('hashSources changes when any part changes', () => {
  assert.notEqual(hashSources(['a', 'b']), hashSources(['a', 'c']));
});

test('hashSources is order-sensitive', () => {
  assert.notEqual(hashSources(['a', 'b']), hashSources(['b', 'a']));
});

test('hashSources returns a 12-char hex string', () => {
  assert.match(hashSources(['x']), /^[0-9a-f]{12}$/);
});
