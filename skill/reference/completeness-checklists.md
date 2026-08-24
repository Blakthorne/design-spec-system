# Completeness Checklists

The spec is not "done" until every section below is present and visually approved.

## Canonical taxonomy (top-level sections)
- [ ] Design principles (the "why")
- [ ] Foundations / tokens: color, typography, spacing, layout/grid, iconography, motion, elevation, breakpoints
- [ ] Components
- [ ] Patterns: page templates, navigation, forms, empty/loading/error states
- [ ] Content / voice: voice vs. tone, action labels, writing-for-accessibility
- [ ] Accessibility: WCAG 2.2 AA, POUR-structured
- [ ] Governance: versioning, changelog, contribution

## Per-component "definition of done"
(Merges IBM Carbon's checklist with Nathan Curtis / EightShapes five sections.)
- [ ] Purpose (one sentence)
- [ ] Anatomy (annotated parts)
- [ ] Variants and sizes
- [ ] States: default, hover, focus, active/selected, disabled, read-only, error, warning, loading
- [ ] Behavior: responsiveness, overflow/reflow, expansion, scrolling
- [ ] Only tokenized values — no magic numbers, no primitive tokens used directly
- [ ] Usage ("Use When") and do's / don'ts (the `donts` frontmatter)
- [ ] Accessibility: focus flow, contrast, keyboard, target size
- [ ] At least one `html render` example using semantic tokens only
- [ ] Example is INTERACTIVE (reference CSS classes + native elements), not a static picture
- [ ] Component's color pairings added to `design/contrast.mjs` and passing in both themes
- [ ] Hover/pressed states are visible on EVERY surface the component sits on (`contrast.mjs` state-layer block), not just on the page
- [ ] Selected/hover/focus states change no geometry (no reflow on state change)
- [ ] The component DECLARES ITS CURSOR (`audit.mjs` enforces it per control family).
      Every native control — `<button>`, `<select>`, `<input type="range">`, `<summary>`
      — inherits `cursor: default` from the UA, so a styled control reads as not
      clickable until the stylesheet says otherwise. The omission is invisible in
      review: nothing is missing on screen, the pointer just never changes, which is
      why it needs a checklist line and a lint rather than an eye. Clicked things take
      `pointer` (disabled back to `default`, a drag handle `grab`/`grabbing`); a text
      field keeps its caret, and writing `pointer` on one is the opposite mistake
