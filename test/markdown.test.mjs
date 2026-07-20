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

test('renders headings h4-h6', () => {
  const html = renderMarkdown('#### D\n##### E\n###### F');
  assert.match(html, /<h4>D<\/h4>/);
  assert.match(html, /<h5>E<\/h5>/);
  assert.match(html, /<h6>F<\/h6>/);
});

test('renders bold and italic', () => {
  assert.match(renderMarkdown('this is **bold** text'), /this is <strong>bold<\/strong> text/);
  assert.match(renderMarkdown('this is *italic* text'), /this is <em>italic<\/em> text/);
  assert.match(renderMarkdown('this is _also italic_ text'), /this is <em>also italic<\/em> text/);
});

test('renders safe links and rejects javascript: urls', () => {
  assert.match(renderMarkdown('see [docs](https://example.com/a)'), /<a href="https:\/\/example.com\/a">docs<\/a>/);
  const evil = renderMarkdown('click [here](javascript:alert(1))');
  assert.doesNotMatch(evil, /<a /);
  assert.match(evil, /\[here\]/); // left as literal text
});

test('does not apply emphasis inside inline code', () => {
  assert.match(renderMarkdown('use `a*b*c` literally'), /<code>a\*b\*c<\/code>/);
});
