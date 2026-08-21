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

if (failed) {
  console.error(`\n  ${failed} pair(s) below the required ratio.\n`);
  exit(1);
}
console.log(`\n  All ${rows.filter((x) => x.kind !== 'exempt').length} enforced pairs pass.\n`);
