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
- [~] breadcrumbs.md -> the trail, the switcher popover, and the route. **The root segment has no switcher, and the chevron is not the referenced icon.**
- [~] repositories.md -> the repositories grid: tiles, search, per-tile ellipsis, add. **States beyond populated are undesigned; the empty state is a different visual language.**
- [~] files.md -> one repository's files as large rows, with the repository's operations. **States beyond populated are undesigned.**
- [~] file.md -> the file altitude, and the env editor re-homed into it. **States beyond populated are undesigned.**
- [x] shape.md -> the shared visual language: the radius, the surfaces, and the tokens the themes resolve
- [x] _docs/surface-audit.md -> the audit of the four built surfaces (a supporting doc, not a child)
- [!] states.md -> the states beyond populated: empty, loading, error, excessive, degraded, unavailable. **Blocked on [QUESTIONS.md](QUESTIONS.md) for the empty state's asserted copy.**
- [ ] icons.md -> an icon system, replacing the text characters standing in for glyphs throughout the interface
- [ ] disclosure-primitive.md -> one implementation of the disclosure contract the four collapsed controls each carry separately

# Cursor

**The navigation model is in place and its surfaces are not finished.** The route, the trail, the switcher, the three altitudes, the themes and the title bar all work and are driven; what was not done is the depth each surface deserved. The product owner reviewed the running application and found it reads as amateur, for two reasons that are recorded here rather than in a review that will be lost:

- **The reference was not matched.** The switcher exists but the `Repositories` root carries no chevron at all — so on the landing screen, the one screen a new user sees, there is no switcher and no way to add a repository from the trail, which is the affordance the supplied screenshot showed. The chevron glyph is two stacked ASCII carets rather than an icon. The Approach below rationalised the missing root switcher ("a popover over an empty set is a control that lies about having options"); that reasoning is wrong, because the popover also carries **+ Add repository**, which is precisely what an empty product needs.
- **Only the populated state was designed.** The repositories grid returns a centred heading, a paragraph and a button when empty — a different visual language from the grid it replaces, where an add-repository tile would have kept one. The other states (excessive, loading, error, partial) were never enumerated for any of the three surfaces.

Neither failure was caught by a test, a journey, or the drive: all of them passed. That is what [docs/plans/SURFACE_AUDIT.md](../../../../../../docs/plans/SURFACE_AUDIT.md) now exists to catch, and the instructions that permitted it have been changed ([INSTRUCTIONS.md](../../../../../../docs/plans/INSTRUCTIONS.md) on parts-and-depth, [UX_RESEARCH.md](../../../../../../docs/UX_RESEARCH.md) on states and reference fidelity).

**The audit is done and nothing is fixed.** [_docs/surface-audit.md](_docs/surface-audit.md) records every state of the four surfaces as seen in the running application, with the reference-fidelity pass explicitly incomplete because the supplied screenshots are no longer in the repository. Its findings are framed as three children: [states.md](states.md), [icons.md](icons.md) and [disclosure-primitive.md](disclosure-primitive.md).

The audit's most severe finding was not in the brief that ordered it: **the repositories grid reports the user's data as absent while it is loading, and permanently if the load fails**, because empty, loading and failed are the same screen and that screen says *"Seal manages nothing yet"*. A returning user meets it on every launch. It is recorded in [states.md](states.md).

**The next session builds one surface to full depth**, which the audit says is the repositories grid — it is the landing surface, it holds the loading-and-error finding, and its empty state is a new user's first impression. Two answers in [QUESTIONS.md](QUESTIONS.md) gate it: the re-supplied reference screenshots, and the empty state's asserted copy. [HANDOFF.md](HANDOFF.md) still briefs that work; it is a one-off document for this handoff rather than a plan-system artifact, and it is deleted once the work it describes is finished.

Every child is `[x]`. The two that carried risk beyond layout both landed on their designed shape: `theme.md`, because persisting a preference contradicts the memory-only webview and had to go to a Rust-side store rather than `localStorage`; and `title-bar.md`, because the drag region was present in the markup all along and did nothing, which made it a bug fix with a reproduction rather than a styling change.

The design fork this redesign genuinely exposed — where the cross-repository exposure alert lives once the sidebar carrying it is gone — was raised as a blocking question and settled by the product owner: it moves to the title bar strip. The Approach above records the decision and why the two alternatives were refused.

# Open threads

- The tile grid's breakpoints are set against the window's own minimum width rather than measured at the sizes people actually use. Worth revisiting once the application has been lived in at a few window sizes.
- Whether the file-level switcher should list files across *all* repositories rather than only the current repository's. The current shape mirrors Supabase's, where a branch switcher lists one project's branches; the cross-repo variant is a different affordance and wants a reason before it is built.
