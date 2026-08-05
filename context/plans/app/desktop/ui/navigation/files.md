Part of [the navigation plan](README.md).

# Scope

The **repository altitude**: one repository's managed files as a list of large rows, the repository-level operations above them, and the batch seal. Out of scope: the file's own contents ([file.md](file.md)), and the scan flow reached from here ([repo-layer/adopting.md](../repo-layer/adopting.md)).

# What & why

The middle altitude, and the surface where the repository's real work happens: seeing what is managed, what state each file is in, and acting on one or several of them.

The product owner asked for **big, bulky rows** rather than a compact list — the deliberate opposite of the withdrawn sidebar's dense tree, and possible now because the surface has the whole window instead of two-thirds of it.

# Approach

Built from [the research](_docs/navigation-research.md).

## Rows, not a tree

The withdrawn shell drew the managed set as a **tree over the real directory structure**, and [repo-layer/managed-view.md](../repo-layer/managed-view.md) owns why: it says Seal is a layer over the user's own repository rather than a tool that collected files into itself.

That reason survives the redesign, and the rows carry it differently. Each row shows the file's **name** prominently and its **directory path within the repository** beneath it, de-emphasised and monospaced. A file two directories deep is legibly two directories deep, without spending a nesting level of horizontal space per row — which is what makes the large row shape possible at all.

Rows are ordered by their full path, so files in the same directory sit together and the order is stable across refreshes. A refresh never reorders under the pointer.

## What a row carries

Name, path, **state tag** and the row's own operations.

The state tag names sealed, not found and unknown. It says nothing for a readable file, because that row already carries a **Seal** control and a control offering to seal is a stronger statement that the file is not sealed than a word beside it — the rule is that the surface says a thing once, in the place a user acts on it. The exception is the case where the state is not merely a fact but an alert: an **exposed** file states *Readable — should be sealed* in the danger treatment, because [the disclosure contract](README.md) forbids collapsing an alert, and the repository's exposure alert above the list carries the inline fix, unchanged in behaviour from what [shell-layout.md](../shell-layout.md) specified.

Operations on a row: the row itself navigates into the file, **whatever its state** — a managed file that is readable on disk opens and edits exactly as a sealed one does, because the product is meant to be the single place these files are managed, and a file it can only list is a file it does not manage. **Seal** appears on a file that can be sealed, **Unseal** on one that is sealed, and an ellipsis holds **Stop managing this file**. As on a tile, the controls inside a row stop their press from reaching the row, so acting on a file never also opens it.

Row operations may de-emphasise until hover, and the rule bounding that is unchanged: anything revealed on hover is revealed identically on focus, and nothing is reachable only by hover.

## Selecting several, and acting on them together

**Every row that is on disk carries a checkbox** — sealed and readable alike. Selection is about choosing files to act on, and the actions a selection offers are not all sealing actions, so restricting the checkbox to sealable files made the surface's only multi-file operation unreachable for the files that most need it.

**The bar of actions exists only while something is selected.** A bar stating "0 selected" beside a disabled control is chrome that occupies the surface for the entire time nobody is selecting anything, which is almost all of it.

What the bar offers is **derived from what is selected**, so a control never appears against files it cannot act on:

- **Stop managing N files** is always offered, because it applies to any managed file whatever its state.
- **Seal N files** is offered only when every selected file is readable. A selection holding a sealed file offers no seal, rather than offering one that would partly fail.
- **Unseal N files** is offered only when every selected file is sealed, by the same rule read the other way.

The batch seal's safety properties are intact: the set is explicit, the acknowledgement gate is unchanged, the recency warning still fires per file and names the files it applies to, and the outcome is reported **per file with its reason** rather than as a count. Releasing several is confirmed in one dialog that names each file and states plainly that a sealed file among them becomes readable on disk.

The batch is not atomic and the interface does not imply it is.

## Unsealing, and why it is safe here

**Unseal** is the true inverse of **Seal**: it makes the file readable on disk and Seal keeps managing it, so the file stays on this surface and can be sealed again from the same row. It sits beside Seal on a sealed row, and in the action bar as *Unseal N files* when **every** selected file is sealed — the exact mirror of the seal rule, so neither control ever appears against files it cannot act on.

The safety argument is not that unsealing is harmless; it is that **reading is a different operation**. Opening a file holds its plaintext in memory and never touches the disk ([the root intent](../../../README.md)), so nobody needs to unseal a file to look inside one. That is what makes an indefinite state change the *only* thing unsealing is for, and it forecloses the accident the operation would otherwise invite — decrypt to peek, get interrupted, leave a production secret readable.

It is confirmed before it happens, in a plain dialog naming the file and stating that the contents become readable and stay readable until sealed again. Not the typed acknowledgement gate: that is reserved for what cannot be undone, and this is undone by pressing Seal.

**A deliberately unsealed file raises no exposure alert**, and that is load-bearing rather than incidental — the alert means *recorded sealed, found readable*, which is the file changing behind the user's back. Firing it on the user's own choice would make the alert worthless. `MEMORY.md` records the mechanism.

The repository-level menu deliberately has no unseal ([repositories.md](repositories.md)): unsealing belongs to a file, and a one-press "make every secret in this repository readable" is the one shape of this operation that is genuinely dangerous.

## The repository's own operations

Above the list: the repository's name is the surface's subject rather than a repeated heading — the trail already states it — so the header carries the **path**, the **toggletip** explaining watched versus protected that [the protect-a-repo journey](../../../../../journeys/protect-a-repo.md) requires, and the **ellipsis** with the same two operations the tile's menu carries.

The same two operations appearing on the tile and here is deliberate: they are the repository's operations, and a user acting on a repository may be at either altitude. One flow, two entry points.

## There is no empty repository

**A repository is a non-empty set of managed files, so this surface has no empty state and draws none.** The list always holds at least one row.

This is a property of the model rather than an omission. A repository is deleted the moment its last managed file is released, the manage flow refuses an empty selection, and a rescan only ever adds — so no path arrives at a managed repository holding nothing. A user who releases every file has stopped managing that repository, and the product takes them back to the grid, which is the surface that now correctly describes their situation.

In the state enumeration's vocabulary the empty case is **not reachable**, with that as the reason.

## The count, and what the surface knows

The surface states its **managed-file count**, the same fact the tile carries at the altitude above, so what is below the fold is knowable without scrolling. A count of zero is not stated — the empty state, if it is ever reachable, says that better.

## A file Seal cannot open

A file whose state is `missing` has its open control **disabled and says why, in the row**: Seal cannot open it because it is no longer at that path. The explanation is tied to the control it explains through `aria-describedby`, so it reaches a screen reader as the reason the control is unavailable rather than as loose text nearby. A disabled control with nothing said about why is the silent disable the state enumeration exists to prevent, and it is what this surface did.

## When the last re-read failed

Every operation on this surface — sealing, saving, releasing — re-reads the overview when it completes. That call can fail, and when it does the interface keeps the rows it already had. **The surface says so rather than passing stale contents off as current**: a notice above the list states that Seal could not re-read the repository, that what is below is what it last saw, and that the files are untouched and still sealed — with a retry. The rows stay visible, because stale information a user is told is stale is more useful than a blank screen.

This is the files-list form of the rule the grid established: absent, loading and failed are three different things, and a surface never states a fact it does not have.

# What exists

All of the Approach: the rows with their paths and states, the row and repository operations, the selection-derived action bar, the exposure alert above the list, the count, the missing-file explanation and the stale notice.

Interface tests cover navigation from a row, the row's controls not navigating, the state vocabulary including the readable row's silence and the exposed row's insistence, the action bar's absence until a selection exists, the seal action appearing only for an all-readable selection and the unseal action only for an all-sealed one, the unseal control appearing on sealed rows alone, the report naming the operation that produced it, stop-managing being offered for any selection, the batch seal's explicit set and per-file reporting, the count in both singular and plural, the missing-file explanation and its association with the control, and the stale notice appearing only on a failed re-read. Three more cover the confirmation: it names the consequence, it unseals only on confirming, and declining does nothing at all.

Driven against the real application: the count agrees with the rows shown; a genuinely deleted file — removed from disk while the window sat open — reports `Not found` with its open control disabled and the visible reason tied to it by `aria-describedby`; a readable file opens into its editor rather than failing; the action bar is absent until a row is checked and then offers exactly the actions the selection supports; the row checkbox measures at least 20px on both axes; and the **full round trip** — a sealed file unsealed to readable bytes on disk while staying in the list, raising no alert, then sealed again — runs end to end against a release build.

The alert's other half is driven by the freshness scenario, unchanged: a file made readable *outside* Seal still raises the exposure alert. Both directions matter, and only running both shows the distinction is real rather than asserted.

Guards confirmed non-vacuous by reintroducing the defect each prevents:

- sealing every readable file rather than the chosen set fails 2
- reporting a count instead of naming each failed file and why fails 1
- letting a row control's press fall through and open the file fails 1
- removing the missing file's explanation, restoring the silent disable, fails 2
- removing the stale notice, so a failed re-read reads as current, fails 2
- removing the count fails 3

# Steps

- [x] The row, with its name, path, state and operations.
- [x] The repository header with its path, toggletip and ellipsis.
- [x] The batch seal re-homed, with its gate and per-file reporting intact.
- [x] The exposure alert above the list.
- [x] The empty repository: settled as not reachable, and its unreached markup removed.
- [x] The count, the missing-file explanation, and the stale notice.
- [x] Tests, with each load-bearing rule confirmed non-vacuous.

# Open threads

- The files list has no **loading** state of its own, and does not need one today: every launch lands on the repositories grid, and both paths that could leave the route at this altitude with nothing loaded — a relock and a reconcile — navigate back up to the grid instead. A surface reached only with data already in hand cannot render a load. If a future change lets a user land here directly (a restored route, a deep link), this becomes reachable and wants the grid's skeleton treatment.
- Nothing virtualizes, and there is no excessive-state treatment. The count makes the size visible; the DOM cost is untouched, as on the grid.
