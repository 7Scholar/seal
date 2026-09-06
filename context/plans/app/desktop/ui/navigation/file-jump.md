Part of [the navigation plan](README.md).

# Scope

**Reaching a file from the trail without landing on its repository first.** The breadcrumb's menu as a two-level surface: repositories in the first panel, one repository's managed files as a tree in a submenu. Out of scope: the route and the trail's shape ([breadcrumbs.md](breadcrumbs.md)), and what the file altitude shows once reached ([file.md](file.md)).

# What & why

The trail's switcher moves **sideways** within an altitude — repository to repository, file to file. Crossing an altitude still costs the altitude: to open a file in another repository a user navigates to that repository, waits for its surface, and picks the file there.

The product owner has asked for the menu to reach **down** as well: hovering a repository in the switcher opens its managed files as a tree in a submenu, so a file in any repository is two gestures from anywhere. The same submenu carries the state language, which makes it a small answer to the product's central question as well as a navigation control — the menu shows what is sealed without the user going anywhere.

This also settles a question [the navigation plan](README.md) had left open — whether the file-level switcher should reach across all repositories or only the current one. It reaches across all of them, by reaching through the repository panel rather than by flattening the two lists into one.

This is a new navigation capability rather than a restyle of the switcher, which is why it does not ride the redesign's cosmetic work. It adds a surface that must fetch or hold every repository's file list, decide what it shows while that is unavailable, and behave when a repository holds more files than a menu can carry — none of which the flat switcher had to answer.

**Approved by the product owner.**

# Approach

**The data is already in hand, so the hard question the scope named does not arise.** A single observation carries every repository with its full file list — `RepoView.files` is not fetched per repository, it is part of the one snapshot the application already holds and already re-reads on every change. So the menu needs no fetch, no per-repository loading state, and no staleness rule of its own: it draws the same observation the screens draw, and it is as fresh as they are. This is the finding that makes the capability small.

**One menu, on the last crumb, with the same content everywhere.** The trail carries a single chevron at its end rather than one per segment, and what it opens does not depend on where the user is standing — every repository, and through each of them, every managed file. Only the marking of *current* changes with the route. This replaces all three of the flat switchers the trail used to carry, including the file-level one, which settles the question [the navigation plan](README.md) left open: the file switcher reaches across every repository, because it reaches *through* the repository panel rather than by flattening two lists into one.

**Down is a second panel, not a deeper list.** The first panel lists repositories, broken ones first — the same `brokenFirst` ordering the repositories screen uses, so the menu never disagrees with the surface behind it. Each row carries the repository's own state bar: red if any file's seal broke, copper if any file is sealed, faint otherwise. The second panel opens beside the repository under the pointer or the keyboard, and lists its managed files under their directories, each file wearing the state language exactly as the file line wears it — copper bar and wash when sealed, red bar and wash when the seal broke, faint bar when watched but not sealed, struck when gone from disk. **This is the part that makes the menu more than navigation:** a developer can see what is sealed across every repository without going anywhere.

**The submenu groups by directory; it does not recurse.** The repository screen draws a true tree, one row per folder level, because it has the width for it. The menu has 280px, so it draws one header row per directory that actually holds files, labelled with the whole path joined — `apps / app` — and its files indented a single step beneath. Every file therefore sits exactly one level down whatever its real depth, no row is ever pushed off the right edge, and a repository with deep paths reads no worse than a flat one. The headers collapse, because [the repository tree](../repo-layer/managed-view.md)'s folders collapse and the same chevron must mean the same thing in both places.

**The second panel top-aligns with the first, where the board offsets it to the hovered row.** This is a stated deviation and it exists because of a defect the board's own shape produced: with the submenu nested inside a row of a panel that scrolls, the panel's `overflow` clipped it, and the running application drew the second panel *inside* the first with the repository list nowhere on screen. Restoring the row offset means measuring the row and holding that measurement against scrolling and resizing — a live measurement to buy a cosmetic alignment. Two flush panels cannot drift and cannot be clipped, and the row the submenu belongs to is already marked by its own hover, focus and `aria-expanded`.

Worth recording because it is a shape lesson rather than a styling one: **every interface test passed while the first panel was invisible**, since the tests query the document and both panels were in it. Only a screenshot of the running application showed it.

**The menu carries no filter, and that removes nothing.** Both surfaces it reaches already filter on their own screens — the repositories list has one and the repository tree has one — so the only thing a filter here would add is a third way to do a thing that is done twice already. A jump control is for the case where the user knows where they are going. The panels scroll when they are long.

## Opening the submenu

The pointer opens it by hovering a repository, which is what the design draws. **The keyboard opens it with `ArrowRight` and closes it with `ArrowLeft`**, moving focus into and out of the second panel, which is the standard contract for a menu with submenus. `Escape` closes the whole thing and puts focus back on the chevron.

The keyboard path is not a fallback bolted on for compliance — it is the path the driven journey uses, because hover cannot be produced in the journey harness at all ([MEMORY.md](../../MEMORY.md) records why). So the interaction with automated proof behind it is the one a keyboard user takes, and the hover is the enhancement. That is the right way round: the affordance that can be verified is the one that must not break.

# What exists

All of it. `ui/components/JumpMenu.tsx` holds both panels; `groupByDirectory` in `ui/managedTree.ts` shapes the second one and `repoCondition` in `ui/state.ts` gives the first its bars, both living beside the vocabulary they extend rather than inside the menu. The three flat switchers and `ui/components/Switcher.tsx` are gone.

Nine interface tests cover the second panel and the keyboard, plus four across the trail's wiring and one on the shared disclosure contract.

# What the driven journey confirmed

**Driven end to end in the real application** as the last step of the [settling-in scenario](../../journey-harness.md), which is the one scenario holding two repositories. Standing inside the first, the user opens the trail's menu, arrows to the *other* repository, opens its files with `ArrowRight`, and presses `Enter` on the file — and the file altitude that arrives belongs to the second repository, which the run proves by the variable in it rather than by the trail alone. Nine of nine green. Confirmed non-vacuous by making `ArrowRight` do nothing: the second panel never appears and the step fails by name.

**The drive found a real defect, and it was the accessibility one this node claims not to have.** Activation was left to the native `<button>` behaviour under `role="menuitem"`, and the driver's synthesised `Enter` reached the row without activating it — the arrow keys worked, so the menu opened, walked and closed correctly while being impossible to actually *use* from the keyboard. Every interface test passed throughout, because the test library activates a button by clicking it. The menu now handles `Enter` and `Space` itself, which is what the menuitem role asks for and what the plain button role was quietly standing in for.

# Steps

- [x] Research solution directions
- [x] Build the menu: the two panels, the state language in both, the keyboard contract.
- [x] Retire the three flat switchers and the component behind them.
- [x] Tests: the second panel groups by directory, wears the conditions, and the keyboard reaches a file in a repository the user is not standing in.
- [x] Drive it in the real application by the keyboard path, and prove the drive non-vacuous.
