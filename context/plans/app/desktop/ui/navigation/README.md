Part of [the interface plan](../README.md).

# Intent

## What & why

The interface's **navigation model**: how a user moves between the repositories Seal manages, the files inside one, and the contents of one file — and what each of those three altitudes shows.

The product owner has replaced the shell's navigation. The two-column frame [shell-layout.md](../shell-layout.md) built — a persistent repository sidebar beside a detail surface — is withdrawn. In its place: a **breadcrumb trail in the title bar** as the only navigation chrome, over **three full-width surfaces**, one per altitude:

- **Repositories** — every managed repository as a large tile in a grid, with a search field and an ellipsis menu per tile.
- **Files** — one repository's managed files as a list of large rows.
- **File** — one file's contents, which for an env file is the per-variable editor.

Each breadcrumb segment at the repository and file level carries a chevron-up-down control opening a popover with a search field, the sibling options, and an add action — so a user switches repository or file without navigating back up.

The named prior art is deliberate rather than invented: **Supabase** for the project grid and the breadcrumb switcher, **Vercel** for the environment-variables surface. The product owner supplied screenshots of both Supabase surfaces as the reference.

Why this replaces what exists: the sidebar spends a permanent column on navigation that is only occasionally used, and it forces every altitude through one cramped two-level tree. Giving each altitude the whole window lets that altitude's own management surface be complete — which is the property the owner is buying, and the reason the change is worth the rework it costs.

**This node owns the shell and the navigation.** What each surface shows in detail is its child's concern; the surfaces' *existing* internals stay owned by the plans that already hold them — the env editor and the manage flow by [screens.md](../screens.md), the failure surface by [errors.md](../errors.md), the unlock gate by [first-open.md](../../first-open.md).

Done means: a user reaches every altitude by breadcrumb and by tile or row, switches repository and file from the breadcrumb popovers, and no surface in the product still renders the sidebar.

## Approach

Built from [_docs/navigation-research.md](_docs/navigation-research.md), which surveys the named prior art and fixes the behavioural rules; this Approach states what follows from it.

### One route, three altitudes

Navigation is a **route** — `repositories`, `repository`, or `file` — held in interface state, never in a URL and never persisted, since [the window persists nothing](../../shell.md). Every launch lands on `repositories`.

The route is the single source of what the window shows. There is no selection model beside it and no mode: opening a repository *is* navigating to it. This is the substantive difference from the withdrawn sidebar, where selection and expansion were separate axes over one persistent frame.

Navigating **up** discards the altitude below it: leaving a file closes it, which is the same explicit close the file surface already performs. Navigating **down** or **sideways** at the same altitude is one act — the breadcrumb popover switches repository without passing through the repositories grid.

### The title bar carries the trail, and is the window's drag surface

The title bar holds the breadcrumb trail at its leading edge, after the inset the platform's window controls occupy, and the session controls at its trailing edge — Lock, the theme control, and the overflow disclosing the master-password change. The product name is gone from the strip: the trail's first segment states where the user is, and a brand word beside it is chrome that says nothing.

The strip is also the window's **drag region**, which it was not before ([title-bar.md](title-bar.md) owns that behaviour and the interactive-child exclusion it needs).

### The shell owns the window, and every surface renders inside it

**The shell is unconditional.** It always draws the strip and is always the element that sets the window's height; a surface is content *within* it, never a replacement for it. The product owner's instruction is that the header is present on every page, and this is the shape that makes that structural rather than remembered: there is no way to render a surface that skips the strip, because no surface draws the frame itself.

This governs the whole window, not only the trail. `.shell` is the sole `100vh` element, so a surface asking to fill the window resolves its height against the shell's main region — which is what lets the manage surface be a fixed frame with one scrolling region rather than a document that flows.

**The strip's contents vary; its presence does not.** The trail and the session controls belong to an unlocked session at an altitude, so the locked screen and the two overlay surfaces carry a **bare** strip: the drag region and the window-control inset, and nothing else. A bare strip draws no background and no divider, because a surface designed to fill the window — the unlock shield — must not be cut by an opaque bar it did not ask for. The shield's own gradient is drawn by the shell in that state so it reaches behind the strip rather than starting below it.

### The trail's shape

The trail reads `Repositories / <repo> / <file>`, truncated from the left of each segment's own text rather than by dropping segments — the segments are the navigation, so a dropped one is an unreachable altitude.

Every segment is a control. A segment before the current one navigates to that altitude. The current segment does not navigate, and carries no link affordance.

The repository and file segments each carry a **chevron-up-down** control immediately after the segment's text, opening the switcher popover. The `Repositories` root has no chevron: its siblings are nothing, and a popover over an empty set is a control that lies about having options.

### The switcher popover

One component, used at both levels. It holds a search field focused on open, the filtered list of siblings with the current one marked, and a single add action pinned at the foot — **Add repository** at the repository level, **Add file** at the file level. The list filters as the user types, on a plain case-insensitive substring of the name; there is no fuzzy ranking, because the sets are small enough that ordering by anything but the user's own list order costs recognition.

It is a `dialog`-less popover owned by the same disclosure contract every other collapsed thing in this interface follows: a button carrying `aria-expanded`, dismissed on Escape and on an outside click, with focus returning to the trigger. It is **not** a `<select>` and not a native menu, because it holds a search field.

Choosing a sibling navigates at the current altitude and leaves every altitude above it untouched. Choosing the add action starts the same add flow the surface offers, so there is exactly one add path per altitude rather than one per entry point.

### Where the cross-repository alert lives now

The sidebar was the carrier for an alert about a repository the user is not looking at, and it is gone. That carrier moves to the **title bar**: an exposure indicator sits in the strip whenever any repository holds an exposed file, states the count, and navigates to the first such repository. It is present at every altitude because the strip is, which is the property the sidebar was chosen for in the first place, and it renders nothing at all when the count is zero.

This is not a relaxation of the rule it serves. [The exposure journey](../../../../../journeys/exposure.md) requires the product to raise an exposure *wherever the user happens to be* and forbids indicating it only somewhere they might not look; the strip is now the only element satisfying that. The per-repository alert on the files surface, with its inline seal action, is unchanged.

The alternatives were a full-width banner beneath the strip and an alert confined to the repositories grid. The banner was refused because a consequence that appears on every surface and displaces the content beneath it becomes wallpaper, which is the failure the product's proportionality rule exists to prevent; the grid-only form was refused because it tells a user working inside one repository nothing about another, which is the exact shape the journey forbids.

### What each surface owns

Three children, one per altitude, each owning its surface's layout and operations: [repositories.md](repositories.md), [files.md](files.md), [file.md](file.md). This node owns the shell they sit in — the strip, the trail, the popover, the route — and nothing inside them.

### What this withdraws

[shell-layout.md](../shell-layout.md) keeps its disclosure architecture, its selection-stability rule as it applies within a surface, its batch seal, and its repository removal — all of which outlive the frame. What it loses is the two-column frame and the sidebar tree, which this node replaces and its Approach now records as withdrawn.

# Plans

- [x] _docs/navigation-research.md -> the prior-art survey and the behavioural rules (a supporting doc, not a child)
- [x] title-bar.md -> the title bar as a real window control surface: drag, double-click zoom, and the interactive-child exclusion
- [x] theme.md -> light, dark and system themes, the switcher, and the persistence the memory-only webview cannot provide
- [x] breadcrumbs.md -> the trail, the switcher popover, and the route. Every segment carries a switcher, including the root, whose empty form is what a fresh install meets.
- [~] repositories.md -> the repositories grid: tiles, search, per-tile ellipsis, add. **States beyond populated are undesigned; the empty state is a different visual language.**
- [x] files.md -> one repository's files as large rows, with the repository's operations. Every state it can occupy is built and driven; the empty repository and loading are settled as not reachable.
- [x] file.md -> the file altitude, and the env editor re-homed into it. Every state it can occupy is built and driven, including the frame that makes a file of any size editable.
- [x] shape.md -> the shared visual language: the radius, the surfaces, and the tokens the themes resolve
- [x] _docs/surface-audit.md -> the audit of the four built surfaces (a supporting doc, not a child)
- [x] states.md -> the states beyond populated, for all three altitudes. Every state each surface can occupy is designed and built, or recorded as not reachable with its reason.
- [x] icons.md -> an icon system, replacing the text characters standing in for glyphs throughout the interface
- [x] disclosure-primitive.md -> one implementation of the disclosure contract, as a hook the four collapsed controls call. The switcher's divergence is closed.
- [x] manage-surface.md -> the manage surface carried to the grid's depth. **Every audit finding is built, and the last one — the relock that discards a live selection — was pursued to a reproduction and found not to be a defect.**
- [x] palette.md -> the chosen palette — a white, a black, an accent and a primary — and the role rule governing where each appears
- [x] freshness.md -> when the product re-observes disk, and how it answers "is everything protected?" at a glance. Built and driven; the owner's answer to the positive statement was *nothing*, so none is drawn.

# Cursor

**The navigation model is in place and its surfaces are not finished.** The route, the trail, the switcher, the three altitudes, the themes and the title bar all work and are driven; what was not done is the depth each surface deserved. The product owner reviewed the running application and found it reads as amateur, for two reasons that are recorded here rather than in a review that will be lost:

- **The reference was not matched.** The switcher exists but the `Repositories` root carries no chevron at all — so on the landing screen, the one screen a new user sees, there is no switcher and no way to add a repository from the trail, which is the affordance the supplied screenshot showed. The chevron glyph is two stacked ASCII carets rather than an icon. The Approach below rationalised the missing root switcher ("a popover over an empty set is a control that lies about having options"); that reasoning is wrong, because the popover also carries **+ Add repository**, which is precisely what an empty product needs.
- **Only the populated state was designed.** The repositories grid returns a centred heading, a paragraph and a button when empty — a different visual language from the grid it replaces, where an add-repository tile would have kept one. The other states (excessive, loading, error, partial) were never enumerated for any of the three surfaces.

Neither failure was caught by a test, a journey, or the drive: all of them passed. That is what [docs/plans/SURFACE_AUDIT.md](../../../../../../docs/plans/SURFACE_AUDIT.md) now exists to catch, and the instructions that permitted it have been changed ([INSTRUCTIONS.md](../../../../../../docs/plans/INSTRUCTIONS.md) on parts-and-depth, [UX_RESEARCH.md](../../../../../../docs/UX_RESEARCH.md) on states and reference fidelity).

**The audit is done and nothing is fixed.** [_docs/surface-audit.md](_docs/surface-audit.md) records every state of the four surfaces as seen in the running application, with the reference-fidelity pass explicitly incomplete because the supplied screenshots are no longer in the repository. Its findings are framed as three children: [states.md](states.md), [icons.md](icons.md) and [disclosure-primitive.md](disclosure-primitive.md).

The audit's most severe finding was not in the brief that ordered it: **the repositories grid reports the user's data as absent while it is loading, and permanently if the load fails**, because empty, loading and failed are the same screen and that screen says *"Seal manages nothing yet"*. A returning user meets it on every launch. It is recorded in [states.md](states.md).

**The repositories grid is finished to production depth, and the other three surfaces are audited and framed.** The product owner re-supplied the reference and settled the empty state, which unblocked the build:

- **Every state the grid can occupy is designed, built and seen running** — empty, one, populated, excessive, loading, error and no-match. The empty state is now an **add tile inside the grid**, so the surface is one visual language at every count, and the explanatory paragraph is gone.
- **The loading and error states did not exist**, which is why the grid reported the user's data as absent while it loaded and permanently if it failed. Both now exist, and reintroducing either defect fails a test.
- **Tiles are a fixed height.** Measured in the running application: the 120-character name that used to make its tile 283px against its neighbours' 177px now measures 177px like every other.
- **The interface has an icon system** ([icons.md](icons.md)): every text character standing in for a glyph is now an inline SVG, including the `⌃⌄` the reference showed as a chevron-up-down, and the tile ellipsis is vertical as the reference draws it.

**The files list has since been carried through the same pass, and it is where the depth work now stands.** Three of its defects are fixed, driven and guarded, and two of its states resolved to something other than "build it" — which is recorded rather than quietly skipped:

- **The silent disable is gone.** A `missing` file's open control was disabled with nothing said about why — measured in the running application against a file genuinely deleted from disk while the window sat open. It now states that Seal cannot open it because it is no longer at that path, tied to the control by `aria-describedby` so the reason reaches a screen reader as the control's own.
- **The surface states its managed-file count**, the fact the tile already carried one altitude up.
- **A failed re-read is stated rather than hidden.** Every operation here re-reads the overview when it finishes; that call can fail, and the surface kept showing the rows it already had while saying nothing at all. It now says the contents are what Seal last saw, that the files are untouched and still sealed, and offers a retry — with the rows still visible, because stale information a user is told is stale beats a blank screen. This is the files-list form of the defect the grid had.
- **There is no empty repository**, and the markup that drew one is gone. A repository is deleted when its last file is released, the manage flow refuses an empty selection, and a rescan only adds. The owner settled the fork this raised: a repository exists only as a non-empty set of managed files, and a user who releases every file has stopped managing it — so the grid, not an empty list, is the surface that describes where they are.
- **The files list needs no loading state.** Every launch lands on the grid, and both paths that could leave the route here with nothing loaded navigate back up instead — so the surface is only ever reached with its data in hand. Building a skeleton would guard a state that cannot occur.

**`files.md` is now `[x]`.** Both of those are the first cases in this tree where a state on the enumeration resolved to *not reachable* rather than to a treatment, which is a real outcome rather than a skipped one — an unreachable state left implemented reads as a live surface, and a plan claiming it exists sends the next agent to test what never renders.

**The file surface has since been carried through the same pass, which finishes [states.md](states.md) across all three altitudes.** It held the worst of the three surfaces' states, and both of its serious ones were established by measurement rather than by reading:

- **A large file could not be saved.** At 400 variables the surface rendered **26,756px inside a 673px content region** and the save control sat at 26,776px in a 720px window — below the fold, past every row. It now carries the three-band frame the manage surface established, with the rows as the only scrolling region; driven at 400 variables, the save control is on screen with the rows scrolled to their end.
- **A failed open was a dead end.** The route is set before the open resolves, so a rejection left the altitude current with no contents and only the dismissible global banner — dismissing it left a blank window under a trail claiming the user was inside a file. The surface now states the failure itself, with the reason, a retry, and a way back to the repository.
- **An open in flight rendered nothing at all.** Measured: the content region held zero bytes for the whole open. It now draws the surface's own skeleton, with the path the route already knows.
- **The surface states its variable count**, the fact both sibling altitudes state.

**One defect found here belonged to no surface.** With the frame correct and every element in the chain measuring at the window's height or less, the document still scrolled to 26,695px — the visually-hidden span each masked value carries is absolutely positioned with no offsets, so it escapes any scrolling region that is not itself positioned, and 394 of them extended the document. Fixed on the utility; [the interface memory](../MEMORY.md) holds why the offsets must stay.

All twelve scenario runs were re-driven green after the change — **76 driven checks**, including the surface's own new scenario (`bun run e2e:largefile`) — and each new guard was confirmed non-vacuous by reintroducing the defect it prevents.

**The root segment now carries its switcher**, closing the audit's other reference deviation. Its popover is the one that most had to exist, which is the opposite of how the withdrawn reasoning read it: on a fresh install its list is empty and it carries **+ Add repository**, the only thing a user can do on that screen. With nothing to switch between it drops the search field — a field that can filter nothing is the same empty promise the missing chevron was — states that there are no repositories yet, and puts focus on the add action. Driven in `first-run` on exactly that screen, and confirmed non-vacuous by removing the switcher and watching the step fail.

**The four disclosures now share one contract** ([disclosure-primitive.md](disclosure-primitive.md)), as a hook rather than a wrapper component: what they have in common is the open state and the rules for leaving it, while their markup — a menu, a bubble with a live region, a popover holding a listbox — has nothing in common at all. The switcher's divergence is closed: it handled Escape only within its own subtree, so a user who opened it, moved focus to the surface behind and pressed Escape found it still open while every other disclosure would have closed.

**Every child of this node is now `[x]`**, the manage surface included: its last item was the relock that discards a live selection, which was pursued to a reproduction and found not to be a defect.

[HANDOFF.md](HANDOFF.md) briefed this work and is now spent for the grid; it stays until the remaining surfaces are carried to the same depth.

**Two further concerns were taken in from the product owner. The palette is done; the manage surface is part-built.** The sequencing question both plans raised was settled by taking the palette first, so the manage surface was rebuilt in the finished visual language rather than restyled after.

[palette.md](palette.md) is **complete**. The palette had never been chosen — [shape.md](shape.md) tokenised the values the first screens happened to carry, which fixed the mechanism and preserved the accident. There are now fourteen tokens where there were fifteen, and **`--primary` is split from `--accent`**: a fill is a background that ink sits on, an accent is a foreground that sits on the page, and no single value satisfies both obligations. `--panel` and `--field` collapsed into `--raised`, having all resolved to an identical `#ffffff` in light; `--selected` had been declared in both themes and used by no rule at all. Hover is neutral everywhere now, so hover, selection and focus are three visibly different things rather than three uses of one blue.

It also closed a real conformance failure: `--line` was **1.34:1 on dark and 1.23:1 on light** against SC 1.4.11's 3:1. Rather than waive it or turn every divider into a heavy rule, the token split by obligation — a boundary needs 3:1 only where it is the sole means of identifying a control.

[manage-surface.md](manage-surface.md) is **in flight**. Its audit ([_docs/manage-surface-audit.md](_docs/manage-surface-audit.md)) found fifteen things, and this pass took the frame and the two defects the owner met:

- **The inert folder is fixed.** A folder holding no candidates fired no callback at all while drawing `cursor: pointer` and highlighting on hover — measured at **four of nine directories** in an ordinary repository and **every directory** in the nothing-recognised case. It now expands.
- **The surface is a three-band frame** at full window height, with the tree as the only scrolling region. The tree's own `max-height: 26rem` was the worse of the two causes of "doesn't fill the screen", holding it to 416px and leaving 362px dead below the footer at 1280×720.
- **The surface owns its scan.** It previously awaited the scan before existing, so a loading state could not render — the audit measured a **42-second scan** spent on the previous screen with no feedback, and a failed scan losing the user's folder choice to a banner on the screen they had just left.

**The filter is now built and driven**, which was the largest of its remaining items and the one [the research](_docs/tree-picker-research.md) calls table stakes: the tree expands to follow the *detected* files, so an undetected one was reachable only by hand-opening its chain. A rescan also says on its face that it is a rescan rather than leaving that fact inside a toggletip, and inert rows no longer light up on hover.

**Its two channels are now columns, and its degraded state is stated.** The annotations sit at the row's trailing edge, so their edges line up down the tree rather than spanning 361px wherever each name happened to end; names truncate rather than wrapping; and the 1px offset between the two kinds of row turned out not to be the fonts the audit blamed but the **checkbox placeholder**, declared a pixel wider than the checkbox it stands in for. The scan's deliberate skipping of build output and dependencies — correct, and previously silent — is now on the surface as a fact, with the toggletip naming every skipped folder.

**Its last audit finding is closed, and it was not a defect.** The relock that discards a live selection was pursued to a reproduction and does not exist as stated: the surface's own two calls lock the registry rather than the session and so cannot return `locked` at all, the one concurrent caller that does check the session discards its answer deliberately, and the explicit lock is unreachable behind the overlay. The audit's stated cause — a 15-minute session lifetime — is not a mechanism, since that deadline is per held file. The one path that does discard a selection is the confirm itself failing, which is correct. Both behaviours are now guarded, each confirmed by breaking the code beneath it.

Every child except the three named above is `[x]`, and `manage-surface.md` is `[x]`. The two that carried risk beyond layout both landed on their designed shape: `theme.md`, because persisting a preference contradicts the memory-only webview and had to go to a Rust-side store rather than `localStorage`; and `title-bar.md`, because the drag region was present in the markup all along and did nothing, which made it a bug fix with a reproduction rather than a styling change.

The design fork this redesign genuinely exposed — where the cross-repository exposure alert lives once the sidebar carrying it is gone — was raised as a blocking question and settled by the product owner: it moves to the title bar strip. The Approach above records the decision and why the two alternatives were refused.

**The title bar reaches every surface, and the frame it establishes is what makes the manage surface hold.** The three early returns that rendered outside `.shell` — the manage overlay, the password-change overlay, and the locked screen — are gone; the shell is unconditional and every surface renders as its content. The Approach above records the shape.

The defect was reproduced before it was fixed, and the reproduction reached the mechanism rather than the symptom. Measured with the manage surface open: `[data-tauri-drag-region]` matched **nothing**, and all three surfaces began at `top: 0`, underneath the platform's window controls. The height chain was the same cause seen from the other side — `.manage` asks for `height: 100%`, and outside `.shell` there is no ancestor with a height, so the surface rendered at **whatever its content happened to be**: 2630px against an ~80-file repository, and **322px in a 720px viewport** against a small one. Both are the same failure; only the direction differs, which is why "the header scrolls away" and "the surface doesn't fill the window" were never two faults.

After the fix, driven at the same window size: one drag region, the strip at `top: 0`, every surface starting at 46.4px below it, and `.manage` at 673.6px in a 720px viewport at **every** tree size. The tree region is the scrolling element — `scrollHeight` 2180 inside `clientHeight` 519 — while the document does not scroll at all, and with the tree scrolled to its end the header is still at 46.4px and the footer's bottom edge is exactly the viewport's. `e2e/journeys/window-frame.e2e.ts` holds all of it (`bun run e2e:frame`), asserting the mechanism at each of the three surfaces rather than the appearance of any one.

Note that the **`.manage` height measurement in this node's earlier record and in [manage-surface.md](manage-surface.md) was taken against a large repository only**, which made the fault read as "the surface is too tall". It is not: it is "the surface is its content's height", and a small repository shows the same defect as a surface far too short. A fix validated only against a tall tree would have looked correct while the frame was still broken.

**[freshness.md](freshness.md) is newly framed and blocked**, from driving [living-with-it](../../../../../journeys/living-with-it.md). It holds one concern in two halves: the interface re-reads disk **only when the session unlocks**, so a file deleted or exposed while the window sits open goes unnoticed indefinitely; and nothing anywhere states that everything *is* protected, so the healthy answer exists only as the absence of warnings spread across every tile. They are one node because a standing assurance computed from a stale read is worse than no assurance. **Its forks are settled and its Approach is committed.** The owner answered the positive statement directly — *nothing; absence is the answer* — so no assurance is drawn anywhere, and delegated the rest with one instruction: long-term stable and robust, whatever the effort. That instruction pointed *away* from a filesystem watch, whose failure modes all end in the product silently ceasing to notice, and towards focus plus a timer on the sweep loop that already exists — a choice a measurement settled rather than taste, since a full reconciliation is 6ms for 500 managed files and under a millisecond for a real vault.

# Open threads

- The tile grid's breakpoints are set against the window's own minimum width rather than measured at the sizes people actually use. Worth revisiting once the application has been lived in at a few window sizes.
- Whether the file-level switcher should list files across *all* repositories rather than only the current repository's. The current shape mirrors Supabase's, where a branch switcher lists one project's branches; the cross-repo variant is a different affordance and wants a reason before it is built.
