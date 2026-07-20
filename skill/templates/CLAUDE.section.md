## Design System (source of truth: `design/`)

All UI work MUST follow the design spec in `design/`.

- **Read first:** before touching any UI, read the relevant files in `design/` (`principles.md`, `foundations/`, `components/`, `patterns/`).
- **Semantic tokens only:** use semantic tokens (e.g. `--color-action-primary`). Never use primitive tokens directly and never hardcode colors, spacing, or fonts.
- **Never edit `design/styleguide.html`** — it is generated. Edit the source files in `design/` and run `node design/render.mjs`.
- **Verify:** `node design/render.mjs --check` must pass (guide in sync) and `node design/audit.mjs` must report no violations.
