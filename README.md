# Design Spec System

A reusable Claude skill that scaffolds a single-source-of-truth design spec into any
project and compiles it into a human-viewable visual style guide, with anti-drift guardrails.

## Install
```bash
./install.sh   # copies skill/ -> ~/.claude/skills/design-spec/
```

## Use
In a new project, invoke the `design-spec` skill and follow its phases. It scaffolds
`design/`, and at each checkpoint runs `node design/render.mjs` so you can review
`design/styleguide.html` in a browser.

## The scaffold
- `design/tokens.json` — DTCG tokens (primitive + semantic tiers, dark overrides).
- `design/{principles,governance}.md`, `design/foundations/*`, `design/components/*`, `design/patterns/*` — the spec source.
- `design/render.mjs` — compiles source → `styleguide.html` (`--check` gates drift).
- `design/audit.mjs` — flags untokenized values and direct primitive use in app code.

## Develop
```bash
node --test   # zero-dependency unit tests
```

## License
MIT — see [LICENSE](LICENSE).
