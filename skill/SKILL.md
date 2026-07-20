---
name: design-spec
description: Collaboratively author a professional, single-source-of-truth design specification at the start of a project and compile it into a human-viewable visual style guide, with anti-drift guardrails. Use when starting a new project that has any UI (web, desktop, mobile, or TUI), or when establishing/overhauling a design system.
---

# Design Spec Authoring

You are creating a single source of truth that serves both the agent (the `design/` source files) and the human (the compiled `design/styleguide.html`). The HTML is ALWAYS a build output — never hand-edit it. Advance one phase at a time and STOP at each checkpoint until the human visually approves.

## Setup
1. Copy this skill's `templates/` directory into the project as `design/`.
2. Confirm Node is available (`node --version`).
3. Do NOT skip phases and do NOT declare the spec "done" until every item in `reference/completeness-checklists.md` is satisfied.

## Rendering at every checkpoint
After writing spec files in a phase, run:
```bash
cd design && node render.mjs
```
Then tell the human: "Open `design/styleguide.html` in a browser and review [phase X]." Wait for approval before the next phase. Loop within a phase until they approve.

## Phase 0 — Direction
Interview the human on design principles and visual direction (brand adjectives, references, mood, light/dark intent). Fill `design/principles.md`. No visuals yet.

## Phase 1 — Foundations / tokens
Propose the primitive palette, type scale, spacing, radii, shadows, and motion timing. Write them into `design/tokens.json` (primitives flagged `tier: primitive`; theme variance via `$extensions["design-spec"].dark` on semantic tokens) and the rationale into `design/foundations/*.md`. Follow `reference/token-architecture.md`. **Checkpoint:** render; review swatches, ramps, and scales in both themes.

## Phase 2 — Components
Only after tokens are approved. Build `design/components/*.md` one cluster at a time (form controls, then surfaces, then feedback). Each component MUST meet the per-component checklist in `reference/completeness-checklists.md`, including full frontmatter (`purpose`, `variants`, `states`, `sizes`, `tokens`, `relationships`, `donts`) and at least one ` ```html render ` example using SEMANTIC tokens only. **Checkpoint:** render; review each variant×state matrix.

## Phase 3 — Patterns & layout
Fill `design/patterns/*.md` — page templates, navigation, forms, and empty/loading/error states. **Checkpoint:** render; review.

## Phase 4 — Content/voice, accessibility, governance
Fill `design/foundations/voice.md`, `design/foundations/accessibility.md` (follow `reference/accessibility.md`), and `design/governance.md`. **Checkpoint:** final review.

## Phase 5 — Lock & wire up
1. Run `cd design && node audit.mjs` to confirm a clean baseline (fix any hits).
2. Install the auto-regen hook: merge `design/settings.hook.json` into the project's `.claude/settings.json`.
3. Append `design/CLAUDE.section.md` to the project's `CLAUDE.md`.
4. Add `node design/render.mjs --check` to CI or a pre-commit hook.
Tell the human the spec is now the project's source of truth: edit `design/` source, never `styleguide.html`.

## Guardrails you enforce for the rest of the project
- Before any UI work, read the relevant `design/` files.
- Use semantic tokens only; never primitives, never raw values.
- After editing any `design/` file, re-run `node design/render.mjs`.
