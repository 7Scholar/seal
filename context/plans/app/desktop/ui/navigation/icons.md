Part of [the navigation plan](README.md).

# Scope

The interface's **icon system**: what draws a glyph, and how one is added. Out of scope: which icon any particular control carries, which stays with the plan owning that control.

# What & why

There is no icon system in the product. Every glyph in the interface is a **text character**, found by [the surface audit](_docs/surface-audit.md):

| Glyph | Where | Should be |
| --- | --- | --- |
| `⌃⌄` | `Switcher` trigger | chevron-up-down |
| `···` | `Overflow` trigger | horizontal ellipsis / kebab |
| `◐` | `ThemeControl` trigger | theme icon |
| `✓` | `Switcher`, `ThemeControl` | check |
| `▾` / `▸` | `FileTree` twisty | caret |

These are typographic characters standing in for icons. They inherit font metrics rather than sitting on a fixed optical grid, so they sit off the centre of their buttons; they render differently across fonts and platforms; and they cannot be sized or stroked to match the surface they sit on. The audit records this as a **systemic** cause of the amateur impression and one that is larger than any single control — the `⌃⌄` in the breadcrumb is the most visible instance, not the whole problem.

The reference the product owner supplied shows a real chevron-up-down icon in the position the `⌃⌄` occupies, so at least one of these is a stated reference deviation rather than an internal preference.

[A strict CSP blocks every external resource](../../../shell.md), so whatever this becomes is inlined or bundled — no icon font from a CDN, no remote sprite sheet. Inline SVG is the obvious route; whether to hand-roll the handful needed or vendor a small set is a maintainability judgement this node exists to make.

# Approach

TBD

# Steps

- [ ] Research solution directions
