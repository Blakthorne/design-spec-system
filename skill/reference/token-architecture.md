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

## State layers are alpha, not colors
A hover/pressed/selected **wash** must be `rgba(...)` in every theme. An opaque wash is
invisible on whichever surface shares its value, and since washes and quiet surfaces are
both drawn from the low end of the same neutral ramp, that collision is the DEFAULT
outcome, not an unlucky one — this template shipped with `hover-wash === surface.subtle`
and `pressed-wash === surface.sunken`, both exact. There is usually no free opaque step
between the page and its quiet surfaces, so a wash has to be a layer. `contrast.mjs`
enforces it by cross product (every wash × every surface, floor 1.03:1) plus an ordering
check that press reads stronger than hover.

## The AI-drift rule
Agents tend to grab primitives (`red.6`) instead of semantic tokens (`color.feedback.error`) unless told not to. Two defenses, both enforced: primitives are flagged `tier: primitive`, and `audit.mjs` fails the build on direct primitive use in app code.
