// test/tokens.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  cssVarName, lookupToken, resolveValue, tokenList, toCssVars,
} from '../skill/templates/lib/tokens.mjs';

const root = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/tokens.json', import.meta.url)), 'utf8'),
);

test('cssVarName joins path with dashes', () => {
  assert.equal(cssVarName(['color', 'action', 'primary']), '--color-action-primary');
});

test('lookupToken resolves a dotted ref', () => {
  assert.equal(lookupToken(root, '{color.red.6}').$value, '#e5484d');
});

test('resolveValue follows alias chains', () => {
  assert.equal(resolveValue(root, '{color.action.primary}'), '#e5484d');
});

test('tokenList carries tier inherited from ancestor group', () => {
  const list = tokenList(root);
  const primary = list.find((t) => t.cssVar === '--color-action-primary');
  const red = list.find((t) => t.cssVar === '--color-red-6');
  assert.equal(primary.tier, 'semantic');
  assert.equal(red.tier, 'primitive');
});

test('toCssVars emits root and dark blocks', () => {
  const { root: r, dark } = toCssVars(root);
  assert.match(r, /--color-action-primary: #e5484d;/);
  assert.match(r, /--color-surface-background: #ffffff;/);
  assert.match(dark, /--color-surface-background: #1a1a1a;/);
});

test('unresolved alias throws', () => {
  assert.throws(() => resolveValue(root, '{color.nope.1}'));
});
