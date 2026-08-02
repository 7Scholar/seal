Part of [the navigation plan](README.md).

# Scope

The **shared visual language** every surface in the interface draws from: the corner radius, the elevation and surface treatment, the spacing rhythm, and the colour tokens the themes resolve. Out of scope: what any individual surface arranges out of them, and the theme switching mechanism itself ([theme.md](theme.md)).

# What & why

Two forces landed on the same place. The product owner asked for a **larger corner radius everywhere** — `rounded-2xl` rather than `rounded-md`, named in Tailwind's vocabulary though this interface uses plain CSS — on buttons, cards, and everything else. Separately, [theme.md](theme.md) needs every colour in the interface to be a token that resolves per theme, which the stylesheet's hardcoded hex values did not allow.

Both are the same job: the interface's visual constants must live in one place and be referenced everywhere, rather than being repeated per rule.

# Approach

## The radius scale

Radii are tokens, not literals, and there are four:

- `--radius-sm` (`0.5rem`) — the smallest interactive things: checkboxes, the inline chevron control, a state pill.
- `--radius-md` (`0.75rem`) — inputs, and rows inside a list.
- `--radius-lg` (`1rem`) — buttons, popovers, menus, alerts, and list rows that are themselves targets. This is the `rounded-2xl` the owner asked for, and it is the interface's default radius.
- `--radius-xl` (`1.25rem`) — the large surfaces: tiles, cards, dialogs.

Nothing in the interface uses a literal radius. A surface that needs one it does not have gets a token, not a one-off value.

The one exception is a shape that is *definitionally* round rather than rounded — the circular icon buttons carrying the toggletip and overflow triggers keep `border-radius: 50%`, because they are circles and a token would make them squircles.

## Colour is tokens all the way down

Every colour the interface draws is one of a fixed set of semantic tokens — surface, raised surface, line, text, muted text, accent, accent text, danger, danger surface, and success — declared once and resolved per theme in [theme.md](theme.md). No rule names a hex value.

The tokens are **semantic rather than literal**: `--surface` rather than `--grey-900`, so a theme can invert the scale without every rule reading backwards. This is the property that makes a light theme possible at all without rewriting every rule.

## Elevation

Two levels and no more. A **raised** surface (tiles, rows, alerts, the toolbar) sits on the page background with a border and no shadow. A **floating** surface (popovers, menus, dialogs) carries a shadow whose colour is a token, because a shadow tuned for a dark theme is invisible on a light one and a shadow tuned for light is a smudge on dark.

## What this does not change

The layout of any surface, the copy on any control, and the behaviour of anything. This is the token layer only; a change here is visible everywhere and semantic nowhere.

# What exists

All of the Approach, in the stylesheet's token block and applied through it. Every radius in the interface is one of the four tokens or the deliberate `50%`, and every colour is a semantic token.

# Steps

- [x] Establish the radius scale as tokens and replace every literal radius.
- [x] Replace every hardcoded colour with a semantic token.
- [x] Establish the two elevation levels with a tokenised shadow.

# Open threads

- The radius scale was set from the owner's `rounded-2xl` reference against Tailwind's own scale rather than measured against this window's density. Worth a look once the redesigned surfaces have been lived in.
