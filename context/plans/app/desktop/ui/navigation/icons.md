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

One component, `Icon`, holding a **path table keyed by name** and rendering a single `<svg>` on a fixed `0 0 20 20` grid with `currentColor` and a fixed stroke. Nothing else in the interface draws a glyph.

Hand-rolled rather than vendored. The set is small and closed — chevron-up-down, chevron-down, chevron-right, vertical ellipsis, check, plus, search, theme — and a dependency for eight paths would cost more in bundle and supply chain than it saves. Inline SVG also satisfies [the CSP](../../../shell.md) without a build step: nothing is fetched.

The glyphs are `aria-hidden` and `focusable="false"` throughout. Every one sits inside a control that already carries its own accessible name, so an icon that announced itself would double it.

The names are **what the icon is**, not what it does — `chevron-up-down`, not `switcher` — so one path serves every caller that needs that shape.

# What exists

All of the Approach. Every text character previously standing in for a glyph is replaced: the switcher's chevron, the overflow's ellipsis (now **vertical**, as the reference draws it, where it had been horizontal), the theme control's disc, both ticks, and the file tree's twisty. The search fields in the toolbar and the switcher popover gained the magnifier the reference carries, and the add actions gained a `+` — which let the literal `+` come out of their labels.

# Steps

- [x] The `Icon` component and its path table.
- [x] Replace every text glyph in the interface.
- [x] The reference's icons that were absent entirely: the search magnifier and the add `+`.
