// skill/templates/lib/render-html.mjs

function swatch(t) {
  const isColor = t.type === 'color';
  const chip = isColor
    ? `<span class="chip" style="background:${t.value}"></span>`
    : `<span class="chip chip--text">${t.value}</span>`;
  const flag = t.tier === 'primitive'
    ? ' <em class="warn">(primitive — not for direct use)</em>'
    : '';
  return `<div class="token">${chip}<code>${t.cssVar}</code> <span>${t.value}</span>${flag}</div>`;
}

function componentSection(c) {
  const variants = (c.data.variants || []).join(', ') || '—';
  const states = (c.data.states || []).join(', ') || '—';
  const examples = c.examples.map((ex) => `<div class="example">${ex}</div>`).join('\n');
  return `
<section class="component">
  ${c.prose}
  <p class="meta"><strong>Variants:</strong> ${variants} &middot; <strong>States:</strong> ${states}</p>
  <div class="examples">${examples}</div>
</section>`;
}

export function renderStyleguide(input) {
  const tokensHtml = input.tokens.map(swatch).join('\n');
  const foundationsHtml = input.foundations.map((f) => f.html).join('\n');
  const componentsHtml = input.components.map(componentSection).join('\n');
  const patternsHtml = input.patterns.map((p) => p.html).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Style Guide</title>
<style>
:root {
${input.cssRoot}
}
[data-theme="dark"] {
${input.cssDark}
}
body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem; max-width: 960px; }
.banner { background: #fffbdd; border: 1px solid #e0d000; padding: .75rem 1rem; border-radius: 6px; margin-bottom: 2rem; }
.token { display: flex; align-items: center; gap: .75rem; padding: .25rem 0; }
.chip { width: 1.5rem; height: 1.5rem; border-radius: 4px; border: 1px solid #0002; display: inline-block; }
.chip--text { width: auto; padding: 0 .5rem; }
.warn { color: #b00; }
.examples { display: flex; flex-wrap: wrap; gap: 1rem; }
.example { padding: 1rem; border: 1px dashed #0003; border-radius: 6px; }
img, table, pre { max-width: 100%; }
</style>
</head>
<body>
<div class="banner">GENERATED — do not edit. Edit files in <code>design/</code> and re-run <code>node render.mjs</code>. Source hash: <code>${input.sourceHash}</code></div>
<button onclick="document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'">Toggle theme</button>
${input.principles}
<h1>Tokens</h1>
${tokensHtml}
<h1>Foundations</h1>
${foundationsHtml}
<h1>Components</h1>
${componentsHtml}
<h1>Patterns</h1>
${patternsHtml}
<h1>Governance</h1>
${input.governance}
</body>
</html>`;
}
