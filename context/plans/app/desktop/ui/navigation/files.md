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

Name, path, **state tag** in the established vocabulary — sealed, readable, not found, unknown — and the row's own operations. State is a fact and never collapses.

A file that is exposed carries the danger treatment on its state rather than a separate marker, and the repository's exposure alert above the list carries the inline fix, unchanged in behaviour from what [shell-layout.md](../shell-layout.md) specified.

Operations on a row: the row itself navigates into the file; **Seal** appears on a file that can be sealed; and an ellipsis holds **Stop managing this file**. As on a tile, the controls inside a row stop their press from reaching the row, so acting on a file never also opens it.

Row operations may de-emphasise until hover, and the rule bounding that is unchanged: anything revealed on hover is revealed identically on focus, and nothing is reachable only by hover.

## Selecting several, and sealing them together

Each sealable row carries a checkbox, and a bar above the list states how many are chosen and seals exactly that set. This is the withdrawn shell's batch seal re-homed, with its safety properties intact: the set is explicit, the acknowledgement gate is unchanged, the recency warning still fires per file and names the files it applies to, and the outcome is reported **per file with its reason** rather than as a count.

The batch is not atomic and the interface does not imply it is.

## The repository's own operations

Above the list: the repository's name is the surface's subject rather than a repeated heading — the trail already states it — so the header carries the **path**, the **toggletip** explaining watched versus protected that [the protect-a-repo journey](../../../../journeys/protect-a-repo.md) requires, and the **ellipsis** with the same two operations the tile's menu carries.

The same two operations appearing on the tile and here is deliberate: they are the repository's operations, and a user acting on a repository may be at either altitude. One flow, two entry points.

## The empty repository

A repository with nothing managed states that and offers the scan, rather than showing an empty list.

# What exists

All of the Approach: the rows with their paths and states, the row and repository operations, the batch seal, and the exposure alert above the list.

Interface tests cover navigation from a row, the row's controls not navigating, the state vocabulary, the batch seal's explicit set and per-file reporting, and the empty repository.

Guards confirmed non-vacuous:

- sealing every readable file rather than the chosen set fails 2
- reporting a count instead of naming each failed file and why fails 1
- letting a row control's press fall through and open the file fails 1

# Steps

- [x] The row, with its name, path, state and operations.
- [x] The repository header with its path, toggletip and ellipsis.
- [x] The batch seal re-homed, with its gate and per-file reporting intact.
- [x] The exposure alert above the list.
- [x] The empty repository state.
- [x] Tests, with each load-bearing rule confirmed non-vacuous.

# Open threads

No open threads.
