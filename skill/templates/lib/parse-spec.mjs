// skill/templates/lib/parse-spec.mjs
import { parseFrontmatter } from './frontmatter.mjs';

// Matches a fenced ```html render block. Tolerates trailing whitespace/info
// after `render`, and requires the closing fence at the start of a line so an
// inline ``` inside the example does not truncate it early.
const RENDER_BLOCK = /```html render[^\n]*\r?\n([\s\S]*?)\r?\n```[ \t]*(?:\r?\n|$)/g;

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
