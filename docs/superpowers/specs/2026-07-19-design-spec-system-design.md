# Design Spec System — Design Document

**Date:** 2026-07-19
**Status:** Approved (design phase)
**Author:** David Polar (with Claude)

## Problem

When starting new projects that have a UI (web, desktop, or otherwise), the design
specification and the visual style guide tend to drift apart. Two failure modes recur:

1. A precise, agent-readable spec (color palette, component system) is produced, but
   there is no visual style guide a human can see and give feedback on.
2. A human-viewable visual style guide exists, but it drifts from the machine-readable
   specification the agent actually follows.

The root need: a single source of truth that serves **both** the AI agent (machine-precise
spec) and the human (visual style guide) equally, with **zero drift** between them — created
collaboratively and locked down *before* project build begins, and enforced for the rest of
the project's life.

## Goals

- One authored source of truth; the human view is a *compiled output* of it, never a sibling document.
- Stack-agnostic: works for web, desktop (Electron/Tauri/native), mobile, or TUI.
- Covers the full canonical taxonomy of a professional design spec (see Research).
- Reusable across all future projects via a personal agent skill.
- Full guardrails: mandatory-consultation rules, auto-regeneration of the visual guide, and
  a code audit that catches spec-bypassing values.
- Guided, phased creation with visual checkpoints the human approves before anything locks.

## Non-Goals

- Not a framework-bound tool (no Storybook dependency, no per-stack lock-in).
- Not a runtime component library. It specifies the canonical look; platform code reproduces it.
- Does not itself guarantee an accessible product — it sets the bar and checks tokens/contrast,
  but per-service testing is still required (per GOV.UK guidance).

## Research Basis

Deep research (22 sources; 9 claims verified via 3-vote adversarial panels) across IBM Carbon,
GOV.UK, the Design System Checklist, EightShapes (Nathan Curtis), the W3C Design Tokens
Community Group, WCAG 2.2, and Figma's AI/MCP guidance. Key findings that shaped this design:

### Canonical taxonomy of a complete design spec
1. **Design principles** — the "why" behind decisions (documented first by the majors).
2. **Foundations / tokens** — color, typography, spacing, layout/grid, iconography, motion,
   elevation/shadow, breakpoints.
3. **Components**.
4. **Patterns** — page templates, navigation, forms, empty/loading/error states.
5. **Content / voice** — voice (constant brand personality) vs. tone (adapts per context),
   action labels, writing-for-accessibility (Carbon treats content as first-class).
6. **Accessibility** — WCAG 2.2 AA baseline, structured on POUR (Perceivable, Operable,
   Understandable, Robust).
7. **Governance / maintenance** — versioning, changelog, contribution rules.
8. **Commonly missed** — motion, localization/i18n, content/voice, dedicated a11y.

### Component completeness ("definition of done" per component)
Merging Carbon's checklist and Curtis's five-section model (Use When, Visual Style, Behavior,
Editorial, Accessibility):
- Anatomy (annotated parts), variants, sizes
- States: hover, focus, selected, disabled, read-only, error, warning
- Behavior: responsiveness, overflow/reflow, expansion, scrolling
- Only tokenized values — no "magic numbers" or untokenized colors (Carbon, explicit)
- Usage ("Use When"), do's and don'ts, editorial/content rules, accessibility (focus flow,
  contrast, keyboard)

### Token architecture
- Tiers: **primitive → semantic**, with **component tokens only** when multi-brand/white-label
  is needed (they add real overhead; most systems stop at two tiers).
- Use the **W3C Design Tokens (DTCG) format** — first stable version **2025.10**, released
  2025-10-28. Vendor-neutral JSON with `$value`/`$type`, groups, and aliases. Aliases and
  inheritance implement the tiers.
- Theming/dark mode lives at the **semantic layer**.
- WCAG 2.2 AA numbers the color tokens must satisfy: 4.5:1 for normal text (SC 1.4.3),
  3:1 for non-text UI/graphical objects (SC 1.4.11).

### The drift mechanism (most important finding)
When AI tools read tokens (e.g. via Figma's MCP), they grab raw **primitives** like `red.6`
instead of the correct **semantic** token like `color.feedback.error`, because nothing in a
typical token file signals that primitives aren't for direct use. The "agentic design system"
pattern prescribes shipping each component with machine-readable metadata — purpose, variants,
tokens, relationships, and **explicit anti-patterns** — so agents don't infer.

This yields three concrete mechanisms in the design:
1. Mark tier intent explicitly — primitives flagged "not for direct use"; components reference
   semantic tokens only.
2. The audit script flags primitive-token usage in component/app code, not just raw hex.
3. Component spec frontmatter includes explicit `donts`/anti-patterns.

## Chosen Approach

**Approach A — Personal agent skill + structured spec files + zero-dependency renderer.**

Rejected alternatives:
- **B — Single literate `DESIGN.md` + renderer.** Simplest, but at full professional scope it
  becomes a 2,000-line file; markdown tables are a mushy format for machine-precise values (a
  drift source); and the agent burns context re-reading the whole file for small changes.
- **C — Style Dictionary + Storybook.** Battle-tested and generates per-stack token outputs,
  but Storybook is framework-bound (contradicts stack-agnostic), heavy on dependencies, and
  covers neither the collaborative creation workflow nor the agent guardrails. Because Approach
  A uses the DTCG format, Style Dictionary can be bolted on later for any project needing
  generated Swift/Kotlin/Tailwind token files, without changing the source of truth.

## Architecture

Two halves: a **skill** installed once on the machine, and a **scaffold** it stamps into each
new project.

### The skill — `~/.claude/skills/design-spec/`
```
design-spec/
  SKILL.md          # The workflow: phases, checkpoints, rules the agent follows
  templates/        # The full per-project scaffold, ready to copy
  reference/        # Phase guides carrying the completeness checklists verbatim
                    #   (Carbon 6-point spec check, Curtis 5 component sections,
                    #    POUR + WCAG 2.2 AA numbers, token-tier rules)
```

### The per-project scaffold — `design/`
```
design/
  principles.md              # Design principles — the "why"
  tokens.json                # DTCG format; primitives flagged "not for direct use"
  foundations/
    color.md  typography.md  spacing.md  layout.md
    iconography.md  motion.md  elevation.md
    accessibility.md         # POUR structure, WCAG 2.2 AA numbers, focus flow
    voice.md                 # voice vs tone, action labels, writing-for-a11y
  components/*.md            # frontmatter: purpose, variants, states, sizes,
                             #   tokens, relationships, donts + ```html render examples
  patterns/*.md             # layout, navigation, forms, empty/loading/error states
  governance.md             # versioning, changelog, contribution
  render.mjs                # SOURCE -> styleguide.html compiler (zero deps)
  audit.mjs                 # token-bypass scanner for app code (zero deps)
  styleguide.html           # GENERATED — never hand-edited
```

Two integration points outside `design/`:
- A **CLAUDE.md** section making consultation of `design/` mandatory for all UI work.
- A **hook entry** in the project's `.claude/settings.json` for auto-regeneration.

### Source vs. object code
Everything above the `render.mjs` line is *source* — the shared truth for human and agent.
`styleguide.html` is *object code*. There is exactly one hand-authored representation of any
fact.

### Component spec file shape
```markdown
---
name: Button
purpose: Trigger a single, discrete action.
variants: [primary, secondary, ghost, destructive]
states: [default, hover, focus, active, disabled, loading]
sizes: [sm, md, lg]
tokens:
  background: color.action.primary      # semantic tokens only
  radius: radius.control
relationships:
  - "Pairs with Input in form footers"
donts:
  - "Never use more than one primary button per view."
  - "Never use a primitive color token directly (e.g. red.6)."
---
## Use When
...
## Anatomy
...
## Behavior
...
## Accessibility
...
## Example
​```html render
<button class="btn btn-primary">Save changes</button>
​```
```
Frontmatter gives the agent machine-precise facts and explicit anti-patterns; prose gives
judgment rules; the ` ```html render` blocks are the *same* markup the renderer injects into the
style guide, styled only by CSS variables generated from `tokens.json`. What the human sees is
literally the spec resolving.

## Mechanics — render / audit / sync

All three are zero-dependency Node (`.mjs`); they run in any project with only Node installed.

### `render.mjs` — the compiler (source -> styleguide.html)
1. **Tokens -> CSS variables.** Walk the DTCG file, resolve aliases (primitive -> semantic),
   emit `:root { --color-action-primary: ... }` plus a `[data-theme="dark"]` block from the
   semantic layer. This CSS is the *only* styling the guide's component examples use.
2. **Render sections.** Token swatches (name + resolved value), type ramp, spacing/radius/shadow
   scales; per component, frontmatter becomes a variant×state matrix and each ` ```html render`
   block is injected live into it.
3. **Banner + provenance.** File opens with a "GENERATED — do not edit; edit `design/` and
   re-run `render.mjs`" banner plus a content hash of the sources it was built from.

### `audit.mjs` — the compliance scanner
Scans configured app-source globs; exits non-zero on any violation (gates CI or a hook):
- Raw hex/rgb/hsl colors not traceable to a token
- Raw px/rem spacing outside the spacing scale
- Font families not in the type tokens
- **Primitive tokens used directly** in component/app code (the drift mechanism)

### sync — the anti-drift guarantee
- **File-change hook** in `.claude/settings.json` (PostToolUse on Edit/Write to `design/**`)
  runs `render.mjs` automatically, so `styleguide.html` is never stale after a spec edit.
- **`--check` mode** on `render.mjs` recomputes the source hash and fails if `styleguide.html`
  is out of date — dropped into CI or a pre-commit hook so a stale/hand-edited guide can't be
  committed.

The invariant: the HTML is *only ever* a build output, and both the hook and the check enforce
it. If the human view and the agent's source ever disagree, the check fails loudly.

## Guided Creation Workflow (SKILL.md)

Phases, each ending at a visual checkpoint the human approves before it locks. The skill will
not advance a phase without visual approval, and tracks a completeness checklist (the canonical
taxonomy) so it cannot declare the spec "done" with a section missing.

- **Phase 0 — Scaffold & direction.** Copy `templates/` into `design/`; interview on design
  principles and visual direction (brand adjectives, references, mood, light/dark intent).
  Output: `principles.md`. No visuals yet.
- **Phase 1 — Foundations / tokens.** Propose primitive palette, type scale, spacing, radii,
  shadows, motion timing into `tokens.json` (primitives flagged) and `foundations/*.md`
  rationale. **Checkpoint:** render; review swatches/ramps/scales in both themes. Loop to approval.
- **Phase 2 — Components.** Only after tokens lock. Build `components/*.md` in clusters (form
  controls, surfaces, feedback), each with full frontmatter incl. `donts` and render examples,
  held to the completeness bar. **Checkpoint:** render; review each variant×state matrix.
- **Phase 3 — Patterns & layout.** `patterns/*.md` — templates, navigation, forms,
  empty/loading/error states. **Checkpoint:** render; review.
- **Phase 4 — Content/voice, accessibility, governance.** Fill `voice.md`, `accessibility.md`,
  `governance.md`. **Checkpoint:** final review.
- **Phase 5 — Lock & wire up.** Run `audit.mjs` for a clean baseline; install the PostToolUse
  hook and CI `--check`; write the CLAUDE.md mandatory-consultation section. Spec becomes the
  project's source of truth.

## Key Properties (how this solves the original problem)

- **One source, both audiences.** Humans read `styleguide.html`; agents read `design/` source.
  The HTML is compiled from that source, so it cannot describe anything the source doesn't say.
- **Zero drift, enforced mechanically.** Auto-regen hook + `--check` gate make a stale or
  hand-edited guide impossible to keep.
- **Drift-at-authoring prevented.** Explicit token tiers + `donts` frontmatter + primitive-usage
  audit stop the agent from silently picking the wrong value.
- **Professional completeness.** The reference checklists hold every section to the bar set by
  Carbon, GOV.UK, EightShapes, and WCAG 2.2.
- **Reusable and stack-agnostic.** DTCG source + a portable renderer means the same system
  seeds any new project, on any stack, forever.

## Future Extensions (out of scope for v1)

- Style Dictionary integration for generated per-stack token files (Swift/Kotlin/Tailwind).
- Localization/i18n section in the scaffold.
- Optional MCP server exposing the spec to agents in other tools.
