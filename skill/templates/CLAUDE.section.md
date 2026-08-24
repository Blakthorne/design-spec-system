## Design System (source of truth: `design/`)

All UI work MUST follow the design spec in `design/`.

- **Read first:** before touching any UI, read the relevant files in `design/` (`principles.md`, `foundations/`, `components/`, `patterns/`).
- **Semantic tokens only:** use semantic tokens (e.g. `--color-action-primary`). Never use primitive tokens directly and never hardcode colors, spacing, or fonts.
- **Every control declares its cursor:** a styled `<button>`, `<select>`,
  `<input type="range">` or `<summary>` inherits `cursor: default` from the browser, so
  it reads as not clickable until the stylesheet says otherwise — `pointer` when it is
  clicked, `default` when disabled, `grab`/`grabbing` for a drag handle. A text field
  keeps its caret. `design/audit.mjs` enforces this per control family.
- **Never edit `design/styleguide.html`** — it is generated. Edit the source files in `design/` and run `node design/render.mjs`.
- **Verify:** `node design/render.mjs --check` must pass (guide in sync) and `node design/audit.mjs` must report no violations.
