// skill/templates/lib/tokens.mjs

export function walkTokens(node, cb, path = [], inherited = {}) {
  const type = node.$type ?? inherited.type;
  const tier = node.$extensions?.['design-spec']?.tier ?? inherited.tier;
  for (const [key, val] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    if (val && typeof val === 'object' && '$value' in val) {
      cb({
        path: [...path, key],
        token: val,
        type: val.$type ?? type,
        tier: val.$extensions?.['design-spec']?.tier ?? tier,
        dark: val.$extensions?.['design-spec']?.dark,
      });
    } else if (val && typeof val === 'object') {
      walkTokens(val, cb, [...path, key], { type, tier });
    }
  }
}

export function cssVarName(path) {
  return '--' + path.join('-').toLowerCase();
}

export function lookupToken(root, ref) {
  const clean = ref.replace(/^\{|\}$/g, '');
  let node = root;
  for (const p of clean.split('.')) {
    node = node?.[p];
    if (node === undefined) return undefined;
  }
  return node;
}

const ALIAS_RE = /^\{[^}]+\}$/;

// Resolves alias chains to concrete values. Handles composite DTCG values
// (objects/arrays) by resolving aliases nested within them. `seen` guards
// against circular aliases (which would otherwise blow the stack).
export function resolveValue(root, value, seen = new Set()) {
  if (typeof value === 'string' && ALIAS_RE.test(value)) {
    if (seen.has(value)) {
      throw new Error(`Circular alias detected: ${[...seen, value].join(' -> ')}`);
    }
    const target = lookupToken(root, value);
    if (!target || typeof target !== 'object' || !('$value' in target)) {
      throw new Error(`Unresolved alias: ${value}`);
    }
    return resolveValue(root, target.$value, new Set(seen).add(value));
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveValue(root, v, seen));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveValue(root, v, seen);
    return out;
  }
  return value;
}

// Produces a display/CSS string for a resolved value, never "[object Object]".
// Composite shadow objects/arrays compose into a valid CSS shadow string;
// other composite objects fall back to a readable "k: v; ..." form.
export function stringifyValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(stringifyValue).join(', ');
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    const isShadow = keys.some((k) => k === 'offsetX' || k === 'offsetY' || k === 'blur' || k === 'spread');
    if (isShadow) {
      const parts = [value.offsetX, value.offsetY, value.blur, value.spread]
        .filter((p) => p !== undefined)
        .map(stringifyValue);
      const color = value.color !== undefined ? stringifyValue(value.color) : '';
      return [parts.join(' '), color].filter(Boolean).join(' ');
    }
    return keys.map((k) => `${k}: ${stringifyValue(value[k])}`).join('; ');
  }
  return String(value);
}

export function tokenList(root) {
  const out = [];
  walkTokens(root, (t) => {
    const entry = {
      path: t.path,
      cssVar: cssVarName(t.path),
      value: stringifyValue(resolveValue(root, t.token.$value)),
      tier: t.tier,
      type: t.type,
    };
    if (t.dark !== undefined) entry.dark = stringifyValue(resolveValue(root, t.dark));
    out.push(entry);
  });
  return out;
}

export function toCssVars(root) {
  const list = tokenList(root);
  const rootBlock = list.map((t) => `  ${t.cssVar}: ${t.value};`).join('\n');
  const darkBlock = list
    .filter((t) => t.dark !== undefined)
    .map((t) => `  ${t.cssVar}: ${t.dark};`)
    .join('\n');
  return { root: rootBlock, dark: darkBlock };
}
