// design/contrast.mjs — asserts the WCAG 2.2 AA ratios the spec claims.
//
// Reads tokens.json directly, so a palette edit that breaks a documented ratio
// fails here instead of shipping. Run it alongside render.mjs; wire it into CI
// next to `node design/render.mjs --check`.
//
//   node design/contrast.mjs          light theme (canonical)
//   node design/contrast.mjs --dark   the dark overrides
//
// Pairs are declared, not discovered: each one names a real place two tokens
// meet in the product. Adding a component means adding its pairs here.
//
// STATE LAYERS are the one thing checked by DISCOVERY instead (see the block after
// PAIRS): every wash is measured against every surface it can cover, because the
// failure this catches is precisely a pairing nobody thought to declare.

import { readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cwd, argv, exit } from 'node:process';
import { walkTokens, resolveValue, cssVarName } from './lib/tokens.mjs';

const DARK = argv.includes('--dark');
const here = dirname(fileURLToPath(import.meta.url));
const designDir = basename(cwd()) === 'design' ? cwd() : here;
const root = JSON.parse(readFileSync(join(designDir, 'tokens.json'), 'utf8'));

// ---- colour maths (WCAG 2.x relative luminance) ----------------------------
const srgb = (h) => {
  const s = h.replace('#', '').trim();
  const full = s.length === 3 ? [...s].map((c) => c + c).join('') : s;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
};
const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex) => {
  const [r, g, b] = srgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

// Flattens rgba(r,g,b,a) over an opaque backdrop so translucent tokens are
// measured as they actually appear rather than skipped.
const RGBA = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i;
const hx = (n) => Math.round(n).toString(16).padStart(2, '0');
function flatten(value, backdrop) {
  const m = RGBA.exec(value);
  if (!m) return value;
  const [r, g, b] = [+m[1], +m[2], +m[3]];
  const a = m[4] === undefined ? 1 : +m[4];
  const bg = srgb(backdrop).map((c) => c * 255);
  return '#' + [r, g, b].map((c, i) => hx(c * a + bg[i] * (1 - a))).join('');
}

// ---- resolve every semantic token for the active theme ---------------------
const tok = {};
walkTokens(root, (t) => {
  const key = t.path.join('.');
  const raw = DARK && t.dark !== undefined ? t.dark : t.token.$value;
  const val = resolveValue(root, raw);
  if (typeof val === 'string' && (val.startsWith('#') || RGBA.test(val))) {
    tok[key] = { value: val, cssVar: cssVarName(t.path) };
  }
});

const get = (path) => {
  const t = tok[path];
  if (!t) throw new Error(`No colour token at "${path}" (theme: ${DARK ? 'dark' : 'light'})`);
  return t.value;
};

// A translucent SURFACE (the dark theme states several as rgba over the page) must be
// flattened over the ground it actually sits on, not over an assumed white. Getting this
// wrong reports a dark theme's washes as near-1:1 and hides the failures that are real.
const GROUND = () => {
  const page = get('color.surface.page');
  if (RGBA.test(page)) throw new Error('color.surface.page must be opaque — it is the ground everything else flattens onto.');
  return page;
};
const opaque = (path) => flatten(get(path), GROUND());

// ---- the declared pairs ----------------------------------------------------
// kind: 'text' >= 4.5 | 'large' >= 3 (>=18.66px bold / 24px) | 'nontext' >= 3
// | 'exempt' reported only. `on` is the backdrop, also used to flatten alpha.
const PAIRS = [
  ['Row value (Principle 2)',      'color.text.primary',    'color.surface.page',  'text'],
  ['Row value on card',            'color.text.primary',    'color.surface.card',  'text'],
  ['Row label',                    'color.text.secondary',  'color.surface.page',  'text'],
  ['Row label on card',            'color.text.secondary',  'color.surface.card',  'text'],
  ['Hint / caption',               'color.text.subtle',     'color.surface.page',  'text'],
  ['Hint on card',                 'color.text.subtle',     'color.surface.card',  'text'],
  ['Body on subtle fill',          'color.text.primary',    'color.surface.subtle','text'],
  ['Body on sunken well',          'color.text.primary',    'color.surface.sunken','text'],
  ['Chrome text on stage',         'color.text.primary',    'color.surface.stage', 'text'],
  ['Wordmark',                     'color.text.brand',      'color.surface.page',  'text'],
  ['Inline link',                  'color.text.action',     'color.surface.card',  'text'],
  ['Primary button label',         'color.action.primary-text', 'color.action.primary', 'text'],
  ['Primary button hover label',   'color.action.primary-text', 'color.action.primary-hover', 'text'],
  ['Selected tile label',          'color.state.selected-text', 'color.state.selected-bg', 'text'],
  ['Modified chip text',           'color.state.modified-text', 'color.state.modified-bg', 'text'],
  ['Error text',                   'color.feedback.error',  'color.surface.card',  'text'],
  ['Error text on its wash',       'color.feedback.error',  'color.feedback.error-bg', 'text'],
  ['Warning text on its wash',     'color.feedback.warning','color.feedback.warning-bg', 'text'],
  ['Success text on its wash',     'color.feedback.success','color.feedback.success-bg', 'text'],

  ['Ghost button label',           'color.text.action',     'color.surface.page',  'text'],
  ['Destructive button label',     'color.action.destructive-text', 'color.action.destructive', 'text'],
  ['Secondary button label',       'color.action.secondary-text', 'color.action.secondary', 'text'],

  ['Control border (SC 1.4.11)',   'color.border.control',  'color.surface.page',  'nontext'],
  ['Control border on card',       'color.border.control',  'color.surface.card',  'nontext'],
  ['Focus ring',                   'color.border.focus',    'color.surface.page',  'nontext'],
  ['Focus ring on card',           'color.border.focus',    'color.surface.card',  'nontext'],
  ['Focus ring on stage',          'color.border.focus',    'color.surface.stage', 'nontext'],
  ['Selection ring',               'color.state.selected-border', 'color.surface.card', 'nontext'],
  ['Modified bar',                 'color.state.modified',  'color.surface.page',  'nontext'],
  ['Modified bar on card',         'color.state.modified',  'color.surface.card',  'nontext'],
  ['Rail edge',                    'color.border.strong',   'color.surface.page',  'nontext'],
  ['Secondary hover border',       'color.action.secondary-hover', 'color.action.secondary', 'nontext'],
  ['Destructive border',           'color.action.destructive-text', 'color.action.destructive', 'nontext'],


  // Reported, not enforced. Dividers carry no information (SC 1.4.11 applies to
  // components you must perceive to operate), and WCAG exempts inactive controls.
  ['Divider (decorative)',         'color.border.subtle',   'color.surface.page',  'exempt'],
  // The sheet's edge belongs to the ARTIFACT, not to a control you must perceive to
  // operate, so SC 1.4.11 does not reach it. Shadow + mat step do the real work; the
  // hairline only guards the case where a white-edged sheet meets a pale mat.
  ['Paper hairline (artifact)',    'color.border.paper',    'color.surface.paper', 'exempt'],
  ['Disabled text (exempt)',       'color.text.disabled',   'color.surface.page',  'exempt'],
  // Principle 4's ground rule: the sheet must read as an object on the mat.
  ['Sheet vs stage (Principle 4)', 'color.surface.paper',   'color.surface.stage', 'exempt'],
];

// ---- state layers must be VISIBLE on every surface they can cover ----------
// A wash IS the whole signal for hover and press — no border moves, no label changes —
// so it has to differ from its backdrop everywhere it can land. An OPAQUE wash cannot:
// it is invisible on whichever surface happens to share its value. That is not a
// hypothetical. This template shipped `hover-wash` as stone.2, which is exactly
// `surface.subtle`, and `pressed-wash` as stone.3, which is exactly `surface.sunken`,
// so in light mode hovering anything inside a grouped/inset body did NOTHING, and a
// press on a sunken track did nothing either. Contrast pairs never caught it: they ask
// "is the text legible", not "is this state distinguishable from no state".
//
// Cross product, not a hand-listed pair set — the whole failure was a combination
// nobody thought to list. A surface a project does not define is skipped.
const WASHES = [
  ['Hover wash', 'color.action.hover-wash'],
  ['Pressed wash', 'color.action.pressed-wash'],
];
const WASH_OVER = [
  'color.surface.page',
  'color.surface.card',
  'color.surface.subtle',
  'color.surface.sunken',
];
// 1.00 is the bug (identical). 1.03 is about the faintest step that still reads as a
// deliberate state on a large fill; anything under it is a wash nobody can see.
const WASH_MIN = 1.03;

const MIN = { text: 4.5, large: 3, nontext: 3, exempt: 0 };

let failed = 0;
const rows = PAIRS.map(([label, fg, bg, kind]) => {
  const back = opaque(bg);
  const front = flatten(get(fg), back);
  const r = ratio(front, back);
  const need = MIN[kind];
  const ok = r + 1e-9 >= need;
  if (!ok && kind !== 'exempt') failed += 1;
  return { label, front, back, r, kind, ok };
});

const w = Math.max(...rows.map((x) => x.label.length));
console.log(`\n  Contrast — ${DARK ? 'DARK (overrides)' : 'LIGHT (canonical)'}\n`);
for (const x of rows) {
  const mark = x.kind === 'exempt' ? '·' : x.ok ? '✓' : '✗';
  const need = x.kind === 'exempt' ? 'reported' : `need ${MIN[x.kind]}`;
  console.log(
    `  ${mark} ${x.label.padEnd(w)}  ${x.front} on ${x.back}  ${x.r.toFixed(2).padStart(6)}:1  (${need})`,
  );
}

// ---- run the state-layer cross product -------------------------------------
const washRows = [];
for (const [label, path] of WASHES) {
  if (!tok[path]) continue;                       // a project need not define both
  for (const surf of WASH_OVER) {
    if (!tok[surf]) continue;
    const back = opaque(surf);
    const front = flatten(get(path), back);
    const r = ratio(front, back);
    const ok = r + 1e-9 >= WASH_MIN;
    if (!ok) failed += 1;
    washRows.push({ label: `${label} on ${surf.split('.').pop()}`, front, back, r, ok });
  }
}
// A press that reads no stronger than a hover is a state the user cannot confirm.
const strongest = (path, surf) => {
  const back = opaque(surf);
  return ratio(flatten(get(path), back), back);
};
const ORDER_ON = tok['color.surface.card'] ? 'color.surface.card' : 'color.surface.page';
if (tok['color.action.hover-wash'] && tok['color.action.pressed-wash'] && tok[ORDER_ON]) {
  const h = strongest('color.action.hover-wash', ORDER_ON);
  const pr = strongest('color.action.pressed-wash', ORDER_ON);
  const ok = pr > h + 1e-9;
  if (!ok) failed += 1;
  washRows.push({
    label: 'Pressed reads stronger than hover',
    front: pr.toFixed(3), back: h.toFixed(3), r: pr, ok, order: true,
  });
}

if (washRows.length) {
  const ww = Math.max(...washRows.map((x) => x.label.length));
  console.log(`  State layers — a wash must be visible on every surface it covers\n`);
  for (const x of washRows) {
    const detail = x.order
      ? `pressed ${x.front} vs hover ${x.back}`.padEnd(34)
      : `${x.front} on ${x.back}`.padEnd(34);
    console.log(
      `  ${x.ok ? '✓' : '✗'} ${x.label.padEnd(ww)}  ${detail}  ${x.order ? '' : x.r.toFixed(3).padStart(6) + ':1  '}(${x.order ? 'stronger' : `need ${WASH_MIN}`})`,
    );
  }
  console.log('');
}

if (failed) {
  console.error(`\n  ${failed} check(s) failed.\n`);
  exit(1);
}
console.log(
  `  All ${rows.filter((x) => x.kind !== 'exempt').length} enforced pairs and ` +
    `${washRows.length} state-layer checks pass.\n`,
);
