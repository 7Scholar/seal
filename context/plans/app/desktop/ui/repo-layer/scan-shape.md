Part of [the repo-layer plan](README.md).

# Scope

What the scan hands the interface: a view of the repository's structure rather than a list of candidates. The walk that produces it, the shape that crosses the boundary, and the classification carried on the rows that have one. Out of scope: how any of it is drawn ([adopting.md](adopting.md), [managed-view.md](managed-view.md)), and the classification rules themselves, which are [the registry's](../../../registry.md) and change not at all.

This plan carries Rust scope into an interface concern deliberately, the way [shell-layout.md](../shell-layout.md) carried the batch seal: the seam is designed with the surface that consumes it, because a seam designed apart from its consumer guesses wrong about what the consumer needs.

# What & why

`scan_folder` returns `Vec<Candidate>` — one entry per path the scan judged interesting, each with a classification and a reason. That is everything the current flat-list flow needs and nothing the tree needs. A view of the repository additionally needs the directories, the files the scan did not flag, the nesting that relates them, and — because [the parent Approach](README.md) shows them rather than hiding them — which directories were deliberately not walked.

The candidate data itself is not in question and does not change. What changes is that candidates stop being *the* result and become an annotation on some of the rows of a larger result.

# Approach

## The result is the repository's structure, annotated

The scan returns the repository as a tree of nodes. Each node is a directory or a file, carries its own name and its path relative to the repository root, and a directory carries its children. A file node carries the candidate annotation when the classifier produced one — the confidence, and the reason where there is one — and carries nothing where it did not. Whether a file is already managed is carried the same way it is today.

**The reason is optional independently of the confidence.** A classification always states how confident the scan is; it states *why* only where the reason says more than the file's own name does, so a flagged file can carry a confidence and no reason at all. Which classifications earn a reason is [manage-surface.md](../navigation/manage-surface.md)'s call, since it owns the channel the reason is drawn in; this node's contract is only that the boundary and the tree must both accept its absence without treating the file as undetected.

**Undetected files are ordinary rows, not a separate category.** The interface draws them dimmed and lets the user select them, so the boundary must not distinguish them beyond the absence of an annotation.

## Pruned directories are reported, not omitted

The walk skips the build and dependency directories it skips today, and the reason it does is unchanged. What changes is that a skipped directory still appears in the result, **marked as not walked and carrying no children**. Omitting it entirely would make the result something other than the repository, and the interface could not then tell a deliberate skip from a genuine absence — a distinction [the parent Approach](README.md) requires it to draw, since it renders those rows as inert and unexpandable.

The marker is a property of the node, not an inference the interface makes from an empty child list: an empty directory and an unwalked one are different facts, and a consumer must never have to guess which it is holding.

## The walk still does not respect gitignore

Inherited unchanged from [the registry](../../../registry.md) and recorded as measured in the root [MEMORY.md](../../../MEMORY.md): the walk runs with the ignore machinery **disabled**, because secret files are gitignored precisely because they are secret — a gitignore-respecting scan was measured returning only the committed example while concealing every real secret. Nothing in this plan's larger result may reintroduce that filter. A file's ignored status is a display concern the interface may eventually want; it is never permitted to bound the walk.

The noise directories stay excluded by filtering entries during the walk rather than by include-globs, for the second measured reason recorded in the same place.

## The scan is one-shot; the rendering is what is lazy

Measured before implementing, against a real monorepo on this machine: after the existing pruning, **42,123 rows — 38,367 files across 3,756 directories, thirteen levels deep, with a single directory holding 7,877 entries** (a repository of this project's own size measures 309 rows, so the spread across real repositories is two orders of magnitude). The walk producing that took **0.09 seconds**.

That measurement settles the shape in both directions. The walk is nowhere near expensive enough to justify a lazy or paginated scan, so **the scan stays one-shot** and hands back the whole structure — a second round trip per directory would add latency and complexity to buy nothing. What cannot absorb 42,123 rows is the *rendering*, and that is bounded by the tree drawing a collapsed folder's children only when it is expanded ([adopting.md](adopting.md)). A collapsed directory costs one row no matter what it contains, so the 7,877-entry directory is free until somebody opens it — and nothing preselects it open, because it holds no candidates.

The consequence for this plan is a constraint on the shape rather than on the walk: the result must be **cheap to descend into lazily**, so a directory's children are reachable without rescanning and without walking the whole structure again to find them.

## What crosses the boundary, and what does not

Paths, structure, classification, and state. **No file contents, no sizes read from opening a file, nothing derived from what a file holds.** The frontend's never-holds-plaintext rule is not weakened by the result growing: it grows in breadth across the repository, never in depth into any file.

## Where the shape lives

The tree shape is produced by the registry's scan, which is where the walk already lives, and passed through the lifecycle command that already mediates it. Both plans own their halves as they do today; this plan states the contract they meet on so neither guesses it alone.

The interface's typed command module mirrors the shape. Because that mirror is a contract rather than an inventory, a change to the shape must flag both sides — which coverage already gives, since the mirroring file and the Rust file are covered by plans that will both re-review.

# What exists

All of the Approach. The registry's scan gained a tree walk beside the candidate walk: directories and files as nodes carrying their name and repository-relative path, a directory carrying its children, a file carrying the classifier's verdict where there is one and nothing where there is not, and a pruned directory carried as a node marked unwalked with no children.

The tree walk reads directories directly rather than going through the ignore crate's walker, which makes the gitignore constraint structural instead of merely observed: there is no ignore machinery in this path to enable by accident. Entries sort directories before files, then by name.

The boundary carries it as a tagged union — `directory` or `file` — so the interface discriminates on a field rather than on the shape of what it received, with the classification flattened onto file nodes alongside whether each is already managed. The candidate list still crosses unchanged beside it, so nothing that consumes the old shape had to change at once.

Verified by the registry suite and the boundary suite. Two guards were confirmed non-vacuous by reintroducing the exact defect each prevents:

- omitting pruned directories rather than marking them fails 2 — including the one asserting an empty directory stays distinguishable from an unwalked one
- dropping files the classifier did not flag, which would quietly turn the tree back into the candidate list in tree clothing, fails 1

The measurement that opened this plan is recorded in the Approach and is the reason the scan stayed one-shot.

# What is missing

Nothing on this plan. Nothing renders the tree yet — that is [adopting.md](adopting.md).

# Steps

- [x] Sanity-test the proposition against a real repository before implementing. Measured 42,123 rows in 0.09s, with one directory holding 7,877 entries — which settled the scan as one-shot and moved the bound onto the rendering.
- [x] The tree shape in the registry's scan, with the pruned-directory marker as a node property.
- [x] The candidate annotation carried on file nodes, with the classification rules untouched.
- [x] The shape crossing the boundary, and the interface's typed mirror of it.
- [x] Tests: the realistic repository from the existing scan tests still surfaces every real secret; a pruned directory appears marked and childless rather than absent; an empty directory and an unwalked one are distinguishable; and the gitignore guard is confirmed non-vacuous exactly as it is today.

# Open threads

None. The one this plan carried — whole versus lazy — was settled by the measurement recorded in the Approach.
