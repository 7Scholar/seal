Part of [the navigation plan](README.md).

# Scope

The **repository altitude**: one repository's managed files as a list of large rows, the repository-level operations above them, and the batch seal. Out of scope: the file's own contents ([file.md](file.md)), and the scan flow reached from here ([repo-layer/adopting.md](../repo-layer/adopting.md)).

# What & why

The middle altitude, and the surface where the repository's real work happens: seeing what is managed, what state each file is in, and acting on one or several of them.

The product owner asked for **big, bulky rows** rather than a compact list — the deliberate opposite of the withdrawn sidebar's dense tree, and possible now because the surface has the whole window instead of two-thirds of it.

# Approach

Built from [the research](_docs/navigation-research.md).

## A tree, over the repository's own directories

The surface draws the managed set as a **tree over the real directory structure**, and [repo-layer/managed-view.md](../repo-layer/managed-view.md) owns why: it says Seal is a layer over the user's own repository rather than a tool that collected files into itself. A file two directories deep is drawn two directories deep.

Only directories that **contain a managed file** appear; the tree is over what Seal manages, not over the repository. Folders sort before files at every level, each alphabetically, so the order is stable and a refresh never reorders under the pointer.

A folder row is **quiet sans and carries no state**: no bar, no menu, no actions. It is structure. A file row is **mono**, because a filename is something a machine matches on.

**The state bar keeps a lane of its own at the far left, and nesting never moves it.** Indentation pushes the name; the bar stays flush at `x: 0` at every depth. That is the whole point of the device — scanning the left edge answers *is anything of mine readable?* without reading a word or following an indent.

Folders collapse and expand. While a filter is active, the branches leading to a match are shown as the **union** of the user's own expansion and what the filter revealed, so a twisty never becomes inert and closing the filter restores what the user had.

## What a line carries

`46px`, and four lanes after the bar: the indent, the twisty slot, the name, and a fixed actions lane with the `⋯` beyond it. The lanes are fixed widths so they line up down the tree whether or not a given row fills them.

**No state is written in words.** The four conditions are said by the bar and the wash — copper on a copper wash for sealed, faint and shorter for not sealed, red at full row height on a matted wash for a broken seal, and no bar at all with the filename struck through for a file gone from disk. The surface states no managed-file count either: the rows are the count.

Operations on a line: the **name** navigates into the file, **whatever its state** — a managed file that is readable on disk opens and edits exactly as a sealed one does, because the product is meant to be the single place these files are managed, and a file it can only list is a file it does not manage. **Seal** sits in the actions lane on any file that is not sealed. **Unseal** is in the `⋯`, on a sealed file only. **Stop managing this file** is in the `⋯` always.

**A file that is gone from disk offers nothing** and says why, tied to its dead open control by `aria-describedby`.

**Seal is drawn at rest, not on hover**, which is a deliberate deviation from the design's file-line board and is recorded as one. Three things decide it: it is the only action that state has, in a product whose purpose is protecting that file; a hover-revealed control is pointer-only, and this one would be the product's most-used action; and the harness **cannot produce CSS hover at all** — measured, `moveTo` leaves the row's `:hover` false — so a hover-only control would ship with no automated coverage of any kind. The actions lane is a fixed width either way, so drawing it costs no layout and nothing shifts.

## Nothing is selected here

**There are no checkboxes on this surface.** Choosing files is the manage surface's task, where choosing *is* the task; here the row is a thing to act on, not a thing to tick. Acting on several files at once is [seal-all.md](seal-all.md)'s **Seal every file** in the repository's `⋯`, which needs no selection at all.

That removes the bar of actions, the per-selection derivation of which controls apply, and the multi-file release dialog along with them. What it does not remove is the batch itself: **Seal every file** reaches the same command, so the acknowledgement gate, the per-file outcome reporting and the non-atomicity are unchanged and still stated below.

The batch is not atomic and the interface does not imply it is: the outcome is reported **per file with its reason** rather than as a count.

## The repository's own operations

Above the tree: the repository's **path**, the `ⓘ` explaining watching against protecting, a **filter**, **Add files**, and the repository's `⋯` holding **Seal every file**, **Scan for more files** and **Stop managing this repository**.

The `⋯` offers the same repository the same operations here as it does on the row one altitude up ([repositories.md](repositories.md)), because a user should not have to remember which screen an operation lives on.

**There is no exposure alert above the list.** The exposed row now carries the wash, the explanation and the fix itself, so a banner above the tree would state the same thing a second time and further from the file it is about. Every property that banner held is held by the row: it appears only for a genuine divergence, it cannot be dismissed, it offers the seal, and it says that sealing cannot undo an exposure that already happened. The strip's cross-repository indicator is unaffected and still present at this altitude, because a repository the user is *not* looking at has no row here.

## Unsealing, and why it is safe here

**Unseal** is the true inverse of **Seal**: it makes the file readable on disk and Seal keeps managing it, so the file stays on this surface and can be sealed again from the same row. It sits in the row's `⋯`, on a sealed file and nowhere else.

The safety argument is not that unsealing is harmless; it is that **reading is a different operation**. Opening a file holds its plaintext in memory and never touches the disk ([the root intent](../../../README.md)), so nobody needs to unseal a file to look inside one. That is what makes an indefinite state change the *only* thing unsealing is for, and it forecloses the accident the operation would otherwise invite — decrypt to peek, get interrupted, leave a production secret readable.

It is **not** confirmed. It is the act the user pressed, the row states the result the instant it lands, and the same row reverses it — [ceremony.md](ceremony.md) owns the rule that decides which acts stop to ask, and this is not one of them.

**A deliberately unsealed file raises no exposure alert**, and that is load-bearing rather than incidental — the alert means *recorded sealed, found readable*, which is the file changing behind the user's back. Firing it on the user's own choice would make the alert worthless. `MEMORY.md` records the mechanism.

The repository-level menu deliberately has no unseal ([repositories.md](repositories.md)): unsealing belongs to a file, and a one-press "make every secret in this repository readable" is the one shape of this operation that is genuinely dangerous.

## There is no empty repository

**A repository is a non-empty set of managed files, so this surface has no empty state and draws none.** The tree always holds at least one file.

This is a property of the model rather than an omission. A repository is deleted the moment its last managed file is released, the manage flow refuses an empty selection, and a rescan only ever adds — so no path arrives at a managed repository holding nothing. A user who releases every file has stopped managing that repository, and the product takes them back to the grid, which is the surface that now correctly describes their situation.

In the state enumeration's vocabulary the empty case is **not reachable**, with that as the reason.

## A file Seal cannot open

A file that is gone from disk has its open control **disabled and says why, on the line**: Seal cannot open it because it is no longer at that path. The explanation is tied to the control it explains through `aria-describedby`, so it reaches a screen reader as the reason the control is unavailable rather than as loose text nearby. A disabled control with nothing said about why is the silent disable the state enumeration exists to prevent, and it is what this surface did.

## When the last re-read failed

Every operation on this surface — sealing, saving, releasing — re-reads the overview when it completes. That call can fail, and when it does the interface keeps the rows it already had. **The surface says so rather than passing stale contents off as current**: a notice above the tree states that Seal could not re-read the repository, that what is below is what it last saw, and that the files are untouched and still sealed — with a retry. The rows stay visible, because stale information a user is told is stale is more useful than a blank screen.

This is the files-list form of the rule the grid established: absent, loading and failed are three different things, and a surface never states a fact it does not have.

# What exists

All of the Approach: the tree with its folders and its four file conditions, the bar in its own lane at every depth, the collapse and the filter, the line's operations, the repository's operations above it, the missing-file explanation and the stale notice.

`ui/managedTree.ts` builds and filters the tree and is tested on its own — folders shared between siblings, folders before files at every level, a root-level file staying at the root, the folder list at every depth, a folder kept for a matching descendant and dropped without one, and a whole-path match.

Interface tests cover the tree's shape and indentation, the bar's lane surviving nesting, a folder having no bar and no menu, collapse and expand, a filter revealing a match inside a collapsed folder and the collapse returning when it clears, the four conditions and the words the surface no longer says, Seal appearing only where a file is not sealed, a gone file offering nothing, Unseal living in the row menu and only on a sealed file, and the absence of any managed-file count.

Driven against the real application: a genuinely deleted file — removed from disk while the window sat open — reports as gone with its open control disabled and the visible reason tied to it by `aria-describedby`; a readable file opens into its editor rather than failing; no row carries a checkbox and no action bar exists; every control on a line measures at least 20px on both axes; and the **full round trip** — a sealed file unsealed to readable bytes on disk while staying in the tree, raising no alert, then sealed again — runs end to end against a release build.

Two findings came out of driving it, both from guards written for this pass. The line's own open control was **831×18 in a 46px row**, so the tree's main target did not fill the row it occupies. And the design's hover-revealed Seal proved undrivable, which is what settled it being drawn at rest.

The alert's other half is driven by the freshness scenario, unchanged: a file made readable *outside* Seal still raises the broken-seal condition. Both directions matter, and only running both shows the distinction is real rather than asserted.

# Steps

- [x] The line, with its state bar, its name and its operations.
- [x] The repository header with its path, toggletip, filter and ellipsis.
- [x] The empty repository: settled as not reachable, and its unreached markup removed.
- [x] The missing-file explanation and the stale notice.
- [x] The tree over the repository's own directories, with collapse and a filter that unions with it.
- [x] The selection model retired, its multi-file operations replaced by [seal-all.md](seal-all.md).
- [x] Tests, with each load-bearing rule confirmed non-vacuous.

# Open threads

- The files list has no **loading** state of its own, and does not need one today: every launch lands on the repositories list, and both paths that could leave the route at this altitude with nothing loaded — a relock and a reconcile — navigate back up to it instead. A surface reached only with data already in hand cannot render a load. If a future change lets a user land here directly (a restored route, a deep link), this becomes reachable and wants the grid's skeleton treatment.
- Nothing virtualizes, and there is no excessive-state treatment. Nothing states the size of what is below the fold either, now that the count is gone — the scrollbar is the only signal. Fine at the scale this product expects; worth revisiting against a repository with a hundred managed files.
