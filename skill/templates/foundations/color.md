## Color
[How color is organized: primitive ramps vs. semantic roles. State that components use semantic tokens only.]
[Document the semantic roles: action, feedback (error/success/warning/info), surface (background/text/border).]
[Contrast: all text ≥ 4.5:1; non-text UI ≥ 3:1 (WCAG 2.2 AA).]
[State layers: name the hover/pressed/selected washes and the surfaces they cover.]

### State layers are translucent, never a surface color
`action.hover-wash` and `action.pressed-wash` are alpha layers in **every** theme, and
the pressed one is stronger than the hover one. This is a rule, not a preference: a wash
is the *entire* signal for hover and press — no border moves, no label changes — so an
opaque wash is invisible on whichever surface happens to share its value. That is how
this template originally shipped (hover-wash was `stone.2`, which *is* `surface.subtle`;
pressed-wash was `stone.3`, which *is* `surface.sunken`), so hover on anything inside a
grouped or inset body did nothing at all in light mode. Contrast pairs cannot catch it —
they ask whether text is legible, not whether a state is distinguishable from no state.
`contrast.mjs` now measures every wash against every surface it can cover.

Set the light alphas so a wash lands on the CARD at the weight an opaque value would
have had; the surfaces that were broken then gain a real step for free.
