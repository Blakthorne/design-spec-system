// test/parse-spec.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpecFile } from '../skill/templates/lib/parse-spec.mjs';

const sample = [
  '---',
  'name: Button',
  'variants: [primary, secondary]',
  '---',
  '## Use When',
  'Use for a single action.',
  '',
  '```html render',
  '<button class="btn btn-primary">Save</button>',
  '```',
  '',
  'More prose.',
  '```html render',
  '<button class="btn btn-secondary">Cancel</button>',
  '```',
].join('\n');

test('extracts frontmatter data', () => {
  const { data } = parseSpecFile(sample);
  assert.equal(data.name, 'Button');
  assert.deepEqual(data.variants, ['primary', 'secondary']);
});

test('collects all html render examples', () => {
  const { examples } = parseSpecFile(sample);
  assert.equal(examples.length, 2);
  assert.match(examples[0], /btn-primary/);
  assert.match(examples[1], /btn-secondary/);
});

test('prose has render blocks removed but keeps other prose', () => {
  const { prose } = parseSpecFile(sample);
  assert.match(prose, /Use for a single action\./);
  assert.match(prose, /More prose\./);
  assert.doesNotMatch(prose, /btn-primary/);
});
