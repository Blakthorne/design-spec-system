---
name: design-spec
description: Collaboratively author a professional, single-source-of-truth design specification at the start of a project and compile it into a human-viewable visual style guide, with anti-drift guardrails. Use when starting a new project that has any UI (web, desktop, mobile, or TUI), or when establishing/overhauling a design system.
---

# Design Spec Authoring

You are creating a single source of truth that serves both the agent (the `design/` source files) and the human (the compiled `design/styleguide.html`). The HTML is ALWAYS a build output — never hand-edit it. Advance one phase at a time and STOP at each checkpoint until the human visually approves.

## Interaction contract (this is a collaboration, not a commission)
The human is the designer; you are the hands. The failure mode to avoid: doing a phase
solo and presenting finished work for rubber-stamping.

- **Craft vs choice.** Mechanical correctness — contrast ratios, alignment, WCAG floors,
  layout-stability, naming consistency — is craft: just do it right. Anything with
  TASTE — hue families and ramp warmth, accent colours, radius character, density (type
  size, row heights), heading style, motion feel, voice register, component visual
  treatments — is a choice: **ask before writing it into the spec**.
- **Before each phase**, list that phase's decisions and ask about them (AskUserQuestion
  with 2–4 concrete options and a recommendation). Only then write.
- **Visual choices get rendered options**, not prose descriptions: build a small
  self-contained mockup (fonts embedded, tokens applied, real hover states) and let the
  human pick from what they can see. Same-genre options need large stacked specimens.
- **Every checkpoint message ends with a "Decisions I made without asking" list** —
  anything opinionated you defaulted — inviting veto while it is still cheap.
- When the human pushes back, treat their eye as data ahead of any passing check.

## Setup
1. Copy this skill's `templates/` directory into the project as `design/`.
2. Confirm Node is available (`node --version`).
3. Do NOT skip phases and do NOT declare the spec "done" until every item in `reference/completeness-checklists.md` is satisfied.
4. Fill `design/guide.json` (title, subtitle) — it brands the styleguide's header.
5. The starter `tokens.json` ships a full proven taxonomy with placeholder values — Phase 1 replaces values, not structure.

## Rendering at every checkpoint
After writing spec files in a phase, run:
```bash
cd design && node render.mjs && node contrast.mjs && node contrast.mjs --dark
```
Then VERIFY BY RENDERED PIXELS before telling the human anything works: open the page in a real browser (headless is fine), operate the interactive examples, and eyeball a screenshot. Computed styles and font-load events both lie — only rendered output counts. Then tell the human: "Open `design/styleguide.html` in a browser and review [phase X]." Wait for approval before the next phase. Loop within a phase until they approve.

The styleguide is the design system's first product: its chrome is built from the tokens, so it restyles itself as tokens change. Never let it degrade to unstyled HTML.

## Phase 0 — Direction
Interview the human on design principles and visual direction (brand adjectives, references, mood, light/dark intent). Fill `design/principles.md`. No visuals yet.

## Phase 1 — Foundations / tokens
ASK FIRST (rendered options where visual): neutral ramp temperature (warm/cool/pure),
accent strategy, radius character (sharp/soft/round), density (base type size + control
heights), typeface candidates (mockup), motion feel. Then propose the primitive palette,
type scale, spacing, radii, shadows, and motion timing. Write them into `design/tokens.json` (primitives flagged `tier: primitive`; theme variance via `$extensions["design-spec"].dark` on semantic tokens) and the rationale into `design/foundations/*.md`. Follow `reference/token-architecture.md`.

Contrast is verified, not asserted: `design/contrast.mjs` reads tokens.json and asserts every documented pairing (text ≥4.5:1; controls, focus rings and state markers ≥3:1 per SC 1.4.11) in BOTH themes. Update its PAIRS as you write tokens; a component added later adds its pairs.

Typeface decisions: compare candidates in context with a rendered mockup (embed woff2 as data URIs — never a CDN link, it fails silently offline). Same-genre faces converge at UI size, so compare with large stacked specimens and a disambiguation set (`1lI| 0O a g`), not side-by-side UI columns. Self-host chosen faces via `design/fonts/fonts.css` + woff2 files in `design/fonts/`.

**Checkpoint:** render; review swatches, ramps, and scales in both themes.

## Phase 2 — Components
Only after tokens are approved. ASK FIRST: the component inventory (which components,
grouped how), and any component whose visual treatment has real alternatives (buttons,
selection states) gets a rendered options mockup. Then build `design/components/*.md` one cluster at a time (form controls, then surfaces, then feedback). Each component MUST meet the per-component checklist in `reference/completeness-checklists.md`, including full frontmatter (`purpose`, `variants`, `states`, `sizes`, `tokens`, `relationships`, `donts`) and at least one ` ```html render ` example using SEMANTIC tokens only.

Examples are INTERACTIVE, not pictures of states: build them on the reference implementation in `design/interactive/components.css` (+ minimal `components.js`), which render.mjs inlines into the styleguide. Native elements first — `details` for disclosure, radios for chips/segments/tiles, real checkboxes and range inputs; JS only for what HTML cannot do. This stylesheet is written so the real app can adopt it wholesale — that is the anti-drift endgame.

**Checkpoint:** render; operate every control; review each variant×state matrix.

## Phase 3 — Patterns & layout
Fill `design/patterns/*.md` — page templates, navigation, forms, and empty/loading/error states. **Checkpoint:** render; review.

## Phase 4 — Content/voice, accessibility, governance
ASK FIRST: voice register (adjectives + a sample error/confirmation written in it) and
governance ownership. Then fill `design/foundations/voice.md`, `design/foundations/accessibility.md` (follow `reference/accessibility.md`), and `design/governance.md`. **Checkpoint:** final review.

## Phase 5 — Lock & wire up
1. Run `cd design && node audit.mjs` to confirm a clean baseline (fix any hits).
2. Install the auto-regen hook: merge `design/settings.hook.json` into the project's `.claude/settings.json`.
3. Append `design/CLAUDE.section.md` to the project's `CLAUDE.md`.
4. Add `node design/render.mjs --check && node design/contrast.mjs && node design/contrast.mjs --dark && node design/audit.mjs` to CI or a pre-commit hook.
Tell the human the spec is now the project's source of truth: edit `design/` source, never `styleguide.html`.

## Guardrails you enforce for the rest of the project
- Before any UI work, read the relevant `design/` files.
- Use semantic tokens only; never primitives, never raw values.
- After editing any `design/` file, re-run `node design/render.mjs` (and `contrast.mjs` if colour moved).

## Hard-won rules (each one cost a review round)
- **Never `var()` inside the `font` shorthand** — Safari drops the whole declaration silently. Longhand `font-family: var(...)` only.
- **Selection may never change geometry** — no weight changes or border-width changes on selected states; swap colours on constant-size properties.
- **A validation message may never move the control it describes** — messages render below in flow; control rows align to their tops.
- **Text colours and fill colours are different jobs** — a bright dark-theme error TEXT fails as a button FILL; give fills their own tokens.
- **Prose is lean** — rules, tables, one-line rationales. The spec is a reference, not an essay; cut narrative on every pass.
- **No ASCII box diagrams** — box-drawing glyphs fall back to a different-width font and misalign. Use prose or SVG.
- **Wide styling states over hand-tuned offsets** — set `box-sizing: border-box` in the reference CSS (host pages may lack a reset) and centre with layout, not magic `top` values.
- **The user's eye beats your passing check.** When they say it looks wrong, measure the rendered pixels before defending the code.
