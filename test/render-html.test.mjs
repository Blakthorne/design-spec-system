// test/render-html.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderStyleguide } from '../skill/templates/lib/render-html.mjs';

const input = {
  cssRoot: '  --color-action-primary: #e5484d;',
  cssDark: '  --color-action-primary: #ff6369;',
  tokens: [
    { cssVar: '--color-action-primary', value: '#e5484d', tier: 'semantic', type: 'color' },
    { cssVar: '--color-red-6', value: '#e5484d', tier: 'primitive', type: 'color' },
  ],
  principles: '<h1>Principles</h1>',
  foundations: [{ name: 'color', html: '<h2>Color</h2>' }],
  components: [
    { name: 'Button', data: { variants: ['primary'], states: ['default'] },
      prose: '<h2>Button</h2>', examples: ['<button class="btn btn-primary">Save</button>'] },
  ],
  patterns: [{ name: 'layout', html: '<h2>Layout</h2>' }],
  governance: '<h2>Governance</h2>',
  sourceHash: 'abc123def456',
};

test('emits a full HTML document with generated banner and hash', () => {
  const html = renderStyleguide(input);
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /GENERATED/);
  assert.match(html, /abc123def456/);
});

test('injects :root and dark theme CSS variables', () => {
  const html = renderStyleguide(input);
  assert.match(html, /:root\s*\{[^}]*--color-action-primary: #e5484d;/);
  assert.match(html, /\[data-theme="dark"\]\s*\{[^}]*--color-action-primary: #ff6369;/);
});

test('renders live component examples verbatim', () => {
  const html = renderStyleguide(input);
  assert.match(html, /<button class="btn btn-primary">Save<\/button>/);
});

test('shows a swatch for each token and marks primitives', () => {
  const html = renderStyleguide(input);
  assert.match(html, /--color-action-primary/);
  assert.match(html, /--color-red-6/);
  assert.match(html, /not for direct use/i); // primitive marking
});

test('escapes HTML in token values and frontmatter fields (no injection)', () => {
  const evil = {
    ...input,
    tokens: [{ cssVar: '--x', value: 'red"><script>alert(1)</script>', tier: 'semantic', type: 'color' }],
    components: [
      { name: 'Evil', data: { variants: ['<img src=x onerror=alert(1)>'], states: [] },
        prose: '', examples: [] },
    ],
  };
  const html = renderStyleguide(evil);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img src=x onerror/);
});

test('still emits live html render examples verbatim (not escaped)', () => {
  const html = renderStyleguide(input);
  assert.match(html, /<button class="btn btn-primary">Save<\/button>/);
});

test('component sections carry a title header from frontmatter name', () => {
  const html = renderStyleguide(input);
  assert.match(html, /<h3>Button<\/h3>/);
});

test('inlines the interactive runtime when provided', () => {
  const html = renderStyleguide({ ...input, componentCss: '.kx-btn{color:red}', componentJs: 'console.log(1)' });
  assert.match(html, /\.kx-btn\{color:red\}/);
  assert.match(html, /console\.log\(1\)/);
});

test('guide.json identity flows into header and title', () => {
  const html = renderStyleguide({ ...input, guide: { title: 'Acme', subtitle: 'Spec' } });
  assert.match(html, /<title>Acme — Design Spec<\/title>/);
  assert.match(html, /<b>Acme<\/b><small>Spec<\/small>/);
});

test('tokens outside known groups render escaped under Other tokens', () => {
  const html = renderStyleguide({ ...input,
    tokens: [{ cssVar: '--weird-thing', value: '<b>v</b>', tier: 'semantic', type: 'color' }] });
  assert.match(html, /Other tokens/);
  assert.match(html, /&lt;b&gt;v&lt;\/b&gt;/);
});

test('single-doc sections get h2-derived nav sub-links with matching ids', () => {
  const html = renderStyleguide({ ...input, governance: '<h2>Versioning</h2><p>x</p>' });
  assert.match(html, /<a class="sub" href="#gov-versioning">Versioning<\/a>/);
  assert.match(html, /<h2 id="gov-versioning">Versioning<\/h2>/);
});

test('dark tokens apply via system preference AND explicit data-theme', () => {
  const html = renderStyleguide(input);
  assert.match(html, /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\)/);
  assert.match(html, /\[data-theme="dark"\] \{/);
});
