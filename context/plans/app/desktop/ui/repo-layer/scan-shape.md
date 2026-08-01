Part of [the repo-layer plan](README.md).

# Scope

What the scan hands the interface: a view of the repository's structure rather than a list of candidates. The walk that produces it, the shape that crosses the boundary, and the classification carried on the rows that have one. Out of scope: how any of it is drawn ([adopting.md](adopting.md), [managed-view.md](managed-view.md)), and the classification rules themselves, which are [the registry's](../../../registry.md) and change not at all.

This plan carries Rust scope into an interface concern deliberately, the way [shell-layout.md](../shell-layout.md) carried the batch seal: the seam is designed with the surface that consumes it, because a seam designed apart from its consumer guesses wrong about what the consumer needs.

# What & why

`scan_folder` returns `Vec<Candidate>` — one entry per path the scan judged interesting, each with a classification and a reason. That is everything the current flat-list flow needs and nothing the tree needs. A view of the repository additionally needs the directories, the files the scan did not flag, the nesting that relates them, and — because [the parent Approach](README.md) shows them rather than hiding them — which directories were deliberately not walked.

The candidate data itself is not in question and does not change. What changes is that candidates stop being *the* result and become an annotation on some of the rows of a larger result.

# Approach

## The result is the repository's structure, annotated

The scan returns the repository as a tree of nodes. Each node is a directory or a file, carries its own name and its path relative to the repository root, and a directory carries its children. A file node carries the candidate annotation when the classifier produced one — the confidence and the reason, exactly as they exist today — and carries nothing where it did not. Whether a file is already managed is carried the same way it is today.

**Undetected files are ordinary rows, not a separate category.** The interface draws them dimmed and lets the user select them, so the boundary must not distinguish them beyond the absence of an annotation.

## Pruned directories are reported, not omitted

The walk skips the build and dependency directories it skips today, and the reason it does is unchanged. What changes is that a skipped directory still appears in the result, **marked as not walked and carrying no children**. Omitting it entirely would make the result something other than the repository, and the interface could not then tell a deliberate skip from a genuine absence — a distinction [the parent Approach](README.md) requires it to draw, since it renders those rows as inert and unexpandable.

The marker is a property of the node, not an inference the interface makes from an empty child list: an empty directory and an unwalked one are different facts, and a consumer must never have to guess which it is holding.

## The walk still does not respect gitignore

Inherited unchanged from [the registry](../../../registry.md) and recorded as measured in the root [MEMORY.md](../../../MEMORY.md): the walk runs with the ignore machinery **disabled**, because secret files are gitignored precisely because they are secret — a gitignore-respecting scan was measured returning only the committed example while concealing every real secret. Nothing in this plan's larger result may reintroduce that filter. A file's ignored status is a display concern the interface may eventually want; it is never permitted to bound the walk.

The noise directories stay excluded by filtering entries during the walk rather than by include-globs, for the second measured reason recorded in the same place.

## What crosses the boundary, and what does not

Paths, structure, classification, and state. **No file contents, no sizes read from opening a file, nothing derived from what a file holds.** The frontend's never-holds-plaintext rule is not weakened by the result growing: it grows in breadth across the repository, never in depth into any file.

## Where the shape lives

The tree shape is produced by the registry's scan, which is where the walk already lives, and passed through the lifecycle command that already mediates it. Both plans own their halves as they do today; this plan states the contract they meet on so neither guesses it alone.

The interface's typed command module mirrors the shape. Because that mirror is a contract rather than an inventory, a change to the shape must flag both sides — which coverage already gives, since the mirroring file and the Rust file are covered by plans that will both re-review.

# What exists

Nothing yet.

# What is missing

All of the Approach.

# Steps

- [ ] Sanity-test the proposition against a real repository before implementing: walk one of a realistic size and confirm the node count is what the pruning implies, so the interface plans are designed against a measured breadth rather than an assumed one. This feeds [the parent's open thread](README.md) about very large repositories.
- [ ] The tree shape in the registry's scan, with the pruned-directory marker as a node property.
- [ ] The candidate annotation carried on file nodes, with the classification rules untouched.
- [ ] The shape crossing the boundary, and the interface's typed mirror of it.
- [ ] Tests: the realistic repository from the existing scan tests still surfaces every real secret; a pruned directory appears marked and childless rather than absent; an empty directory and an unwalked one are distinguishable; and the gitignore guard is confirmed non-vacuous exactly as it is today.

# Open threads

- Whether the result is produced whole or lazily per directory. Whole is simpler and matches the current one-shot scan; lazily matters only if the sanity-test above shows a realistic repository is large enough to hurt. The measurement decides it, which is why it is the first step.
