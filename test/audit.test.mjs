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

test('does not flag id selectors, anchor hrefs, DOM queries, or hex in comments', () => {
  const content = [
    '#abc { color: black; }',
    '<a href="#fab">Fabric</a>',
    '.x { margin: 0; /* brand was #fff historically */ }',
    'document.querySelector("#face");',
    '// old value: #deadbe',
  ].join('\n');
  const v = auditCode({ tokensRoot, files: [{ path: 'app.tsx', content }] });
  assert.deepEqual(v, []);
});

test('still flags real hex colors in value position', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: '.x { color: #ff0000; background: #abc; }' }] });
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'untokenized-color');
});

test('flags modern color functions and uppercase RGB (false-negative fixes)', () => {
  const cases = [
    'color: RGB(1,2,3);',
    'background: oklch(0.7 0.1 200);',
    'color: color-mix(in srgb, red, blue);',
  ];
  for (const c of cases) {
    const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: c }] });
    assert.equal(v.length, 1, `expected a violation for: ${c}`);
    assert.equal(v[0].kind, 'untokenized-color');
  }
});

test('flags primitive var() even with internal whitespace', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: '.x { color: var(  --color-red-6  ); }' }] });
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'primitive-token-direct-use');
});
