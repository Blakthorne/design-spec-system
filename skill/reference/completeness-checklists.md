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
