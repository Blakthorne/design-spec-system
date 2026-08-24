// test/render.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { writeFileSync, rmSync, readFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildStyleguide, buildTokensCss, main, resolveDesignDir } from '../skill/templates/render.mjs';

const designDir = fileURLToPath(new URL('./fixtures/design', import.meta.url));

test('resolveDesignDir returns cwd when it is the design dir', () => {
  assert.equal(resolveDesignDir('/proj/design'), '/proj/design');
});

test('resolveDesignDir appends design/ otherwise, not misfiring on webdesign', () => {
  assert.equal(resolveDesignDir('/proj/webdesign'), '/proj/webdesign/design');
  assert.equal(resolveDesignDir('/proj'), '/proj/design');
});

test('main returns 1 with a friendly message when tokens are missing', async () => {
  const origCwd = process.cwd();
  const empty = mkdtempSync(join(tmpdir(), 'dss-empty-'));
  process.chdir(empty);
  try {
    const code = await main([]);
    assert.equal(code, 1);
  } finally {
    process.chdir(origCwd);
    rmSync(empty, { recursive: true, force: true });
  }
});

test('buildStyleguide produces HTML containing the component example', async () => {
  const { html } = await buildStyleguide(designDir);
  assert.match(html, /<button class="btn">Save<\/button>/);
});

test('buildStyleguide includes resolved token CSS', async () => {
  const { html } = await buildStyleguide(designDir);
  assert.match(html, /--color-action-primary: #e5484d;/);
});

test('buildStyleguide returns a stable hash for unchanged sources', async () => {
  const a = (await buildStyleguide(designDir)).hash;
  const b = (await buildStyleguide(designDir)).hash;
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{12}$/);
});

test('the returned hash is embedded in the HTML', async () => {
  const { html, hash } = await buildStyleguide(designDir);
  assert.ok(html.includes(hash));
});

test('main --check passes after a fresh write, fails after source drift', async () => {
  const dir = designDir;
  const out = join(dir, 'styleguide.html');
  const tokensOut = join(dir, 'tokens.css');
  const origCwd = process.cwd();
  process.chdir(dir);
  try {
    // fresh write
    const writeCode = await main([]);
    assert.equal(writeCode, 0);
    // check passes
    const okCode = await main(['--check']);
    assert.equal(okCode, 0);
    // simulate drift: overwrite the embedded hash
    const html = readFileSync(out, 'utf8')
      .replace(/Source hash: <code>[0-9a-f]{12}<\/code>/, 'Source hash: <code>000000000000</code>');
    writeFileSync(out, html);
    const staleCode = await main(['--check']);
    assert.equal(staleCode, 1);
  } finally {
    process.chdir(origCwd);
    rmSync(out, { force: true });
    rmSync(tokensOut, { force: true });
  }
});

test('main writes tokens.css; --check fails when it drifts', async () => {
  const dir = designDir;
  const out = join(dir, 'styleguide.html');
  const tokensOut = join(dir, 'tokens.css');
  const origCwd = process.cwd();
  process.chdir(dir);
  try {
    await main([]);
    const css = readFileSync(tokensOut, 'utf8');
    assert.match(css, /^\/\* GENERATED/);
    assert.match(css, /--color-action-primary: #e5484d;/);
    writeFileSync(tokensOut, css + '\n/* drift */\n');
    assert.equal(await main(['--check']), 1);
    await main([]);                       // regenerate
    assert.equal(await main(['--check']), 0);
  } finally {
    process.chdir(origCwd);
    rmSync(out, { force: true });
    rmSync(tokensOut, { force: true });
  }
});

test('buildTokensCss emits the three-state theme blocks', () => {
  const css = buildTokensCss(designDir);
  assert.match(css, /:root \{/);
  assert.match(css, /@media \(prefers-color-scheme: dark\) \{\n  :root:not\(\[data-theme="light"\]\) \{/);
  assert.match(css, /\[data-theme="dark"\] \{/);
});

test('inlined fonts.css urls are rewritten relative to the styleguide', async () => {
  // fonts.css keeps file-relative urls so app pages can link it directly; the
  // styleguide lives one level up, so inlining must prefix fonts/.
  const { mkdtempSync, cpSync, mkdirSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const tmp = mkdtempSync(join(tmpdir(), 'dss-fonts-'));
  const dir = join(tmp, 'design');
  cpSync(designDir, dir, { recursive: true });
  mkdirSync(join(dir, 'fonts'), { recursive: true });
  writeFileSync(join(dir, 'fonts', 'fonts.css'),
    '@font-face{font-family:X;src:url(x-var.woff2) format("woff2")}\n'
    + '@font-face{font-family:Y;src:url("/abs.woff2")}\n'
    + '@font-face{font-family:Z;src:url(data:font/woff2;base64,AA==)}\n');
  try {
    const { html } = await buildStyleguide(dir);
    assert.match(html, /url\(fonts\/x-var\.woff2\)/);
    assert.match(html, /url\("\/abs\.woff2"\)/);          // absolute: untouched
    assert.match(html, /url\(data:font\/woff2;base64,AA==\)/); // data:: untouched
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
