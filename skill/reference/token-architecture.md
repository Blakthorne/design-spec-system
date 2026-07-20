# Token Architecture

## Tiers
- **Primitive** — raw values (e.g. `color.primitive.blue.6`). Referenced only; NEVER used directly in components. Marked `tier: primitive`.
- **Semantic** — role-based (e.g. `color.action.primary`). This is what components reference.
- **Component** — only introduce for multi-brand / white-labeling. Most projects stop at two tiers (added overhead otherwise).

## Format
W3C Design Tokens (DTCG) JSON — first stable version 2025.10. Use `$value`, `$type`, groups, and `{alias}` references. Tier and dark overrides live under `$extensions["design-spec"]`.

## Dark mode / theming
Put theme variance at the **semantic** layer via `$extensions["design-spec"].dark`. The renderer emits it as `[data-theme="dark"]` overrides. Primitives stay theme-agnostic.

## Naming
Order path segments from general to specific: category → role → variant/scale (e.g. `color.action.primary`, `space.md`). CSS var = path joined with dashes (`--color-action-primary`).

## The AI-drift rule
Agents tend to grab primitives (`red.6`) instead of semantic tokens (`color.feedback.error`) unless told not to. Two defenses, both enforced: primitives are flagged `tier: primitive`, and `audit.mjs` fails the build on direct primitive use in app code.
