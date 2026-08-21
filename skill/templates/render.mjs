// skill/templates/render.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { cwd } from 'node:process';
import { fileURLToPath } from 'node:url';
import { toCssVars, tokenList } from './lib/tokens.mjs';
import { parseSpecFile } from './lib/parse-spec.mjs';
import { renderMarkdown } from './lib/markdown.mjs';
import { hashSources } from './lib/hash.mjs';

function readDirMd(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => ({ name: basename(f, '.md'), text: readFileSync(join(dir, f), 'utf8') }));
}

// Resolve the design directory: the current dir if it IS the design dir
// (basename === 'design'), otherwise a `design/` subdirectory. Using an exact
// basename match avoids misfiring on projects like `webdesign/` or `redesign/`.
export function resolveDesignDir(startDir = cwd()) {
  return basename(startDir) === 'design' ? startDir : join(startDir, 'design');
}

export function readSources(designDir) {
  const tokensPath = join(designDir, 'tokens.json');
  if (!existsSync(tokensPath)) {
    throw new Error(
      `Design tokens not found at ${tokensPath}. Run this from your project root (with a design/ directory) `
      + 'or scaffold the design spec first.',
    );
  }
  const tokensText = readFileSync(tokensPath, 'utf8');
  const principlesText = existsSync(join(designDir, 'principles.md'))
    ? readFileSync(join(designDir, 'principles.md'), 'utf8') : '';
  const governanceText = existsSync(join(designDir, 'governance.md'))
    ? readFileSync(join(designDir, 'governance.md'), 'utf8') : '';
  const foundations = readDirMd(join(designDir, 'foundations'));
  const components = readDirMd(join(designDir, 'components'));
  const patterns = readDirMd(join(designDir, 'patterns'));

  const parts = [
    tokensText, principlesText, governanceText,
    ...foundations.map((f) => f.text),
    ...components.map((c) => c.text),
    ...patterns.map((p) => p.text),
  ];
  return { tokensText, principlesText, governanceText, foundations, components, patterns, parts };
}

export function buildStyleguide(designDir) {
  const src = readSources(designDir);
  // The interactive runtime: the reference implementation the examples run on.
  const cssPath = join(designDir, 'interactive', 'components.css');
  const jsPath = join(designDir, 'interactive', 'components.js');
  const componentCss = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';
  const componentJs = existsSync(jsPath) ? readFileSync(jsPath, 'utf8') : '';
  // Optional project identity + self-hosted faces.
  const guidePath = join(designDir, 'guide.json');
  const guide = existsSync(guidePath) ? JSON.parse(readFileSync(guidePath, 'utf8')) : {};
  const fontsPath = join(designDir, 'fonts', 'fonts.css');
  const fontsCss = existsSync(fontsPath) ? readFileSync(fontsPath, 'utf8') : '';
  src.parts.push(componentCss, componentJs, fontsCss, JSON.stringify(guide)); // hash covers these too
  const tokensRoot = JSON.parse(src.tokensText);
  const { root: cssRoot, dark: cssDark } = toCssVars(tokensRoot);
  const hash = hashSources(src.parts);

  // renderStyleguide is imported lazily to keep this module focused on IO.
  return import('./lib/render-html.mjs').then(({ renderStyleguide }) => {
    const html = renderStyleguide({
      cssRoot, cssDark, componentCss, componentJs, fontsCss, guide,
      tokens: tokenList(tokensRoot),
      principles: renderMarkdown(src.principlesText),
      foundations: src.foundations.map((f) => ({ name: f.name, html: renderMarkdown(f.text) })),
      components: src.components.map((c) => {
        const { data, prose, examples } = parseSpecFile(c.text);
        return { name: c.name, data, prose: renderMarkdown(prose), examples };
      }),
      patterns: src.patterns.map((p) => ({ name: p.name, html: renderMarkdown(p.text) })),
      governance: renderMarkdown(src.governanceText),
      sourceHash: hash,
    });
    return { html, hash };
  });
}

const HASH_RE = /Source hash: <code>([0-9a-f]{12})<\/code>/;

export async function main(argv) {
  const designDir = resolveDesignDir();
  const outPath = join(designDir, 'styleguide.html');

  let html;
  let hash;
  try {
    ({ html, hash } = await buildStyleguide(designDir));
  } catch (err) {
    console.error(`Error building style guide: ${err.message}`);
    return 1;
  }

  if (argv.includes('--check')) {
    if (!existsSync(outPath)) {
      console.error('styleguide.html is missing — run `node render.mjs` to generate it.');
      return 1;
    }
    const current = readFileSync(outPath, 'utf8');
    const m = current.match(HASH_RE);
    if (!m || m[1] !== hash) {
      console.error(`styleguide.html is stale (has ${m ? m[1] : 'none'}, sources hash ${hash}). Re-run \`node render.mjs\`.`);
      return 1;
    }
    console.log('styleguide.html is up to date.');
    return 0;
  }

  writeFileSync(outPath, html);
  console.log(`Wrote ${outPath} (hash ${hash}).`);
  return 0;
}

// Run as CLI only when invoked directly.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(`Unexpected error: ${err.message}`);
      process.exit(1);
    });
}
