---
name: Button
purpose: Trigger a single, discrete action.
variants: [primary, secondary, ghost, destructive]
states: [default, hover, focus, active, disabled, loading]
sizes: [sm, md, lg]
tokens:
  background: color.action.primary
  text: color.surface.background
  radius: radius.control
relationships:
  - "Pairs with Input in form footers."
donts:
  - "Never use more than one primary button per view."
  - "Never use a primitive color token directly (e.g. color.primitive.red.6)."
---
## Use When
Use a button to trigger an action. Use a link for navigation.

## Anatomy
Label (required), optional leading/trailing icon, container with control radius and semantic background.

## Behavior
Full-width on narrow viewports when in a form footer; label truncates with ellipsis before wrapping; loading state disables interaction and shows a spinner in place of the leading icon.

## Accessibility
Rendered as a native `<button>`; visible focus ring; disabled uses `aria-disabled`; loading sets `aria-busy="true"`; hit target ≥ 24×24 px.

## Example
```html render
<button style="background:var(--color-action-primary);color:var(--color-surface-background);border:0;border-radius:var(--radius-control);padding:var(--space-sm) var(--space-md);font-family:var(--font-body)">Save changes</button>
```
