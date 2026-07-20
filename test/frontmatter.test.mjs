// test/frontmatter.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from '../skill/templates/lib/frontmatter.mjs';

test('parses scalars', () => {
  const { data } = parseFrontmatter('---\nname: Button\npurpose: Do a thing.\n---\nBody');
  assert.equal(data.name, 'Button');
  assert.equal(data.purpose, 'Do a thing.');
});

test('returns body after frontmatter', () => {
  const { body } = parseFrontmatter('---\nname: X\n---\n# Heading\ntext');
  assert.equal(body, '# Heading\ntext');
});

test('parses inline arrays', () => {
  const { data } = parseFrontmatter('---\nvariants: [primary, secondary, ghost]\n---\n');
  assert.deepEqual(data.variants, ['primary', 'secondary', 'ghost']);
});

test('parses nested maps', () => {
  const { data } = parseFrontmatter('---\ntokens:\n  background: color.action.primary\n  radius: radius.control\n---\n');
  assert.deepEqual(data.tokens, { background: 'color.action.primary', radius: 'radius.control' });
});

test('parses list blocks and strips quotes', () => {
  const { data } = parseFrontmatter('---\ndonts:\n  - "Never do X."\n  - Never do Y.\n---\n');
  assert.deepEqual(data.donts, ['Never do X.', 'Never do Y.']);
});

test('no frontmatter returns empty data and full body', () => {
  const { data, body } = parseFrontmatter('# Just markdown');
  assert.deepEqual(data, {});
  assert.equal(body, '# Just markdown');
});
