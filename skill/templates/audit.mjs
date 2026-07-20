// skill/templates/audit.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenList } from './lib/tokens.mjs';

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const FUNC_COLOR = /\b(rgb|rgba|hsl|hsla)\s*\(/;

export function auditCode({ tokensRoot, files }) {
  const list = tokenList(tokensRoot);
  const primitiveVars = new Set(list.filter((t) => t.tier === 'primitive').map((t) => t.cssVar));
  const violations = [];

  for (const { path, content } of files) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      for (const pv of primitiveVars) {
        if (line.includes(`var(${pv})`) || line.includes(`var( ${pv}`)) {
          violations.push({ file: path, line: lineNo, kind: 'primitive-token-direct-use', snippet: line.trim() });
          return; // one violation per line is enough
        }
      }
      if (HEX.test(line) || FUNC_COLOR.test(line)) {
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
    const st = statSync(full);
    if (st.isDirectory()) out.push(...collectFiles(full, exts));
    else if (exts.includes(extname(full))) out.push(full);
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
