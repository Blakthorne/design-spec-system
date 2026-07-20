# Accessibility Reference

Baseline: **WCAG 2.2 Level AA**. Structure the spec's accessibility content on POUR.

## Concrete numbers to enforce
- Text contrast ≥ **4.5:1** (SC 1.4.3); large text ≥ 3:1.
- Non-text UI components and graphics ≥ **3:1** against adjacent colors (SC 1.4.11).
- Interactive target size ≥ **24×24 CSS px** (SC 2.5.8).
- Visible focus indicator on every interactive element.

## Per component, verify
- Keyboard operable (all actions reachable and triggerable).
- Correct semantics / ARIA (native elements first).
- Focus order documented ("flow of focus").
- Screen-reader sanity check before marking "done".

## Limit of coverage
Adopting this spec does not by itself make a product accessible (per GOV.UK). Per-service research, design, and testing are still required.
