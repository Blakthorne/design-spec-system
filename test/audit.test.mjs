// test/audit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { auditCode } from '../skill/templates/audit.mjs';

const tokensRoot = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/tokens.json', import.meta.url)), 'utf8'),
);

test('flags a raw hex color', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: '.x { color: #ff0000; }' }] });
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'untokenized-color');
  assert.equal(v[0].line, 1);
});

test('flags direct use of a primitive token', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: '.x { color: var(--color-red-6); }' }] });
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'primitive-token-direct-use');
});

test('does not flag a semantic token', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: '.x { color: var(--color-action-primary); }' }] });
  assert.deepEqual(v, []);
});

test('reports file and line for each violation', () => {
  const content = '.a { color: var(--color-action-primary); }\n.b { color: #123456; }';
  const v = auditCode({ tokensRoot, files: [{ path: 'styles.css', content }] });
  assert.equal(v.length, 1);
  assert.equal(v[0].file, 'styles.css');
  assert.equal(v[0].line, 2);
});
