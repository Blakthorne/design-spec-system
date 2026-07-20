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

export function auditCode({ tokensRoot, files }) {
  const list = tokenList(tokensRoot);
  const primitiveVars = new Set(list.filter((t) => t.tier === 'primitive').map((t) => t.cssVar));
  const violations = [];

  for (const { path, content } of files) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
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
    });
  }
  return violations;
}

function collectFiles(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
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
  const violations = auditCode({ tokensRoot, files });
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
