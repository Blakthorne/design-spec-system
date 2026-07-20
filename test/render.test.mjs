// test/render.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildStyleguide, main } from '../skill/templates/render.mjs';

const designDir = fileURLToPath(new URL('./fixtures/design', import.meta.url));

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
  }
});
