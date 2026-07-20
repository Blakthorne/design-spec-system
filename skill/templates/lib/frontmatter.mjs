// skill/templates/lib/frontmatter.mjs

function unquote(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseScalarOrInlineArray(raw) {
  const v = raw.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((x) => unquote(x));
  }
  return unquote(v);
}

export function parseFrontmatter(text) {
  const norm = text.replace(/\r\n/g, '\n');
  if (!norm.startsWith('---\n')) return { data: {}, body: norm };
  const end = norm.indexOf('\n---', 4);
  if (end === -1) return { data: {}, body: norm };
  const fmBlock = norm.slice(4, end);
  const afterMarker = norm.indexOf('\n', end + 1);
  const body = afterMarker === -1 ? '' : norm.slice(afterMarker + 1);

  const data = {};
  const lines = fmBlock.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) { i++; continue; }
    const key = m[1];
    const rest = m[2];
    if (rest !== '') {
      data[key] = parseScalarOrInlineArray(rest);
      i++;
      continue;
    }
    // Block: look ahead at indented lines
    const block = [];
    i++;
    while (i < lines.length && /^\s+\S/.test(lines[i])) {
      block.push(lines[i]);
      i++;
    }
    if (block.length && block.every((b) => b.trim().startsWith('- '))) {
      data[key] = block.map((b) => unquote(b.trim().slice(2)));
    } else {
      const obj = {};
      for (const b of block) {
        const bm = b.trim().match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (bm) obj[bm[1]] = parseScalarOrInlineArray(bm[2]);
      }
      data[key] = obj;
    }
  }
  return { data, body };
}
