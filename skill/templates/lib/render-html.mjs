// skill/templates/lib/render-html.mjs

// Escape text/attribute content. Token values and frontmatter fields are
// human-authored and interpolated into the page, so a stray <, &, or " must
// not corrupt the document or inject markup. Live `html render` examples are
// intentionally emitted verbatim — that is the whole point of the gallery.
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- token gallery ----------------------------------------------------------
// Grouped and visual, the way mature systems document tokens (Carbon/Polaris/Material):
// colour ramps as strips, semantic colours as swatch cards with their dark value,
// type as live specimens, spacing as proportional bars, radius/shadow/border as shapes.
function tGroup(tokens, top) { return tokens.filter((t) => t.path[0] === top); }

function colorGallery(tokens) {
  const prim = tokens.filter((t) => t.path[0] === 'color' && t.tier === 'primitive');
  const sem = tokens.filter((t) => t.path[0] === 'color' && t.tier !== 'primitive');
  const ramps = {};
  prim.forEach((t) => { (ramps[t.path[2]] ||= []).push(t); });
  const rampsHtml = Object.entries(ramps).map(([name, toks]) => `
    <div class="tg-ramp"><div class="tg-rampname">${esc(name)}</div>
      <div class="tg-rampstrip">${toks.map((t) => `<div class="tg-rampchip" style="background:${esc(t.value)}" title="${esc(t.cssVar)}: ${esc(t.value)}"><span>${esc(t.path[3] ?? t.path[2])}</span></div>`).join('')}</div>
    </div>`).join('');
  const groups = {};
  sem.forEach((t) => { (groups[t.path[1]] ||= []).push(t); });
  const semHtml = Object.entries(groups).map(([g, toks]) => `
    <h4 class="tg-h">color.${esc(g)}</h4>
    <div class="tg-grid">${toks.map((t) => `
      <div class="tg-card">
        <div class="tg-chips"><span class="tg-chip" style="background:${esc(t.value)}"></span>${t.dark ? `<span class="tg-chip tg-chip--dark" style="background:${esc(t.dark)}" title="dark: ${esc(t.dark)}"></span>` : ''}</div>
        <div class="tg-name">${esc(t.path.slice(2).join('.'))}</div>
        <code class="tg-var">${esc(t.cssVar)}</code>
        <div class="tg-val">${esc(t.value)}${t.dark ? ` <span class="tg-dark">· dark ${esc(t.dark)}</span>` : ''}</div>
      </div>`).join('')}
    </div>`).join('');
  return `<h3 class="tg-sect">Colour — primitives <em class="warn">(not for direct use)</em></h3>${rampsHtml}
          <h3 class="tg-sect">Colour — semantic roles</h3>${semHtml}`;
}

function typeGallery(tokens) {
  const fams = tGroup(tokens, 'font');
  const sizes = tGroup(tokens, 'font-size');
  const weights = tGroup(tokens, 'font-weight');
  const misc = [...tGroup(tokens, 'line-height'), ...tGroup(tokens, 'letter-spacing')];
  return `<h3 class="tg-sect">Typography</h3>
  ${fams.map((t) => `<div class="tg-spec"><div class="tg-specmeta"><code>${esc(t.cssVar)}</code><span>${esc(t.value)}</span></div>
     <div class="tg-specline" style="font-family:${esc(t.value)}">Keswick Christian School — campus map · 0123456789</div></div>`).join('')}
  <div class="tg-sizes">${sizes.map((t) => `<div class="tg-sizerow"><code>${esc(t.cssVar)}</code><span class="tg-px">${esc(t.value)}</span>
     <span class="tg-sizespec" style="font-size:${esc(t.value)}">Grayscale campus map</span></div>`).join('')}</div>
  <div class="tg-weights">${weights.map((t) => `<div class="tg-w"><span style="font-weight:${esc(t.value)}">Ag</span><code>${esc(t.path[1])} ${esc(t.value)}</code></div>`).join('')}</div>
  ${factTable(misc)}`;
}

function barGallery(tokens, top, title) {
  const toks = tGroup(tokens, top);
  if (!toks.length) return '';
  return `<h3 class="tg-sect">${esc(title)}</h3><div class="tg-bars">
  ${toks.map((t) => `<div class="tg-barrow"><code>${esc(t.path.slice(1).join('.'))}</code>
     <span class="tg-bar" style="width:${esc(t.value)}"></span><span class="tg-px">${esc(t.value)}</span></div>`).join('')}</div>`;
}

function shapeGallery(tokens) {
  const radii = tGroup(tokens, 'radius');
  const borders = tGroup(tokens, 'border-width');
  const shadows = tGroup(tokens, 'shadow');
  return `<h3 class="tg-sect">Radius · border · elevation</h3>
  <div class="tg-shapes">
    ${radii.map((t) => `<div class="tg-shape"><span class="tg-radbox" style="border-radius:${esc(t.value)}"></span><code>${esc(t.path[1])}</code><span class="tg-px">${esc(t.value)}</span></div>`).join('')}
    ${borders.map((t) => `<div class="tg-shape"><span class="tg-bline" style="border-top-width:${esc(t.value)}"></span><code>${esc(t.path[1])}</code><span class="tg-px">${esc(t.value)}</span></div>`).join('')}
    ${shadows.map((t) => `<div class="tg-shape"><span class="tg-shadowbox" style="box-shadow:${esc(t.value)}"></span><code>${esc(t.path[1])}</code></div>`).join('')}
  </div>`;
}

function factTable(toks) {
  if (!toks.length) return '';
  return `<table class="tg-table"><thead><tr><th>token</th><th>value</th><th>dark</th></tr></thead><tbody>
  ${toks.map((t) => `<tr><td><code>${esc(t.cssVar)}</code></td><td>${esc(t.value)}</td><td>${t.dark ? esc(t.dark) : '—'}</td></tr>`).join('\n')}
  </tbody></table>`;
}

function tokenGallery(tokens) {
  const facts = ['size', 'duration', 'easing', 'breakpoint', 'z'].flatMap((k) => tGroup(tokens, k));
  // Anything outside the known groups still renders (escaped) — a new top-level
  // group must never silently vanish from the guide.
  const KNOWN = new Set(['color', 'font', 'font-size', 'font-weight', 'line-height',
    'letter-spacing', 'space', 'radius', 'border-width', 'shadow',
    'size', 'duration', 'easing', 'breakpoint', 'z']);
  const other = tokens.filter((t) => !KNOWN.has(t.path[0]));
  return [
    colorGallery(tokens),
    typeGallery(tokens),
    barGallery(tokens, 'space', 'Spacing'),
    shapeGallery(tokens),
    `<h3 class="tg-sect">Sizes · motion · breakpoints · stacking</h3>`, factTable(facts),
    other.length ? `<h3 class="tg-sect">Other tokens</h3>${factTable(other)}` : '',
  ].join('\n');
}

function componentSection(c) {
  const variants = (c.data.variants || []).map(esc).join(', ') || '—';
  const states = (c.data.states || []).map(esc).join(', ') || '—';
  const examples = c.examples.map((ex) => `<div class="example">${ex}</div>`).join('\n');
  const title = esc(c.data.name || c.name);
  const purpose = c.data.purpose ? `<p class="purpose">${esc(c.data.purpose)}</p>` : '';
  return `
<section class="component" id="c-${esc(c.name)}">
  <header class="chead"><h3>${title}</h3>${purpose}</header>
  ${c.prose}
  <p class="meta"><strong>Variants:</strong> ${variants} &middot; <strong>States:</strong> ${states}</p>
  <div class="examples">${examples}</div>
</section>`;
}

export function renderStyleguide(input) {
  // tokenList emits path; tolerate hand-built token entries that only carry cssVar.
  const toks = (input.tokens || []).map((t) => t.path ? t : { ...t, path: String(t.cssVar || '').replace(/^--/, '').split('-') });
  const tokensHtml = tokenGallery(toks);
  const foundationsHtml = input.foundations
    .map((f) => `<section class="sg-sub" id="f-${esc(f.name)}">${f.html}</section>`).join('\n');
  const componentsHtml = input.components.map(componentSection).join('\n');
  const patternsHtml = input.patterns
    .map((p) => `<section class="sg-sub" id="p-${esc(p.name)}">${p.html}</section>`).join('\n');
  // Single-document sections (principles, governance) get nav sub-links derived
  // from their own h2 headings; ids are injected so the anchors resolve.
  const slug = (t) => t.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const anchorize = (html, prefix) => {
    const subs = [];
    const out = String(html).replace(/<h2>([\s\S]*?)<\/h2>/g, (m, t) => {
      const id = prefix + '-' + slug(t);
      subs.push(`<a class="sub" href="#${id}">${t.replace(/<[^>]*>/g, '')}</a>`);
      return `<h2 id="${id}">${t}</h2>`;
    });
    return { out, subs: subs.join('') };
  };
  const gov = anchorize(input.governance, 'gov');
  const princ = anchorize(input.principles, 'princ');

  const title = (input.guide && input.guide.title) || 'Design Spec';
  const subtitle = (input.guide && input.guide.subtitle) || 'Design specification & style guide';
  const navSub = (items, pre) => items
    .map((x) => `<a class="sub" href="#${pre}-${esc(x.name)}">${esc((x.data && x.data.name) || x.name)}</a>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Design Spec</title>
<style>
/* design/fonts/fonts.css, inlined so the guide previews in the spec's own faces. */
${input.fontsCss || ''}
:root {
${input.cssRoot}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${input.cssDark}
  }
}
[data-theme="dark"] {
${input.cssDark}
}
/* ---- component reference implementation (design/interactive/) ---- */
${input.componentCss || ''}

/* =========================================================================
   The styleguide's own chrome — built FROM the system it documents: token
   colours, the two faces, the spacing scale, the zone-heading grammar. The
   guide is the first product of the design system.
   ========================================================================= */
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 76px;
  scrollbar-color: var(--color-border-control) var(--color-surface-page); }
.sg-nav { scrollbar-color: var(--color-border-subtle) var(--color-surface-page); }
body { margin: 0; background: var(--color-surface-page); color: var(--color-text-primary);
  font-family: var(--font-body); font-size: var(--font-size-body); line-height: var(--line-height-body); }

/* top bar */
.sg-top { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: var(--space-md);
  padding: var(--space-sm) var(--space-lg); background: var(--color-surface-card);
  border-bottom: var(--border-width-hairline) solid var(--color-border-subtle); box-shadow: var(--shadow-raised); }
.sg-mark { width: 34px; height: 34px; border-radius: var(--radius-pill); background: var(--color-action-primary);
  color: var(--color-action-primary-text); display: grid; place-items: center; flex: none;
  font-family: var(--font-display); font-weight: var(--font-weight-semibold); font-size: 17px; }
.sg-title b { display: block; font-family: var(--font-display); font-size: var(--font-size-title);
  font-weight: var(--font-weight-semibold); color: var(--color-text-brand); line-height: var(--line-height-tight); }
.sg-title small { display: block; font-size: var(--font-size-caption); color: var(--color-text-subtle); }
.sg-gen { margin-left: auto; font-family: var(--font-mono); font-size: var(--font-size-caption);
  color: var(--color-text-subtle); text-align: right; }
.sg-gen code { background: none; border: 0; padding: 0; color: inherit; }

/* shell: sticky toc + content */
.sg-shell { display: grid; grid-template-columns: 232px minmax(0, 1fr); gap: var(--space-2xl);
  max-width: 1220px; margin: 0 auto; padding: var(--space-xl) var(--space-lg) var(--space-2xl); }
.sg-nav { position: sticky; top: 84px; align-self: start; max-height: calc(100vh - 100px);
  overflow-y: auto; padding-right: var(--space-sm); scrollbar-width: thin; }
.sg-nav a { display: block; padding: var(--space-3xs) var(--space-xs); border-radius: var(--radius-chip);
  color: var(--color-text-secondary); text-decoration: none; font-size: var(--font-size-small); }
.sg-nav a.top { font-weight: var(--font-weight-semibold); color: var(--color-text-primary);
  margin-top: var(--space-sm); font-family: var(--font-display); font-size: var(--font-size-body); }
.sg-nav a.top:first-child { margin-top: 0; }
.sg-nav a.sub { padding-left: var(--space-md); }
.sg-nav a:hover { background: var(--color-action-hover-wash); color: var(--color-text-primary); }
.sg-main { min-width: 0; max-width: 880px; }
@media (max-width: 980px) { .sg-shell { grid-template-columns: 1fr; } .sg-nav { display: none; } }

/* section + heading grammar (the zone-head rule, at document scale) */
.sg-sect { margin-bottom: var(--space-2xl); }
.sg-h1 { display: flex; align-items: center; gap: var(--space-sm); margin: 0 0 var(--space-lg);
  font-family: var(--font-display); font-size: 30px; font-weight: var(--font-weight-semibold);
  color: var(--color-text-brand); }
.sg-h1::after { content: ""; flex: 1; height: var(--border-width-hairline); background: var(--color-border-subtle); }
.sg-main h1 { font-family: var(--font-display); font-size: var(--font-size-display);
  color: var(--color-text-brand); margin: 0 0 var(--space-md); }
.sg-main h2 { display: flex; align-items: center; gap: var(--space-sm); font-family: var(--font-display);
  font-size: 22px; font-weight: var(--font-weight-semibold); margin: var(--space-xl) 0 var(--space-sm); }
.sg-main h2::after { content: ""; flex: 1; height: var(--border-width-hairline); background: var(--color-border-subtle); }
.sg-main h3 { font-family: var(--font-display); font-size: 18px; font-weight: var(--font-weight-semibold);
  margin: var(--space-lg) 0 var(--space-xs); }
.sg-main h4 { font-family: var(--font-mono); font-size: var(--font-size-caption); font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; color: var(--color-text-subtle);
  margin: var(--space-lg) 0 var(--space-2xs); }
.sg-main p { margin: 0 0 var(--space-sm); max-width: 72ch; }
.sg-main ul { margin: 0 0 var(--space-sm); padding-left: var(--space-lg); }
.sg-main li { margin-bottom: var(--space-2xs); max-width: 68ch; }
.sg-main a { color: var(--color-text-action); }
.sg-sub { margin-bottom: var(--space-xl); }

/* code + pre + tables, in the system's materials */
.sg-main code { font-family: var(--font-mono); font-size: 0.86em;
  background: var(--color-surface-sunken); border-radius: var(--radius-chip);
  padding: 1px var(--space-2xs); }
.sg-main pre { background: var(--color-surface-sunken); border: var(--border-width-hairline) solid var(--color-border-subtle);
  border-radius: var(--radius-control); padding: var(--space-sm) var(--space-md);
  overflow-x: auto; font-family: ui-monospace, "SF Mono", Menlo, monospace; /* Atkinson Mono lacks box-drawing glyphs */
  font-size: var(--font-size-small); line-height: 1.55; }
.sg-main pre code { background: none; border-radius: 0; padding: 0; font-size: inherit; }
.sg-main table { border-collapse: collapse; margin: var(--space-sm) 0; font-size: var(--font-size-small);
  background: var(--color-surface-card); border: var(--border-width-hairline) solid var(--color-border-subtle);
  border-radius: var(--radius-control); overflow: hidden; }
.sg-main th, .sg-main td { text-align: left; padding: var(--space-xs) var(--space-sm);
  border-bottom: var(--border-width-hairline) solid var(--color-border-subtle); vertical-align: top; }
.sg-main th { font-family: var(--font-mono); font-size: var(--font-size-caption); text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide); color: var(--color-text-subtle); font-weight: var(--font-weight-semibold); }
.sg-main tr:last-child td { border-bottom: 0; }

/* component sections */
.component { margin: 0 0 var(--space-2xl); padding: var(--space-lg);
  background: var(--color-surface-card); border: var(--border-width-hairline) solid var(--color-border-subtle);
  border-radius: var(--radius-surface); box-shadow: var(--shadow-raised); }
.chead h3 { font-family: var(--font-display); font-size: 24px; margin: 0; }
.chead .purpose { margin: var(--space-3xs) 0 0; color: var(--color-text-secondary); }
.component h2 { font-family: var(--font-mono); font-size: var(--font-size-caption); font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; color: var(--color-text-subtle);
  margin: var(--space-lg) 0 var(--space-2xs); }
.component h2::after { display: none; }
.component .meta { font-size: var(--font-size-small); color: var(--color-text-subtle); }
.examples { display: flex; flex-wrap: wrap; gap: var(--space-md); }
.example { border: 0; padding: 0; max-width: 100%; overflow-x: auto; }
.example > .kx-demo { border: var(--border-width-hairline) solid var(--color-border-subtle); }

/* token gallery */
.tg-sect { display: flex; align-items: center; gap: var(--space-sm); font-family: var(--font-display);
  font-size: 22px; font-weight: var(--font-weight-semibold); margin: var(--space-xl) 0 var(--space-sm); }
.tg-sect::after { content: ""; flex: 1; height: var(--border-width-hairline); background: var(--color-border-subtle); }
.tg-sect .warn { font-family: var(--font-body); font-size: var(--font-size-caption); font-weight: var(--font-weight-regular); }
.tg-h { font-family: var(--font-mono); font-size: var(--font-size-caption); font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide); text-transform: uppercase;
  margin: var(--space-lg) 0 var(--space-xs); color: var(--color-text-subtle); }
.tg-ramp { display: flex; align-items: center; gap: var(--space-sm); margin: var(--space-2xs) 0; }
.tg-rampname { flex: 0 0 90px; font-family: var(--font-mono); font-size: var(--font-size-caption); }
.tg-rampstrip { flex: 1; display: flex; border-radius: var(--radius-control); overflow: hidden;
  border: var(--border-width-hairline) solid var(--color-border-subtle); }
.tg-rampchip { flex: 1; height: 44px; position: relative; }
.tg-rampchip span { position: absolute; left: 4px; bottom: 2px; font-family: var(--font-mono); font-size: 10px;
  color: #fff; mix-blend-mode: difference; }
.tg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: var(--space-xs); }
.tg-card { border: var(--border-width-hairline) solid var(--color-border-subtle); border-radius: var(--radius-control);
  padding: var(--space-xs); background: var(--color-surface-card); }
.tg-chips { display: flex; gap: var(--space-2xs); }
.tg-chip { flex: 1; height: 36px; border-radius: var(--radius-chip);
  border: var(--border-width-hairline) solid var(--color-border-subtle); }
.tg-chip--dark { flex: 0 0 28%; }
.tg-name { font-weight: var(--font-weight-semibold); font-size: var(--font-size-small); margin-top: var(--space-xs); }
.tg-var { display: block; font-family: var(--font-mono); font-size: 11px; color: var(--color-text-subtle); margin-top: 2px; }
.tg-val { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
.tg-dark { color: var(--color-text-subtle); }
.tg-spec { margin: var(--space-sm) 0; }
.tg-specmeta { display: flex; gap: var(--space-sm); font-size: var(--font-size-caption); color: var(--color-text-secondary); margin-bottom: 2px; }
.tg-specline { font-size: 21px; }
.tg-sizes { margin: var(--space-sm) 0; }
.tg-sizerow { display: flex; align-items: baseline; gap: var(--space-sm); padding: var(--space-2xs) 0;
  border-bottom: var(--border-width-hairline) dashed var(--color-border-subtle); }
.tg-sizerow code { flex: 0 0 190px; background: none; padding: 0; }
.tg-px { flex: 0 0 52px; font-family: var(--font-mono); font-size: 11px; color: var(--color-text-subtle); }
.tg-weights { display: flex; gap: var(--space-lg); align-items: baseline; margin: var(--space-sm) 0; }
.tg-w { text-align: center; }
.tg-w span { display: block; font-size: 30px; }
.tg-w code { font-size: 11px; background: none; padding: 0; }
.tg-bars { margin: var(--space-xs) 0; }
.tg-barrow { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-3xs) 0; }
.tg-barrow code { flex: 0 0 90px; background: none; padding: 0; }
.tg-bar { display: inline-block; height: 14px; background: var(--color-action-primary); border-radius: 3px; }
.tg-shapes { display: flex; gap: var(--space-lg); flex-wrap: wrap; align-items: flex-end; }
.tg-shape { text-align: center; font-size: 11px; }
.tg-shape code { display: block; margin-top: var(--space-2xs); background: none; padding: 0; }
.tg-radbox { display: block; width: 64px; height: 48px; background: var(--color-surface-subtle);
  border: 1.5px solid var(--color-border-control); }
.tg-bline { display: block; width: 64px; border-top: 0 solid var(--color-text-primary); margin: 22px 0 26px; }
.tg-shadowbox { display: block; width: 96px; height: 60px; border-radius: var(--radius-control); background: var(--color-surface-card); }
.warn { color: var(--color-feedback-error); }
img, table, pre { max-width: 100%; }
</style>
</head>
<body>
<header class="sg-top">
  <span class="sg-mark">${esc(title.trim().charAt(0).toUpperCase())}</span>
  <span class="sg-title"><b>${esc(title)}</b><small>${esc(subtitle)}</small></span>
  <span class="sg-gen">GENERATED — edit <code>design/</code>, run <code>node render.mjs</code><br>Source hash: <code>${input.sourceHash}</code></span>
  <button class="kx-btn kx-btn--secondary kx-btn--sm" id="sg-theme">Theme: system</button>
<script>
(function(){
  var KEY='keswickTheme', btn=document.getElementById('sg-theme'), root=document.documentElement;
  function apply(v){ if(v==='light'||v==='dark'){root.dataset.theme=v}else{delete root.dataset.theme;v='system'}
    btn.textContent='Theme: '+v; }
  btn.addEventListener('click',function(){
    var cur=root.dataset.theme||'system';
    var next=cur==='system'?'light':cur==='light'?'dark':'system';
    if(next==='system'){localStorage.removeItem(KEY)}else{localStorage.setItem(KEY,next)}
    apply(next);
  });
  try{apply(localStorage.getItem(KEY))}catch(e){apply(null)}
})();
</script>
</header>
<div class="sg-shell">
  <nav class="sg-nav" aria-label="Contents">
    <a class="top" href="#sg-principles">Principles</a>
    ${princ.subs}
    <a class="top" href="#sg-tokens">Tokens</a>
    <a class="top" href="#sg-foundations">Foundations</a>
    ${navSub(input.foundations, 'f')}
    <a class="top" href="#sg-components">Components</a>
    ${input.components.map((c) => `<a class="sub" href="#c-${esc(c.name)}">${esc((c.data && c.data.name) || c.name)}</a>`).join('')}
    <a class="top" href="#sg-patterns">Patterns</a>
    ${navSub(input.patterns, 'p')}
    <a class="top" href="#sg-governance">Governance</a>
    ${gov.subs}
  </nav>
  <main class="sg-main">
    <section class="sg-sect" id="sg-principles">${princ.out}</section>
    <section class="sg-sect" id="sg-tokens"><h1 class="sg-h1">Tokens</h1>${tokensHtml}</section>
    <section class="sg-sect" id="sg-foundations"><h1 class="sg-h1">Foundations</h1>${foundationsHtml}</section>
    <section class="sg-sect" id="sg-components"><h1 class="sg-h1">Components</h1>${componentsHtml}</section>
    <section class="sg-sect" id="sg-patterns"><h1 class="sg-h1">Patterns</h1>${patternsHtml}</section>
    <section class="sg-sect" id="sg-governance">${gov.out}</section>
  </main>
</div>
<script>\n${input.componentJs || ''}\n</script>\n</body>
</html>`;
}
