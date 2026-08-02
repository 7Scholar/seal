# UX research: breadcrumb navigation, a project grid, and an environment-variables surface

Produced by following [the research procedure](../../../../../../../docs/UX_RESEARCH.md). This document is the design input for [the navigation plan](../README.md). It sits beside [shell-research.md](../../_docs/shell-research.md), which researched the sidebar shell this one replaces; where the two disagree, this one governs the navigation model and that one still governs the disclosure architecture, which survives the change.

# Concern

The product owner has withdrawn the sidebar shell and named the replacement precisely: Supabase's routing model — a breadcrumb trail in the header over full-width surfaces — with Supabase's project grid at the top altitude and Vercel's environment-variables surface at the bottom. Screenshots of the two Supabase surfaces were supplied as the reference.

So this is **not** an open design question about what navigation to build. The prior art is chosen, and the research question is narrower and more useful: **what exactly do those products do, which of it is load-bearing, and where does Seal's own posture force a divergence?** Copying a surface without knowing which parts carry its weight is how a redesign reproduces the look and loses the behaviour.

## Constraints this navigation cannot design around

Inherited and non-negotiable:

- **The window persists nothing.** The webview data store is memory-only ([shell.md](../../../shell.md)), so no route, no expansion, no scroll position and no sidebar width survives a restart. Every launch is a cold start and must be good on one.
- **The frontend never holds plaintext.** No surface may aggregate, preview, or batch secret values. A tile that previewed a repository's variables would defeat the architecture.
- **The exposed-file alert is resolved, never dismissed**, and its chrome scales to the count including zero.
- **Friction is spent exactly twice** — the first-seal acknowledgement and the password change. Navigation adds none.
- **Prose is a last resort.** A surface needing a sentence to explain itself is an insufficient surface ([the interface plan](../../README.md)).
- **Only env files are editable.** Everything else opens opaque.

# Sources surveyed

**Supabase's project grid** (screenshot supplied). A page-titled `Projects` over a toolbar row — search field, two filter/sort controls, a view toggle, and a primary `+ New project` button at the trailing edge — over a responsive grid of tiles. Each tile is a large, generous click target carrying the project name, a secondary line of metadata (`AWS | eu-north-1`), a small badge (`SMALL`, `MICRO`), and an **ellipsis control in the top-right corner** opening a menu of that project's secondary operations (`Copy project ID`, `Settings`). The tile has substantial empty space below its content — the tile is sized for presence and scannability rather than packed with information. Load-bearing: the whole tile navigates, the ellipsis is the only competing hit target inside it, and the primary add action is a button in the toolbar rather than a ghost tile in the grid.

**Supabase's breadcrumb switcher** (screenshot supplied). The header reads `<logo> / <org> PRO ⌄ / <project> ⌄ / <branch> PRODUCTION ⌄` with each segment followed by a small **chevron-up-down** glyph. Activating one opens a popover anchored under that segment holding a search field (`Find project...`), the list of siblings with a **checkmark against the current one**, and a pinned footer action (`+ New project`) visually separated from the list. Load-bearing: the switcher is per-segment rather than one global picker; the search field is focused on open; the current item is marked rather than merely highlighted; and the add action is inside the popover, so switching and creating are one gesture apart.

**Vercel's environment variables surface** is the named reference for the file altitude. Its durable shape: variables as rows with the key in monospace, the value masked behind a per-row reveal, per-row edit and delete behind a row-level control, a prominent add-variable affordance, and a save that commits a set of changes rather than each row independently. Its most-copied property is that the value column never shows plaintext until asked, per row, which is exactly the contract [screens.md](../../screens.md) already holds — so the existing editor is closer to the reference than to anything needing rework.

**Nielsen Norman Group on breadcrumbs** supplies the limits. Breadcrumbs are a **secondary** navigation aid and must never be the only way to move up a hierarchy; they should show the full path with the current page as the last, non-clickable element; they must not replace the primary navigation; and they earn their place only in hierarchies at least three levels deep — which is precisely Seal's depth (repositories → repository → file) and is why the pattern fits here rather than being fashion.

**Progressive disclosure canon and the toggletip/hover rules** carry over unchanged from [shell-research.md](../../_docs/shell-research.md): every disclosure is a real button with `aria-expanded`, dismissible on Escape, never a hover target; anything revealed on hover is revealed identically on focus; nothing is reachable only by hover.

**WAI-ARIA on the pattern this popover actually is.** A control opening a popover that holds a search field plus a list of options is not a `menu` and not a `listbox`: the authoring practices are explicit that a menu's items are commands, that a `menu` must not contain a text field, and that composing a filter field with a set of options is the combobox family's job. This matters because getting it wrong makes the search field unreachable for keyboard and screen-reader users — the arrow keys get captured by the menu's own roving focus.

# Findings

## Tier 1 — table stakes

- **A breadcrumb trail as the navigation, with the current segment inert.** The requested shape and NN/g's stated contract.
- **Per-segment switching, not one global picker.** Both the screenshot and the depth argue for it: the user's question is "which repository", not "where in the product".
- **The whole tile navigates**, with exactly one competing hit target inside it (the ellipsis). A tile whose navigation is only its title text is a tile-shaped list row.
- **A search field in each popover, focused on open**, and a substring filter over the sibling set.
- **The current item marked in the switcher list**, not merely styled.
- **A primary add action at every altitude that has one**, reachable from both the surface and the popover, and resolving to one flow.
- **The exposure alert reachable from wherever the user is.** The sidebar carried this and is gone; something in the persistent strip must take it. This is the one place where copying the prior art is insufficient, because neither Supabase nor Vercel has a safety state of this kind.
- **Full keyboard operability with a visible focus ring**, carried forward.

## Tier 2 — strong, high-value

- **A toolbar row above the grid** holding the search field and the add button, per the screenshot. Search over repositories is justified here where [shell-research.md](../../_docs/shell-research.md) refused it for the sidebar, because the grid shows every repository at once and a filter over a visible set is a different affordance from a filter over a hidden one.
- **Metadata lines on the tile** — the repository's path, its managed-file count, its state. This is where Seal's tile diverges usefully from Supabase's: the region and the plan size are replaced by the two facts that matter here, how many files are managed and whether any is exposed.
- **The ellipsis menu carrying the repository's secondary operations** — rescan, stop managing — which is 1Password's pattern from the earlier research and Supabase's from this one, converging.
- **Large row targets at the file altitude**, per the owner's "big and bulky", giving each file its name, its path, its state and its own row-level operations without crowding.

## Tier 3 — out of scope, with reasons

- **Persisting the route, the search text, or the grid's view mode.** Foreclosed by the memory-only webview, exactly as sidebar state was. Named so it is not re-proposed.
- **The grid/list view toggle** in Supabase's toolbar. A real affordance at dozens of projects; Seal's user has a handful of repositories, and a second layout to build and test buys nothing at that scale.
- **Sort and status filter controls.** Same reason. The grid is small enough to scan, and a sort control over six tiles is capability without a need.
- **A command palette.** Refused in the earlier research for the same reason and refused again here: the breadcrumb switchers now cover the one accelerator that mattered, switching repository without navigating.
- **Fuzzy matching in the switcher.** The sets are small; substring matching is predictable, and predictability beats cleverness when the user already knows the name they are looking for.
- **Cross-repository file switching** at the file segment. Supabase's equivalent segment lists one project's branches, not every branch everywhere. Noted as an open thread rather than built.

# Best-practice rules

1. **The breadcrumb is navigation, not decoration.** Every segment before the current one navigates. The current segment never does and carries no link affordance.
2. **Segments are never dropped to fit.** Truncate a segment's own text; dropping one makes an altitude unreachable.
3. **The switcher popover is a combobox-family control, never a `menu`.** It contains a text field, which a menu may not.
4. **Switching at one altitude leaves the altitudes above it untouched**, and navigating up discards what is below.
5. **One add flow per altitude**, whatever entry point started it.
6. **Disclosure never hides an alert, a state, or a consequence** — carried unchanged from the earlier research, and the reason the exposure indicator sits in the persistent strip rather than on a surface.
7. **Every launch is a cold start.** No route, filter, or scroll position is remembered; the default landing must be right every time.
8. **State language stays consistent** — sealed / readable / not found — across tile, row, breadcrumb and alert.

# Synthesis / proposal

**Three altitudes, one trail.** `Repositories / <repo> / <file>` in the title bar, each segment navigating, the repository and file segments carrying a chevron-up-down switcher, the root carrying none because it has no siblings.

**The repositories grid** is the Supabase project grid with Seal's facts on the tile: name, path, managed-file count, exposure state, and an ellipsis carrying rescan and stop-managing. A toolbar above it holds a search field and `+ Add repository`.

**The files surface** is a list of large rows, one per managed file, each carrying the file's name, its path within the repository, its state tag, and its own operations — with the repository's exposure alert above the list, unchanged in behaviour.

**The file surface** is the existing env editor, re-homed and given the whole window, or the opaque statement for a non-env file.

**The exposure indicator moves into the title bar strip**, because the sidebar that used to carry it is gone and the journey requires it be reachable from anywhere. This is the one genuine divergence from the prior art, and it is forced by Seal's posture rather than chosen.

## Load-bearing versus rounding out

Load-bearing: the trail with its inert current segment; per-segment switchers with search and a marked current item; whole-tile navigation; the exposure indicator in the strip; full keyboard operability.

Rounding out: the tile's metadata beyond the name; the toolbar search field; the grid's exact breakpoints; the row-level de-emphasis until hover.

## Out of scope, carried forward

Everything in Tier 3 with its reasons. The two most likely to be re-proposed are **persisting the route** — foreclosed by the webview, not an oversight — and **the grid/list toggle**, refused for scale rather than difficulty.
