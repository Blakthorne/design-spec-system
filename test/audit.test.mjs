// test/audit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { auditCode, auditCursors } from '../skill/templates/audit.mjs';

const tokensRoot = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/tokens.json', import.meta.url)), 'utf8'),
);

test('flags a raw hex color', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: '.x { color: #ff0000; }' }] });
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'untokenized-color');
  assert.equal(v[0].line, 1);
});

test('flags direct use of a primitive token', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: '.x { color: var(--color-red-6); }' }] });
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'primitive-token-direct-use');
});

test('does not flag a semantic token', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: '.x { color: var(--color-action-primary); }' }] });
  assert.deepEqual(v, []);
});

test('reports file and line for each violation', () => {
  const content = '.a { color: var(--color-action-primary); }\n.b { color: #123456; }';
  const v = auditCode({ tokensRoot, files: [{ path: 'styles.css', content }] });
  assert.equal(v.length, 1);
  assert.equal(v[0].file, 'styles.css');
  assert.equal(v[0].line, 2);
});

test('does not flag id selectors, anchor hrefs, DOM queries, or hex in comments', () => {
  const content = [
    '#abc { color: black; }',
    '<a href="#fab">Fabric</a>',
    '.x { margin: 0; /* brand was #fff historically */ }',
    'document.querySelector("#face");',
    '// old value: #deadbe',
  ].join('\n');
  const v = auditCode({ tokensRoot, files: [{ path: 'app.tsx', content }] });
  assert.deepEqual(v, []);
});

test('still flags real hex colors in value position', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: '.x { color: #ff0000; background: #abc; }' }] });
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'untokenized-color');
});

test('flags modern color functions and uppercase RGB (false-negative fixes)', () => {
  const cases = [
    'color: RGB(1,2,3);',
    'background: oklch(0.7 0.1 200);',
    'color: color-mix(in srgb, red, blue);',
  ];
  for (const c of cases) {
    const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: c }] });
    assert.equal(v.length, 1, `expected a violation for: ${c}`);
    assert.equal(v[0].kind, 'untokenized-color');
  }
});

test('flags primitive var() even with internal whitespace', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: '.x { color: var(  --color-red-6  ); }' }] });
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'primitive-token-direct-use');
});

test('an include entry may name a single FILE, not just a directory', async () => {
  // export.html joining the audit is the canonical case: the config lists one file
  // beside the component directory, and the audit must not readdir() it.
  const { mkdtempSync, writeFileSync: wf, rmSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { main } = await import('../skill/templates/audit.mjs');
  const tmp = mkdtempSync(join(tmpdir(), 'dss-audit-file-'));
  const origCwd = process.cwd();
  process.chdir(tmp);
  try {
    wf(join(tmp, 'tokens.json'), JSON.stringify(tokensRoot));
    wf(join(tmp, 'app.html'), '<style>.x{color:var(--color-action-primary)}</style>');
    wf(join(tmp, 'audit.json'), JSON.stringify({
      tokens: 'tokens.json', include: ['app.html'], extensions: ['.html'],
    }));
    assert.equal(await main(['audit.json']), 0);
    wf(join(tmp, 'app.html'), '<style>.x{color:#ff0000}</style>');
    assert.equal(await main(['audit.json']), 1);
    // a file whose extension is not audited contributes nothing (and never crashes)
    wf(join(tmp, 'audit2.json'), JSON.stringify({
      tokens: 'tokens.json', include: ['app.html'], extensions: ['.css'],
    }));
    assert.equal(await main(['audit2.json']), 0);
  } finally {
    process.chdir(origCwd);
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('british-spelling flagged when spelling: american', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: '/* the colour of the grey centre */' }], spelling: 'american' });
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'british-spelling');
});

test('british-spelling ignored without the config flag', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: '/* the colour */' }] });
  assert.equal(v.length, 0);
});

test('aria-labelledby is exempt from the spelling check', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.html', content: '<div aria-labelledby="t"></div>' }], spelling: 'american' });
  assert.equal(v.length, 0);
});

test('-is- verb families are in the British list', () => {
  const v = auditCode({
    tokensRoot,
    files: [{ path: 'a.md', content: 'utilisation is high\nauthorised lines only\napologise never\nrecognised at once' }],
    spelling: 'american',
  });
  assert.equal(v.length, 4);
  assert.ok(v.every((x) => x.kind === 'british-spelling'));
});

// ---- markdown scoping + em-dash-in-interface-copy -------------------------------
// In a spec .md file only the ```html render blocks are code AND interface copy;
// prose may discuss hex ramps and use em dashes freely.
const md = (body) => [{ path: 'spec.md', content: body }];

test('em dash inside a render block is flagged as interface copy', () => {
  const v = auditCode({ tokensRoot, files: md('prose\n```html render\n<span>Approve — now</span>\n```\n') });
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'em-dash-in-interface-copy');
  assert.equal(v[0].line, 3);
});

test('em dash in markdown prose is not flagged', () => {
  const v = auditCode({ tokensRoot, files: md('This rule — hard-won — stays.\n') });
  assert.equal(v.length, 0);
});

test('em dash in a stylesheet comment is not flagged', () => {
  const v = auditCode({ tokensRoot, files: [{ path: 'a.css', content: '/* reserved — no reflow */\n.x { color: var(--color-action-primary); }' }] });
  assert.equal(v.length, 0);
});

test('raw hex in markdown prose is not flagged; in a render block it is', () => {
  const prose = auditCode({ tokensRoot, files: md('The ramp peaks at #FF0000 in prose.\n') });
  assert.equal(prose.length, 0);
  const example = auditCode({ tokensRoot, files: md('```html render\n<div style="color:#FF0000">x</div>\n```\n') });
  assert.equal(example.length, 1);
  assert.equal(example[0].kind, 'untokenized-color');
});

test('primitive token use inside a render block is still flagged', () => {
  const v = auditCode({ tokensRoot, files: md('```html render\n<div style="color:var(--color-red-6)">x</div>\n```\n') });
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'primitive-token-direct-use');
});

// ---- control-cursor-undeclared -------------------------------------------------
// The lapse this catches: a styled control that never says it is clickable. Invisible
// in review (nothing is missing, the pointer just never changes), so it needs a lint.
const cur = (content, path = 'c.css') => auditCursors([{ path, content }]);

test('flags a control family that never declares a cursor', () => {
  const v = cur('.kx-select { height: 40px; }\n.kx-select:hover { border-color: red; }');
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'control-cursor-undeclared');
  assert.match(v[0].snippet, /"select"/);
});

test('one cursor declaration anywhere in the family satisfies it', () => {
  // a control is spread over base + variant + state rules; only one must decide
  assert.deepEqual(cur('.kx-select { cursor: pointer; }\n.kx-select:hover { border-color: red; }'), []);
  assert.deepEqual(cur('.kx-btn { height: 40px; }\n.kx-btn--ghost { cursor: pointer; }'), []);
});

test('requires a DECISION, not the pointer value', () => {
  assert.deepEqual(cur('.kx-slider-thumb { cursor: grab; }'), []);
  assert.deepEqual(cur('.kx-tile { cursor: default; }'), []);
});

test('matches by identifier segment, so .kx-table is not the tab family', () => {
  assert.deepEqual(cur('.kx-table { border: 0; }'), []);
  assert.deepEqual(cur('.kx-tablist { border: 0; }'), []);   // list container, not a tab
  assert.equal(cur('.kx-tab { border: 0; }').length, 1);
});

test('a 5+ character family also matches a segment it prefixes by 2+', () => {
  assert.equal(cur('.kx-switchrow input { opacity: 0; }').length, 1);   // switch
  assert.deepEqual(cur('.kx-options { display: flex; }'), []);          // plural container
  assert.equal(cur('.kx-optionrow { display: flex; }').length, 1);      // an option
});

test('ignores UA shadow parts — a spin button is not a Button', () => {
  assert.deepEqual(cur('input.kx-well::-webkit-inner-spin-button { margin: 0; }'), []);
  assert.deepEqual(cur('input[type="range"]::-moz-range-thumb { border: 0; }\n'
    + 'input[type="range"] { cursor: pointer; }'), []);
});

test('text-entry families are never asked for a cursor', () => {
  assert.deepEqual(cur('.kx-well { height: 40px; }\n.kx-field { display: flex; }'), []);
});

test('finds rules nested in an at-rule', () => {
  assert.deepEqual(cur('@supports (color: red) { .kx-chip { cursor: pointer; } }'), []);
  assert.equal(cur('@media (min-width: 40em) { .kx-chip { padding: 0; } }').length, 1);
});

test('only stylesheets are scanned', () => {
  assert.deepEqual(cur('const s = { button: 1 };', 'app.tsx'), []);
});

test('reports one violation per family, not per rule', () => {
  const v = cur('.kx-chip { a: 1; }\n.kx-chip span { b: 2; }\n.kx-chip input { c: 3; }');
  assert.equal(v.length, 1);
});

test('the reported line survives comments earlier in the file', () => {
  const content = '/* a\n   multi-line\n   comment */\n.kx-chip { padding: 0; }';
  const v = cur(content);
  assert.equal(v.length, 1);
  assert.equal(v[0].line, 4);
});

test('the shipped reference stylesheet declares a cursor for every control it styles', () => {
  const css = readFileSync(
    fileURLToPath(new URL('../skill/templates/interactive/components.css', import.meta.url)), 'utf8',
  );
  assert.deepEqual(cur(css, 'components.css'), []);
});
