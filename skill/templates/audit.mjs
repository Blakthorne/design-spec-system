// skill/templates/audit.mjs
import { readFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenList } from './lib/tokens.mjs';

// Only real hex color lengths (3/4/6/8), matched globally so we can inspect
// each occurrence's context and drop id-selector / anchor / DOM-query noise.
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
// Color functions incl. modern color spaces; case-insensitive.
const FUNC_COLOR = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\s*\(/i;

// Best-effort removal of // line comments and /* ... */ block fragments so a
// hex mentioned in a comment is not flagged as an untokenized color.
function stripComments(line) {
  return line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
}

// A hex run that is actually a CSS id selector, an href/URL anchor, or a DOM
// query argument — not a color. Kept conservative to avoid masking real colors.
function isSelectorOrAnchor(line, index, hex) {
  const before = line[index - 1] || '';
  const after = line.slice(index + hex.length);
  if (before === '#') return true;               // e.g. ## or escaped
  if (/^\s*[{,]/.test(after)) return true;        // id selector: `#abc {` / `#abc,`
  if ((before === '"' || before === "'")
    && /(href|to|src|action|querySelector|getElementById|closest|matches|anchor|url)\s*[=:(]/i.test(line)) {
    return true;                                   // anchor href / DOM query string
  }
  return false;
}

function hasUntokenizedColor(rawLine) {
  const line = stripComments(rawLine);
  if (FUNC_COLOR.test(line)) return true;
  HEX.lastIndex = 0;
  let m;
  while ((m = HEX.exec(line)) !== null) {
    if (!isSelectorOrAnchor(line, m.index, m[0])) return true;
  }
  return false;
}

// Voice consistency: American English spellings, checked when the project's config
// says `"spelling": "american"` (see foundations/voice). `aria-labelledby` is the ARIA
// standard's own spelling and is exempted before matching.
const BRITISH = [
  /colour/i, /\bgrey/i, /\bcentre/i, /centring/i, /behaviour/i, /labell/i,
  /\borganis(?:e|ed|ing|ation)/i, /\bcustomis(?:e|ed|ing)/i, /licence/i, /favourite/i,
  // -is- verb families a design spec actually writes: each of these shipped in a real
  // project's Phase 1–4 drafts and had to be swept out by hand after the list missed it.
  /\butilis/i, /\bauthoris/i, /\bapologis/i, /\brecognis/i,
];
function hasBritishSpelling(rawLine) {
  const line = rawLine.replace(/aria-labelledby/gi, '');
  return BRITISH.some((re) => re.test(line));
}

// ---- interaction affordance: every control family declares its cursor ------------
// A native <button>, <select> or range input inherits `cursor: default` from the UA, so
// a styled control only LOOKS clickable if the stylesheet says it is. That makes the
// omission invisible in review — nothing is missing on screen, the pointer just never
// changes — and this template shipped for months with Select as the one control that
// never said it was clickable, found by a user hovering it, not by a checklist.
//
// The check is FAMILY-level and whole-file, not per-block: one `cursor:` declaration on
// any selector mentioning the family satisfies it, because a control is normally spread
// over a base rule plus variant/state rules. What it declares is the designer's call
// (`pointer` for a button, `default` for its disabled variant, `grab` for a drag
// handle) — the rule requires a DECISION, not a particular value.
const CONTROL_FAMILIES = [
  'btn', 'button', 'chip', 'tab', 'tile', 'option', 'select', 'summary',
  'switch', 'toggle', 'checkbox', 'radio', 'slider', 'range',
];
// Text-entry families are deliberately absent: an input keeps its caret, and demanding
// a cursor decision there would only invite someone to write `pointer` on a text field.

// Leaf CSS rules only (`sel { decls }` with no nested braces), which is where
// declarations live. The `[^{}]*` selector capture cannot span a brace, so an at-rule
// opener like `@supports ... {` is skipped rather than mistaken for a selector.
function cssRules(text) {
  const out = [];
  // Comments are BLANKED, not removed: the reported line comes from a byte offset, and
  // deleting them shifted every offset after the first comment (a violation in a
  // heavily commented stylesheet was reported ~65 lines early). Newlines are kept so
  // the line count is exact, everything else becomes a space.
  const src = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const RE = /([^{}]*)\{([^{}]*)\}/g;
  let m;
  while ((m = RE.exec(src)) !== null) {
    // an at-rule body may hold declarations before a nested rule; keep the last chunk
    const chunk = m[1].split(/[;}]/).pop();
    const sel = chunk.trim();
    if (!sel) continue;
    // the offset of the SELECTOR itself, not of the capture — which starts wherever the
    // previous rule ended and so would report a rule at the top of the file
    const index = m.index + (m[1].length - chunk.length) + (chunk.length - chunk.trimStart().length);
    out.push({ sel, body: m[2], index });
  }
  return out;
}

// Selectors are compared by IDENTIFIER SEGMENT, never by substring: `.kx-table` must
// not read as the `tab` family. A family of 5+ characters also matches a segment it
// PREFIXES by 2+ characters (`switchrow` is the switch family, `sliderrow` the slider)
// — the short, trap-prone names (`tab`, `btn`, `chip`) are under that length, and the
// 2-character floor keeps a plural CONTAINER out (`.options` is a list, `.optionrow`
// is an option).
//
// UA shadow parts are stripped first. `input.kx-well::-webkit-inner-spin-button` is a
// number field's spinner, not a Button, and flagging it taught the exact lesson a lint
// must not teach — that its findings are noise.
function familiesIn(sel) {
  const clean = sel.toLowerCase().replace(/::?-(?:webkit|moz|ms|o)-[a-z-]+/g, ' ');
  const segs = clean.split(/[^a-z0-9]+/).filter(Boolean);
  return CONTROL_FAMILIES.filter((f) => segs.some(
    (sg) => sg === f || (f.length >= 5 && sg.startsWith(f) && sg.length - f.length >= 2),
  ));
}

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

/** One violation per control family that is styled in a stylesheet and never given a
 *  cursor anywhere in it. Reported against the family's first rule. */
export function auditCursors(files) {
  const violations = [];
  for (const { path, content } of files) {
    if (!/\.s?css$/.test(path)) continue;   // in a JS/SFC file a `{...}` block is not reliably a rule
    const seen = new Map();                  // family -> first rule index
    const declared = new Set();
    for (const { sel, body, index } of cssRules(content)) {
      const fams = familiesIn(sel);
      if (!fams.length) continue;
      const hasCursor = /(^|[;{\s])cursor\s*:/.test(body);
      for (const f of fams) {
        if (!seen.has(f)) seen.set(f, index);
        if (hasCursor) declared.add(f);
      }
    }
    for (const [f, index] of seen) {
      if (declared.has(f)) continue;
      violations.push({
        file: path,
        line: lineOf(content, index),
        kind: 'control-cursor-undeclared',
        snippet: `the "${f}" control family never declares a cursor — a styled control ` +
                 'inherits the UA default and reads as not clickable',
      });
    }
  }
  return violations;
}

// In a spec .md file, only the ```html render blocks are CODE — and they are also the
// only lines a user will ever read as interface copy, because render.mjs inlines them
// into the styleguide as live examples. Prose may discuss a hex ramp or use an em dash
// freely; an example may not. Returns a Set of 0-based line indices.
function renderBlockLines(content) {
  const lines = content.split('\n');
  const inBlock = new Set();
  let inb = false;
  lines.forEach((line, idx) => {
    if (/^```html render\b/.test(line)) { inb = true; return; }
    if (inb && /^```\s*$/.test(line)) { inb = false; return; }
    if (inb) inBlock.add(idx);
  });
  return inBlock;
}

export function auditCode({ tokensRoot, files, spelling }) {
  const list = tokenList(tokensRoot);
  const primitiveVars = new Set(list.filter((t) => t.tier === 'primitive').map((t) => t.cssVar));
  const violations = [];

  for (const { path, content } of files) {
    const isMd = /\.md$/.test(path);
    const exampleLines = isMd ? renderBlockLines(content) : null;
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      const isCode = !isMd || exampleLines.has(idx);
      if (isCode) {
        const compact = line.replace(/\s+/g, ''); // catch `var(  --x  )` with padding
        for (const pv of primitiveVars) {
          if (compact.includes(`var(${pv})`)) {
            violations.push({ file: path, line: lineNo, kind: 'primitive-token-direct-use', snippet: line.trim() });
            return; // one violation per line is enough
          }
        }
        if (hasUntokenizedColor(line)) {
          violations.push({ file: path, line: lineNo, kind: 'untokenized-color', snippet: line.trim() });
        }
      }
      // Interface copy carries no em dashes (see foundations/voice): in user-facing
      // strings they read as machine-written. Enforced only where users read it — the
      // rendered examples — never in prose or code comments. The fix is a rewritten
      // sentence, not a swapped-in colon or semicolon.
      if (isMd && exampleLines.has(idx) && line.includes('—')) {
        violations.push({ file: path, line: lineNo, kind: 'em-dash-in-interface-copy', snippet: line.trim() });
      }
      if (spelling === 'american' && hasBritishSpelling(line)) {
        violations.push({ file: path, line: lineNo, kind: 'british-spelling', snippet: line.trim() });
      }
    });
  }
  return violations;
}

function collectFiles(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  // an include entry may name a single FILE (e.g. "export.html"), not just a directory
  let dirStat;
  try {
    dirStat = lstatSync(dir);
  } catch {
    return out;
  }
  if (dirStat.isFile()) return exts.includes(extname(dir)) ? [dir] : out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = lstatSync(full); // lstat: don't follow (and don't crash on) symlinks
    } catch {
      continue; // dangling symlink or race — skip rather than crash the audit
    }
    if (st.isSymbolicLink()) continue; // avoid symlink loops / escaping the tree
    if (st.isDirectory()) out.push(...collectFiles(full, exts));
    else if (st.isFile() && exts.includes(extname(full))) out.push(full);
  }
  return out;
}

export async function main(argv) {
  const cfgPath = argv[0] || 'design/audit.config.json';
  if (!existsSync(cfgPath)) {
    console.error(`Missing config: ${cfgPath}`);
    return 1;
  }
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  const tokensRoot = JSON.parse(readFileSync(cfg.tokens || 'design/tokens.json', 'utf8'));
  const files = [];
  for (const dir of cfg.include || []) {
    for (const f of collectFiles(dir, cfg.extensions || ['.css'])) {
      files.push({ path: f, content: readFileSync(f, 'utf8') });
    }
  }
  const violations = auditCode({ tokensRoot, files, spelling: cfg.spelling });
  // on by default: the omission it catches is invisible on screen, so opting IN would
  // mean nobody ever does. `"controlCursors": false` in the config turns it off.
  if (cfg.controlCursors !== false) violations.push(...auditCursors(files));
  if (violations.length) {
    for (const v of violations) console.error(`${v.file}:${v.line} [${v.kind}] ${v.snippet}`);
    console.error(`\n${violations.length} spec violation(s).`);
    return 1;
  }
  console.log('No spec violations.');
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
