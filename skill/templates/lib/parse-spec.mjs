// skill/templates/lib/parse-spec.mjs
import { parseFrontmatter } from './frontmatter.mjs';

const RENDER_BLOCK = /```html render\n([\s\S]*?)```/g;

export function parseSpecFile(text) {
  const { data, body } = parseFrontmatter(text);
  const examples = [];
  let m;
  RENDER_BLOCK.lastIndex = 0;
  while ((m = RENDER_BLOCK.exec(body)) !== null) {
    examples.push(m[1].replace(/\n$/, ''));
  }
  const prose = body.replace(RENDER_BLOCK, '').replace(/\n{3,}/g, '\n\n').trim();
  return { data, prose, examples };
}
