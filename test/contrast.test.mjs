// test/contrast.test.mjs — the state-layer guard.
//
// The bug this locks down: a hover/pressed wash given an OPAQUE value is invisible on
// whichever surface shares that value. This template shipped with
// `hover-wash === surface.subtle` and `pressed-wash === surface.sunken`, both exact, so
// hover inside any grouped body did nothing in light mode. Contrast PAIRS never caught
// it — they measure text legibility, not whether a state differs from no state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const script = fileURLToPath(new URL('../skill/templates/contrast.mjs', import.meta.url));
const tokensPath = fileURLToPath(new URL('../skill/templates/tokens.json', import.meta.url));
const shipped = () => JSON.parse(readFileSync(tokensPath, 'utf8'));

/** Run contrast.mjs over `tokens`, from a dir named `design` so it resolves there. */
function run(tokens, args = []) {
  const dir = mkdtempSync(join(tmpdir(), 'dss-contrast-'));
  const designDir = join(dir, 'design');
  mkdirSync(designDir);
  writeFileSync(join(designDir, 'tokens.json'), JSON.stringify(tokens));
  try {
    const out = execFileSync(process.execPath, [script, ...args], {
      cwd: designDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the shipped tokens pass every state-layer check, both themes', () => {
  for (const args of [[], ['--dark']]) {
    const { code, out } = run(shipped(), args);
    assert.equal(code, 0, `contrast.mjs failed for ${args.join(' ') || 'light'}:\n${out}`);
    assert.match(out, /state-layer checks pass/);
    assert.doesNotMatch(out, /✗/);
  }
});

test('an opaque hover wash equal to a surface FAILS', () => {
  const t = shipped();
  // exactly how this template used to ship
  t.color.action['hover-wash'].$value = '{color.primitive.stone.2}';
  const { code, out } = run(t);
  assert.equal(code, 1);
  assert.match(out, /✗ Hover wash on subtle/);
  assert.match(out, /1\.000:1/);
});

test('an opaque pressed wash equal to a surface FAILS', () => {
  const t = shipped();
  t.color.action['pressed-wash'].$value = '{color.primitive.stone.3}';
  const { code, out } = run(t);
  assert.equal(code, 1);
  assert.match(out, /✗ Pressed wash on sunken/);
});

test('a wash too faint to see FAILS even when it collides with nothing', () => {
  const t = shipped();
  t.color.action['hover-wash'].$value = 'rgba(120,114,95,.01)';
  const { code, out } = run(t);
  assert.equal(code, 1);
  assert.match(out, /✗ Hover wash on/);
});

test('a press no stronger than its hover FAILS', () => {
  const t = shipped();
  t.color.action['pressed-wash'].$value = t.color.action['hover-wash'].$value;
  const { code, out } = run(t);
  assert.equal(code, 1);
  assert.match(out, /✗ Pressed reads stronger than hover/);
});

test('a project that defines no pressed wash is not punished for it', () => {
  const t = shipped();
  delete t.color.action['pressed-wash'];
  const { code, out } = run(t);
  assert.equal(code, 0, out);
  assert.doesNotMatch(out, /Pressed wash/);
});
