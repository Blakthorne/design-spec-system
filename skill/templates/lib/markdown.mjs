// skill/templates/lib/markdown.mjs

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeHref(url) {
  const u = url.trim();
  // Allow http(s), mailto, in-page anchors, and relative paths; reject the rest
  // (e.g. javascript:) so a link in a spec cannot smuggle script into the guide.
  if (/^(https?:\/\/|mailto:|#|\/|\.\/|\.\.\/)/i.test(u) || /^[\w./-]+$/.test(u)) {
    return escapeHtml(u).replace(/"/g, '&quot;');
  }
  return null;
}

// Applies emphasis/link markup to already-HTML-escaped text.
function emphasis(escaped) {
  return escaped
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
      const href = safeHref(url);
      return href ? `<a href="${href}">${text}</a>` : m;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_([^_\n]+)_(?![\w])/g, '$1<em>$2</em>');
}

function inline(s) {
  // inline code first (escape its contents, no emphasis inside), then escape +
  // apply emphasis/links to the rest.
  const parts = s.split(/(`[^`]+`)/g);
  return parts
    .map((p) => {
      if (p.startsWith('`') && p.endsWith('`') && p.length >= 2) {
        return `<code>${escapeHtml(p.slice(1, -1))}</code>`;
      }
      return emphasis(escapeHtml(p));
    })
    .join('');
}

export function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  let para = [];
  let list = [];

  const flushPara = () => {
    if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
  };
  const flushList = () => {
    if (list.length) {
      out.push(`<ul>\n${list.map((li) => `<li>${inline(li)}</li>`).join('\n')}\n</ul>`);
      list = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      flushPara(); flushList();
      const info = line.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++; }
      i++; // skip closing fence
      // ```html render blocks are LIVE examples anywhere in the spec (foundations and
      // patterns included), same contract as component files. Spec files are trusted
      // first-party authorship — that is the whole point of the gallery.
      if (info === 'html render') {
        out.push(`<div class="example">${code.join('\n')}</div>`);
      } else {
        out.push(`<pre><code>${escapeHtml(code.join('\n'))}\n</code></pre>`);
      }
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara(); flushList();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }
    // GFM tables: a | row line followed by a |---| separator. Cells get the same
    // inline treatment as any prose; alignment hints in the separator are ignored.
    if (line.trim().startsWith('|') && i + 1 < lines.length
        && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      flushPara(); flushList();
      const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(cells(lines[i])); i++; }
      const th = head.map((c) => `<th>${inline(c)}</th>`).join('');
      const trs = rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('\n');
      out.push(`<table><thead><tr>${th}</tr></thead><tbody>\n${trs}\n</tbody></table>`);
      continue;
    }
    if (line.trim().startsWith('- ')) {
      flushPara();
      list.push(line.trim().slice(2));
      i++;
      continue;
    }
    // An indented line while a list is open continues the previous item — without this,
    // a wrapped bullet's second line escapes the list as an orphan paragraph.
    if (list.length && /^\s{2,}\S/.test(line)) {
      list[list.length - 1] += ' ' + line.trim();
      i++;
      continue;
    }
    if (line.trim() === '') {
      flushPara(); flushList();
      i++;
      continue;
    }
    flushList();
    para.push(line.trim());
    i++;
  }
  flushPara(); flushList();
  return out.join('\n');
}
