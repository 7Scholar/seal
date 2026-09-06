Part of [the navigation plan](README.md).

# Scope

The **shared visual language** every surface in the interface draws from: the corner radius, the type scale, the row metrics, the elevation and surface treatment, the spacing rhythm, and the colour tokens the themes resolve. Out of scope: what any individual surface arranges out of them, which colour each token is set to ([palette.md](palette.md)), and the theme switching mechanism itself ([theme.md](theme.md)).

# What & why

The interface's visual constants must live in one place and be referenced everywhere rather than repeated per rule. That is what [theme.md](theme.md) needs in order to resolve a colour per theme at all, and it is what lets the product owner restate the whole visual language by changing a token block rather than every surface.

# Approach

## The radius scale

Radii are tokens, not literals, and they collapse to three values across four names:

- `--radius-sm` (`2px`) — the smallest interactive things: checkboxes and inline controls.
- `--radius-md` and `--radius-lg` (`3px`) — buttons, inputs, popovers, menus, alerts, and rows that are themselves targets. This is the interface's default radius.
- `--radius-xl` (`6px`) — the largest surfaces: dialogs.

**There is no pill anywhere in the application.** A fully rounded shape reads as a badge, and the state language says states with a bar in the row's own margin rather than with a badge inside it — so a pill would be a second, competing vocabulary for the thing the design is most careful about.

Nothing in the interface uses a literal radius. A surface that needs one it does not have gets a token, not a one-off value.

The one exception is a shape that is *definitionally* round rather than rounded — the circular icon buttons carrying the toggletip and overflow triggers keep `border-radius: 50%`, because they are circles and a token would make them squircles.

## The type scale

**Geist for prose, Geist Mono for everything the machine owns** — paths, filenames, variable names, hex values, and the tracked section labels. The split is the rule rather than a preference: a filename set in the same face as a sentence invites a reader to read it as one, and every string in this product that a machine will match on is set in the mono.

Eight sizes, each with one job: `--text-xs` (`10.5px`, tracked `0.18em`) for section labels, `--text-sm` (`11.5px`) for repository paths, `--text-note` (`13px`) for secondary prose and menu items, `--text-base` (`14px`) for body over `--leading-body` (`22px`), `--text-row` (`13.5px`) for the file line and the variable line, `--text-md` (`17px`) for dialog and section headings, `--text-lg` (`22px`) for a repository name, and `--text-xl` (`36px`) for the largest heading the application draws.

Tracking is a token too: display sizes take `--tracking-display` (`-0.035em`), a repository name `--tracking-name` (`-0.02em`), and small-caps labels `--tracking-label` (`0.18em`).

Both faces are **vendored as `woff2`** into `ui/fonts/` rather than fetched — the application is offline and [the CSP](../../shell.md) blocks every external resource — with the SIL Open Font License text carried beside them.

## The row metrics

The three row heights the interface repeats are tokens, because a surface that invents its own breaks the rhythm the state bar depends on: `--row-file` (`46px`), `--row-repo` (`72px`), `--row-var` (`44px`). The state bar is `--bar` (`3px`) wide and `--bar-rest` (`22px`) tall at rest. Icons are `16px` on a `20` grid at `1.8` stroke, and the window gutter is `--gutter` (`28px`).

## Colour is tokens all the way down

Every colour the interface draws is one of a fixed set of semantic tokens, declared once and resolved per theme in [theme.md](theme.md). No rule names a hex value. Which colour each token holds, and the rule governing where each may appear, is [palette.md](palette.md)'s.

The tokens are **semantic rather than literal**: `--surface` rather than `--grey-900`, so a theme can invert the scale without every rule reading backwards. This is the property that makes a light theme possible at all without rewriting every rule.

## Elevation

Two levels and no more. A **raised** surface (rows, alerts, the toolbar) sits on the page background with a border and no shadow. A **floating** surface — a menu or a popover, and nothing else — carries `--shadow`, the one shadow in the application. It is a single value across both themes because the floating surface also carries a full-strength border, which is what actually separates it from the page; the shadow only softens the separation, so a shadow tuned per theme would be tuning something the border already does.

## What this does not change

The layout of any surface, the copy on any control, and the behaviour of anything. This is the token layer only; a change here is visible everywhere and semantic nowhere.

# What exists

All of the Approach, in the stylesheet's token block and applied through it. Every radius in the interface is one of the tokens or the deliberate `50%`, every colour is a semantic token, and the two typefaces load from the bundle in a build with no network.

# Steps

- [x] Establish the radius scale as tokens and replace every literal radius.
- [x] Replace every hardcoded colour with a semantic token.
- [x] Establish the two elevation levels with a tokenised shadow.
- [x] Collapse the radii, add the type and row-metric scales, and vendor the two typefaces.

# Open threads

- The vendored `woff2` files carry the Latin and Latin-Extended subsets only. A path or a variable name outside those ranges falls back to the platform face, which is correct behaviour but has not been seen.
