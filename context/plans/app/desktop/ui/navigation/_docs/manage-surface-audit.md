# Surface audit — the manage surface

Produced by following [the surface audit procedure](../../../../../../../docs/plans/SURFACE_AUDIT.md), for [the manage surface plan](../manage-surface.md). Its product is findings, not fixes. No application code was changed by this pass.

The surface is [ManageFlow.tsx](../../../../../../../ui/screens/ManageFlow.tsx) over the tree primitive at [FileTree.tsx](../../../../../../../ui/components/FileTree.tsx), styled by the `.manage` and `.tree__` rules in [styles.css](../../../../../../../ui/styles.css). The tree's contract — row anatomy, the two visual channels, the folder-scoping invariant, computed expansion, the `aria-checked` model — is [adopting.md](../../repo-layer/adopting.md)'s and is not reopened here. Everything below judges presentation and feel, and every finding that touches the tree touches how it is drawn or how it responds, never what it guarantees.

## How the states were reached

Everything marked **measured** was seen in the **real application** — the release harness binary at `target/release/seal-desktop`, driven per [RUNNING.md](../../../../../../../docs/RUNNING.md) against a scratch `HOME` with `SEAL_E2E_PICK_FOLDER` standing in for the folder picker, and read back through the DOM and computed styles at the moment the surface was on screen. The measurement instruments were throwaway journey specs, run and then deleted; the numbers they produced are recorded inline below rather than the scripts.

- **Populated** — measured, against a repository of 11 files across 6 directories including `node_modules` (pruned) and a 4-deep chain.
- **Excessive** — measured, against the same repository grown to 40 modules × 26 files plus one 119-character directory name: **1,041 files, 1,097 rows on arrival, a 42-second scan**.
- **Empty / nothing-recognised** — measured, against a repository with no candidates at all (`README.md`, `src/main.ts`, `src/lib/util.ts`, `docs/a.md`).
- **Loading** — **established from source, because it does not exist to be reached.** `startAdd()` and `startRescan()` fully `await ipc.scanFolder()` *before* `setOverlay({ name: "manage", ... })` ([App.tsx:226-238](../../../../../../../ui/App.tsx#L226-L238)), so the manage surface does not exist as a component until the scan has already returned. There is no point in time at which a loading manage surface could render. The 42-second gap in the excessive case was measured — it is spent on the *previous* screen.
- **Error** — established from source. A failed scan is caught by `attempt()` and routed to the global `Problem` banner on the repositories grid; the manage surface is never constructed, so it has no failure state of its own.
- **Already fully managed** — established from source. `alreadyManaged` files are disabled and annotated per row, and `scan.alreadyRegistered` adds one clause to the toggletip. Driving a second scan of a registered repository was attempted and lost to a session expiry mid-run (below); the state's construction is read from [FileTree.tsx:234-235](../../../../../../../ui/components/FileTree.tsx#L234-L235) and [ManageFlow.tsx:67-69](../../../../../../../ui/screens/ManageFlow.tsx#L67-L69).
- **Degraded / partial** — established from source: no such state exists. A scan that walked some directories and skipped others is drawn as ordinary rows plus `not looked in` notes, with nothing at surface level saying the picture is incomplete.
- **Forbidden / unavailable** — established from source. The only unavailable case is an already-managed file, which is silently disabled.

One state was reached by accident and is worth recording as method: during a long run the **session idle-locked underneath the manage surface** and the whole screen was replaced by `Seal is locked`, discarding the selection. That is finding M12.

## The surface

| State | Verdict |
| --- | --- |
| Empty / nothing recognised | **absent** — a bare grey sentence above a tree in which every row is inert, and a disabled confirm |
| One | designed |
| Populated | designed — but see M2, M4, M5 on how it reads |
| Excessive | **absent** — 1,097 rows, no count, no virtualization, 30,045px of scroll in a 414px box |
| Loading | **not reachable** — the surface cannot exist before the scan returns, so the 42s wait happens on the previous screen with no feedback |
| Error | **absent** — no per-surface failure state; a failed scan never reaches this surface |
| Degraded / partial | **absent** — a partially-walked repository is not distinguished from a fully-walked one |
| Forbidden / unavailable | **partial** — already-managed rows are disabled and annotated, but the confirm gives no account of them |

## Findings

**M1 — A folder with no detected files beneath it is inert on click, while drawing itself as clickable.** *(broken)*

Reproduced in the running application and confirmed at [FileTree.tsx:240-250](../../../../../../../ui/components/FileTree.tsx#L240-L250): `toggle()` computes `candidatePathsUnder(node)`, and on `candidates.length === 0` returns having called nothing. Such a directory is also `selectable: false` ([FileTree.tsx:268-270](../../../../../../../ui/components/FileTree.tsx#L268-L270)), so it renders `.tree__check--none` — a 13px spacer — instead of a checkbox, and `aria-checked` is `undefined`. Clicking it fires **no callback at all**: not `onToggleExpand`, not `onToggleSelect`, not `onToggleSelectMany`. Nothing on screen changes.

The row nonetheless computes **`cursor: pointer`** ([styles.css:426](../../../../../../../ui/styles.css#L426), which sets it for every `.tree__row`) and **highlights on hover** ([styles.css:428](../../../../../../../ui/styles.css#L428)). So the row makes two false statements — the pointer says *this is a target*, the hover says *you are on it* — and then refuses.

**How common this is, measured.** In the ordinary populated repository, **4 of 9 directories** (`.github`, `docs`, `node_modules`, `src`) were inert. In the nothing-recognised repository, **every directory on the surface** was inert: `docs` and `src`, the only two, both with `hasCheckbox: false` and `cursor: pointer`. In the excessive repository, 4 of 51. The class is not an edge case — it is every directory that does not happen to contain a secret, which in a real repository is most of them, and `src/` is always one of them.

The user's mental model is *click a folder to open it*. The surface's only response to that gesture, on the majority of its folders, is nothing. This is the most severe finding here and the one the product owner met directly.

**M2 — The surface uses half the window, and the tree is a small box inside a narrow column.** *(broken)*

Two causes stack, and the second is worse than the one the plan named.

`.manage` is `max-width: 72rem` centred with uniform padding ([styles.css:390](../../../../../../../ui/styles.css#L390)) — measured at **64px of dead gutter on each side** once the window passes 1152px. At the default 1100×720 window it does not bite at all, which is why it reads as the smaller problem.

The real cause is that `.tree` carries **`max-height: 26rem` with `overflow-y: auto`** ([styles.css:422](../../../../../../../ui/styles.css#L422)). The tree is therefore a fixed **416px box** regardless of how much window there is, and everything below it is empty. Measured, on the ordinary populated repository:

| Window | Surface bottom edge | Dead space below | Window used |
| --- | --- | --- | --- |
| 550×360 | 379 | −19 (clipped) | 105% |
| 800×450 | 358 | 92 | 80% |
| 960×540 | 358 | 182 | 66% |
| 1280×720 | 358 | 362 | 50% |

At a 1280×720 window the surface occupies **half the vertical space and leaves 362px empty beneath the confirm button** — while the tree it left no room for is scrolling internally. In the nothing-recognised case the measurement was **437px of dead space below the footer on a 720px window**, under a 99px tree. Enlarging the window makes the surface *worse*, because the tree does not grow and the emptiness does.

**M3 — There is no loading state, and the wait is 42 seconds on a real repository.** *(broken)*

Measured: from clicking **Add repository** to the manage surface appearing on the excessive repository (1,041 files) took **41,943ms**. During all of it the user sits on the repositories grid with **no spinner, no progress, no disabled state and no statement that a scan is running** — the add button re-enables, the grid is fully interactive, and nothing indicates that a 42-second operation is in flight.

This cannot be fixed inside `ManageFlow` as written, and that is the finding: `startAdd()` awaits `ipc.scanFolder(root)` and only then calls `setOverlay` ([App.tsx:226-232](../../../../../../../ui/App.tsx#L226-L232)), identically in `startRescan()` ([App.tsx:234-238](../../../../../../../ui/App.tsx#L234-L238)). **The surface does not exist until the scan has finished**, so a loading manage surface is not a state that was left undesigned — it is a state the current structure forbids.

This is now an inconsistency as well as an absence: the repositories grid it launches from **has** a designed loading state — a three-tile skeleton with `aria-busy` ([Repositories.tsx:88-99](../../../../../../../ui/screens/Repositories.tsx#L88-L99)) — and a designed failure tile with a retry ([Repositories.tsx:100-113](../../../../../../../ui/screens/Repositories.tsx#L100-L113)). The grid was brought up to that standard and the surface a user meets next was not.

**M4 — On a large repository the surface draws 1,097 rows into a 414px box and states no count.** *(unfinished)*

Measured on the excessive repository: **1,097 rows** in the accessibility tree on arrival, `scrollHeight` **30,045px** against a `clientHeight` of **414px** — a scroll ratio of **72:1**. The scrollbar thumb is roughly 6px tall. Nothing on the surface says how many rows exist, how many directories, or how far down the user is.

The contract is not violated — collapsed directories rendered no children, exactly as [adopting.md](../../repo-layer/adopting.md) requires, and the 1,097 rows are the legitimately expanded ones. The failure is presentational: expansion follows candidates, and a repository with 40 secrets has 40 expanded branches, so the bound the contract provides is *proportional to the number of secrets* rather than small. [scan-shape.md](../../repo-layer/scan-shape.md)'s 42,123-row monorepo would not render 42,123 rows, but a monorepo with secrets in many modules renders thousands, and 26rem is the wrong container for thousands.

The one statement of scale the surface does make is the confirm button — **`Manage 44 files`** while 1,097 rows are on screen. That is the blast radius, and it is the only number anywhere.

**M5 — The two visual channels do not align, and the row rhythm is too tight to scan.** *(unfinished)*

Measured, at a 1280px window, across mixed rows at the same depth:

- **Name column misaligns by 1px between kinds.** A directory's name starts at `x = 149.95`, a file's at `x = 148.95`. Every directory row in the tree sits one pixel right of every file row. *(The cause stated here — the two fonts' left side bearings — was wrong, and measuring it again is what showed so: both names start at the same x once the box does. It is the checkbox placeholder, declared a pixel wider than the real checkbox. Fixed; [manage-surface.md](../manage-surface.md) records it.)*
- **The annotation channel has no column at all.** `.tree__reason` is a plain flex sibling ([styles.css:440](../../../../../../../ui/styles.css#L440)), so it begins wherever the name ends: `x = 190.77` for `.env`, `x = 260` for `.env.example`, `x = 303.56` for `.env.production`. The reasons — the surface's account of *why Seal proposes this file* — are a ragged left edge scattered across 113px, unreadable as a column.
- **Rows are 27.38px tall** with `padding: 0.2rem 0.4rem 0.2rem 0` ([styles.css:426](../../../../../../../ui/styles.css#L426)) and **no separation between them**, so 1,097 of them are an undifferentiated wall. The repositories grid it sits beside uses deliberately large rows.
- **Indent is 1.1rem per level** ([FileTree.tsx:285](../../../../../../../ui/components/FileTree.tsx#L285)) — 17.6px, measured from `4.8px` at depth 0 to `75.2px` at depth 4 — with **no indent guides**, so at depth 4 in a 1,097-row tree the eye has nothing to trace a branch by.
- **Nothing truncates.** `.tree__name` is `overflow-wrap: anywhere` ([styles.css:438](../../../../../../../ui/styles.css#L438)). The 119-character directory name measured 27px tall like every other row only because the row was 1,028px wide; in the narrower column it wraps and the row grows, which is the same failure R4 recorded on the grid tiles.

**M6 — The surface renders instead of the application shell, not inside it.** *(broken)*

Measured: on the manage surface, `document.querySelector(".shell")` is **null**, and so are `.shell__titlebar`, `nav[aria-label="Breadcrumb"]`, the theme control and the `Lock` button. `App.tsx` returns `<ManageFlow>` at [App.tsx:260-278](../../../../../../../ui/App.tsx#L260-L278), which is **before** the `return <div className="shell">` at [App.tsx:364](../../../../../../../ui/App.tsx#L364).

Three consequences, all user-visible:

- The **title bar disappears** at exactly this screen. The shell's titlebar carries `data-tauri-drag-region="deep"` ([App.tsx:365-366](../../../../../../../ui/App.tsx#L365-L366)); with no shell there is no drag region, so **the macOS traffic lights sit on bare undraggable content** and the window cannot be moved by its top edge while the user is on the surface.
- **Lock disappears**, on the one screen where a user is reading their own repository's file names.
- The **breadcrumb disappears**, so the surface has no *where am I* and no way back except its own Cancel.

The other full-window overlays behave the same way, so this is structural rather than specific — but it is worst here, because this is the longest-lived overlay and the only one a user browses in.

**M7 — Nothing-recognised is a grey sentence above a tree that cannot be used, under a heading that promises otherwise.** *(unfinished)*

Measured: `<p className="manage__empty">Nothing recognised — choose any file.</p>` ([ManageFlow.tsx:75](../../../../../../../ui/screens/ManageFlow.tsx#L75)), rendered at `13.6px` in `rgb(160,163,173)` — muted, small, and the same treatment as an incidental caption — sitting **above** a full-size tree of 3 rows. This is the same language mismatch [states.md](../states.md) records as R2 and R6 on the grid: the surface's populated language is a bordered tree, and its empty language is a sentence.

Worse, the sentence is **false in the direction that matters**. It says *choose any file* while, measured, **both directories on that surface (`docs`, `src`) are inert** by M1 — the user cannot open either to reach the files inside except by hitting the twisty. The instruction the surface gives is the act the surface refuses.

And the confirm reads **`Manage 0 files [disabled]`**. The surface asks the user to choose, then disables the button that would accept a choice, with no statement of what would enable it.

**M8 — The primary action is drawn identically to Cancel.** *(inconsistent)*

Measured on the confirm button: `className: ""`, `background-color: rgb(23,23,27)`, `border-color: rgb(51,51,61)`, `font-weight: 400` — **byte-identical computed styling to the Cancel button beside it** ([ManageFlow.tsx:91-102](../../../../../../../ui/screens/ManageFlow.tsx#L91-L102)). The `.button--primary` class exists ([styles.css:73-79](../../../../../../../ui/styles.css#L73-L79)) and is used by the repositories grid's add button ([Repositories.tsx:79](../../../../../../../ui/screens/Repositories.tsx#L79)) — it is the product's only primary-button treatment, and it is applied on **exactly one button in the entire interface**, not on this one.

So on the screen where a user commits to what Seal will manage, the affirmative and the abandon are the same grey button, distinguished only by their labels and their order.

**M9 — The heading is smaller here than on the screen the user came from.** *(inconsistent)*

Measured: the manage surface's `h1` computes to **20px** (the bare element default at [styles.css:53](../../../../../../../ui/styles.css#L53), since `.manage__head h1` sets only `margin: 0` at [styles.css:413](../../../../../../../ui/styles.css#L413)). The repositories grid's `h1` computes to **25.6px** (`.surface__head h1`, `font-size: 1.6rem`, [styles.css:216](../../../../../../../ui/styles.css#L216)).

The user clicks **Add repository** on a screen titled at 25.6px and arrives at a screen titled at 20px. The surface reads as subordinate to the list it came from, when it is the more consequential of the two. The grid also carries a `.surface__count` beside its heading ([Repositories.tsx:58](../../../../../../../ui/screens/Repositories.tsx#L58)); the manage surface has no equivalent, which is M4.

**M10 — The tree is reachable by keyboard but has no way back out, and the roving tabindex starts in the wrong place.** *(unfinished)*

From source at [FileTree.tsx:149-151](../../../../../../../ui/components/FileTree.tsx#L149-L151) and confirmed by measurement of the rendered tabindexes:

- **Exactly one row carries `tabindex="0"`** and the rest `-1`, which is the roving model working. But `focused` initialises to `nodes[0]?.relativePath` — **the first row in the tree**, not the first *preselected* row. Measured on the populated repository, the tab stop landed on `.github`, an **inert directory** by M1. The tree's entry point is a row that does nothing.
- **The keyboard model is incomplete against the pattern [adopting.md](../../repo-layer/adopting.md) names.** `onKeyDown` ([FileTree.tsx:252-266](../../../../../../../ui/components/FileTree.tsx#L252-L266)) handles `ArrowDown`, `ArrowUp`, `ArrowRight`, `ArrowLeft` and `Space`. It does **not** handle `Home`, `End`, `Enter`, or typeahead. `Enter` is explicitly named in the contract as *activates*, and it is not bound. In a 1,097-row tree, no `Home`/`End` and no typeahead means the keyboard user's only way to the bottom is 1,096 `ArrowDown` presses.
- **`ArrowLeft` does not move to the parent.** On a collapsed row or a leaf it does nothing at all — the standard tree behaviour is to move focus to the parent row, which is how a keyboard user climbs out of a deep branch. Measured indent reaches depth 4 in an ordinary repository.
- **There is no `Escape`.** Cancel is reachable only by tabbing past every focusable in the tree, and the checkboxes and twisties are all `tabIndex={-1}` so the tab order is head → tree → Cancel → confirm, which is at least short. But the surface offers no keyboard dismissal on a screen a user may well have opened by accident.

**M11 — A pruned directory is drawn as a row that hovers and points, and says why only in 12.48px grey.** *(inconsistent)*

`node_modules` renders with `data-unwalked="true"`, no twisty and no checkbox, annotated `not looked in` ([FileTree.tsx:333-335](../../../../../../../ui/components/FileTree.tsx#L333-L335)). The contract calls it *an answer, not a door*, and that is right. But the drawing does not carry it: `.tree__row[data-unwalked="true"]` sets `cursor: default` ([styles.css:442](../../../../../../../ui/styles.css#L442)) yet **the hover highlight still applies** ([styles.css:428](../../../../../../../ui/styles.css#L428) is unqualified), so the row lights up under the pointer exactly like an actionable one and then does nothing.

Its explanation shares `.tree__note` styling with `already managed` ([styles.css:440](../../../../../../../ui/styles.css#L440)) at 12.48px muted — the same treatment for *Seal did not look here* and *Seal already covers this*, two facts with opposite consequences.

**M12 — The session can idle-lock underneath the surface and discard the selection with no warning.** *(broken)*

Reached accidentally in the running application: after a long run, the manage surface was replaced by the `Seal is locked` screen and the entire selection was gone. `relock()` calls `setOverlay({ name: "none" })` ([App.tsx:93-106](../../../../../../../ui/App.tsx#L93-L106)) unconditionally, so any `locked` error discards the surface and everything the user had chosen on it.

**The stated cause was wrong and is corrected here.** This finding attributed it to a 15-minute *session* lifetime, reading `DEFAULT_LIFETIME` in `crates/seal-session/src/lib.rs` as the session's own. It is not: that deadline is carried per **held file**, and the session deliberately has no expiry of its own — [desktop/MEMORY.md](../../../MEMORY.md) records why, and states that a session deadline would lock a working user out mid-task, which is exactly the complaint here. So the reachable triggers are an explicit lock and a poisoned mutex, not idling.

What survives the correction is the **shape**: losing a deliberated selection to a relock is real, and the surface built for slow reading is the one where that costs most. What does not survive is the frequency, and with it the urgency — this is not something a user meets by thinking for fifteen minutes. It is left open rather than fixed, because a fix on a trigger nobody has reproduced would be unfalsifiable; the reproduction is the work, and it wants doing before the repair.

**M13 — The toggletip carries the surface's guarantees, and its already-registered clause reads as an afterthought.** *(inconsistent)*

The toggletip content is three sentences ([ManageFlow.tsx:64-70](../../../../../../../ui/screens/ManageFlow.tsx#L64-L70)), measured open in the running app as a `.toggletip__bubble`. This is **permitted** by the prose rule in [ui/README.md](../../README.md) — it is an info affordance the user chose to open — and it is the right place for those promises. Recorded as compliant, not as a violation.

What is not right is the conditional clause. When `scan.alreadyRegistered` is true, a fourth sentence is appended: `" This folder is already managed; nothing already managed is changed."` — the single most consequential fact about a rescan, which changes what the confirm button means, hidden inside an affordance the user must first choose to open. Nothing on the visible surface distinguishes a first add from a rescan: same heading (`Seal in {name}`), same path, same tree, same two buttons.

**M14 — The prose rule is violated by the empty state's sentence.** *(inconsistent)*

`Nothing recognised — choose any file.` ([ManageFlow.tsx:75](../../../../../../../ui/screens/ManageFlow.tsx#L75)) sits in the layout, not inside an opened info affordance and not in a destructive-act confirmation. It is a sentence explaining the interface, which [ui/README.md](../../README.md) states is "evidence that the arrangement, the labels, or the affordances failed". It is also the sentence M7 shows to be untrue.

**M15 — The path the user is acting on can neither wrap nor truncate, and has no title.** *(unfinished)*

`.manage__root` is `12.8px` muted monospace with **no `overflow-wrap`, no `text-overflow`, and no `max-width`** ([styles.css:414](../../../../../../../ui/styles.css#L414)) — the only `overflow` treatment absent from a path element anywhere in the stylesheet, where `.tile__path`, `.row__path` and `.secret-value__text` all set `overflow-wrap: anywhere`. A deep repository path therefore forces the flex line wider or wraps mid-token depending on where it breaks, and there is no `title` attribute carrying the full value. This is the statement of *what Seal is about to act on*, and it is the least robust text on the surface.

## Defects versus unfinished

**Defects — the surface makes a false statement, or refuses a reasonable act:**

- **M1** — inert folders that draw themselves as clickable and refuse the click. Two false statements per row, on most rows.
- **M2** — the surface uses half the window and shrinks the tree as the window grows.
- **M3** — a 42-second wait with no feedback, on a structure that cannot show any.
- **M6** — no title bar, no drag region under the traffic lights, no Lock, no breadcrumb.
- **M7** — the empty state instructs the user to do the thing M1 prevents, then disables the confirm.
- **M12** — a 15-minute idle lock silently discards the user's work on the surface designed for slow review.

**Unfinished — never designed:**

- **M4** — the excessive state: no count, no virtualization, a 72:1 scroll ratio.
- **M5** — visual hierarchy: misaligned channels, a ragged annotation column, no indent guides, no truncation, rows too tight to scan.
- **M10** — the keyboard model: no `Home`/`End`/`Enter`/typeahead, no parent navigation, no `Escape`, and an entry point on an inert row.
- **M11** — the pruned-directory row hovers like an actionable one and shares its annotation styling with an unrelated state.
- **M15** — the path has no overflow treatment and no title.

**Inconsistent — disagrees with its siblings:**

- **M8** — the primary action is drawn identically to Cancel, while `.button--primary` exists and is used next door.
- **M9** — the heading is 20px where the screen it launches from is 25.6px.
- **M13** — the rescan case is indistinguishable from a first add except inside a closed toggletip.
- **M14** — a layout sentence where the prose rule permits none.

## What was not audited

- **The already-fully-managed rescan state in the running application.** Its construction is read from source; the drawn result — how a disabled, annotated, already-managed row looks beside a live one, and what the confirm says when every candidate is already covered — was not measured.
- **The scan-failure path**, which cannot reach this surface at all and would need the failure staged on the grid instead.
- **Light theme.** All measurements were taken in the dark palette.
- **A repository at [scan-shape.md](../../repo-layer/scan-shape.md)'s full 42,123-row scale.** The excessive case measured here was 1,041 files.
