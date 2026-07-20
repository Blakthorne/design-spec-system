// test/markdown.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../skill/templates/lib/markdown.mjs';

test('renders headings h1-h3', () => {
  const html = renderMarkdown('# A\n## B\n### C');
  assert.match(html, /<h1>A<\/h1>/);
  assert.match(html, /<h2>B<\/h2>/);
  assert.match(html, /<h3>C<\/h3>/);
});

test('renders paragraphs', () => {
  assert.match(renderMarkdown('hello world'), /<p>hello world<\/p>/);
});

test('renders unordered lists', () => {
  const html = renderMarkdown('- one\n- two');
  assert.match(html, /<ul>\s*<li>one<\/li>\s*<li>two<\/li>\s*<\/ul>/);
});

test('renders inline code', () => {
  assert.match(renderMarkdown('use `foo` here'), /use <code>foo<\/code> here/);
});

test('escapes HTML in text', () => {
  assert.match(renderMarkdown('a < b & c'), /a &lt; b &amp; c/);
});

test('renders fenced code blocks as pre', () => {
  const html = renderMarkdown('```\nline1\nline2\n```');
  assert.match(html, /<pre><code>line1\nline2\n<\/code><\/pre>/);
});
