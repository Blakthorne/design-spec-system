// test/tokens.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  cssVarName, lookupToken, resolveValue, tokenList, toCssVars, stringifyValue,
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

test('circular alias throws instead of blowing the stack', () => {
  const cyc = {
    color: { $type: 'color', a: { $value: '{color.b}' }, b: { $value: '{color.a}' } },
  };
  assert.throws(() => resolveValue(cyc, '{color.a}'), /Circular alias/);
});

test('self-referential alias throws', () => {
  const self = { color: { $type: 'color', a: { $value: '{color.a}' } } };
  assert.throws(() => resolveValue(self, '{color.a}'), /Circular alias/);
});

test('alias to a group (non-leaf) throws unresolved', () => {
  assert.throws(() => resolveValue(root, '{color.action}'), /Unresolved alias/);
});

test('resolveValue resolves aliases nested in composite object values', () => {
  const withShadow = {
    color: { $type: 'color', ink: { $value: '#000000' } },
    shadow: {
      $type: 'shadow',
      card: { $value: { offsetX: '0px', offsetY: '2px', blur: '4px', color: '{color.ink}' } },
    },
  };
  const resolved = resolveValue(withShadow, { offsetX: '0px', offsetY: '2px', blur: '4px', color: '{color.ink}' });
  assert.equal(resolved.color, '#000000');
});

test('stringifyValue composes a shadow object into CSS, never [object Object]', () => {
  const s = stringifyValue({ offsetX: '0px', offsetY: '2px', blur: '4px', spread: '0px', color: '#000000' });
  assert.equal(s, '0px 2px 4px 0px #000000');
  assert.doesNotMatch(s, /\[object Object\]/);
});

test('stringifyValue falls back to readable form for other composites', () => {
  const s = stringifyValue({ fontFamily: 'system-ui', fontSize: '16px' });
  assert.match(s, /fontFamily: system-ui/);
  assert.doesNotMatch(s, /\[object Object\]/);
});

test('composite tokens flow through toCssVars without [object Object]', () => {
  const withShadow = {
    color: { $type: 'color', ink: { $value: '#000000' } },
    shadow: {
      $type: 'shadow',
      $extensions: { 'design-spec': { tier: 'semantic' } },
      card: { $value: { offsetX: '0px', offsetY: '2px', blur: '4px', color: '{color.ink}' } },
    },
  };
  const { root: r } = toCssVars(withShadow);
  assert.match(r, /--shadow-card: 0px 2px 4px #000000;/);
  assert.doesNotMatch(r, /\[object Object\]/);
});
