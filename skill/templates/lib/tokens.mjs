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

export function resolveValue(root, value) {
  if (typeof value === 'string' && /^\{[^}]+\}$/.test(value)) {
    const target = lookupToken(root, value);
    if (!target || !('$value' in target)) {
      throw new Error(`Unresolved alias: ${value}`);
    }
    return resolveValue(root, target.$value);
  }
  return value;
}

export function tokenList(root) {
  const out = [];
  walkTokens(root, (t) => {
    const entry = {
      path: t.path,
      cssVar: cssVarName(t.path),
      value: resolveValue(root, t.token.$value),
      tier: t.tier,
      type: t.type,
    };
    if (t.dark !== undefined) entry.dark = resolveValue(root, t.dark);
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
