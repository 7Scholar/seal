# Repairing doc-to-doc drift

This is a periodic cleanup pass over the recursive plan-folder doc tree under `context/plans/app/`. For how that system works — what a plan is, the two forms it takes, how cursors and step markers roll up — read [INSTRUCTIONS.md](INSTRUCTIONS.md) first. This file assumes that design and only tells you how to repair drift in it.

## What doc-to-doc drift is

A parent plan's rolled-up view of a child disagrees with the child itself. Concretely, one of:

- A **step marker** in a parent's Plans list does not match the child's actual status (e.g. parent shows `[~]` for a child whose own README says it is done, or `[x]` for one still in progress or blocked).
- A **cursor line** in a parent names the wrong in-progress child(ren): it points into a child that is finished, or omits a child that is actually active.

This is the only drift kind handled here. Docs disagreeing with **code** is a different procedure (coverage + freshness, see [INSTRUCTIONS.md](INSTRUCTIONS.md)) and is not in scope for this file.

## The one rule: the edges are ground truth, fix them first

Detail lives in exactly one place — the plan that holds the real next action, at the edge of the tree. A parent only ever **restates** a child's status as one step marker plus a cursor line; it holds no independent detail. So there are never two competing detailed accounts to reconcile. Repair is therefore always directional: **start at the `.md` files at the edges and move upward.**

1. **Establish the truth at the edges.** For each plan `.md` file (or folder README) that may be wrong, read its own cursor and step list and, only if needed, the code its coverage names. Correct it so it honestly states where it really stands. The edge is the first writer and the source of truth — nothing above it can override it.
2. **Walk upward, re-aligning one parent at a time.** Go to the parent of each corrected child. Update the parent README's step marker for that child to match the child's now-correct status, and update the parent's cursor line so it names exactly the children that are actually in progress. Do not copy any of the child's internal detail up — the parent restates only the marker and, at most, one line of seam reasoning (why this child before that one).
3. **Stop as soon as a parent is unaffected.** Propagation reaches only as far as a marker change is visible. The moment a parent's own step status would not change, stop climbing that path.
4. **Repeat to the root**, fanning out wherever more than one child changed, until every parent README agrees with its child plan `.md` files and child folder READMEs.

Never edit a parent to match a child you have not yet verified, and never "fix" a child to match what its parent claimed — that inverts the direction and bakes the drift in.

A parent step line names the child it points at — a plan `.md` file (e.g. `dotenv.md`) or a plan folder (e.g. `json/`). The marker on that line (see the status markers in [INSTRUCTIONS.md](INSTRUCTIONS.md)) is the rolled-up status of the whole child.

## How to run the sweep

Walk from the root down to find the deepest plans, then repair upward from there. At each plan, compare every step marker and the cursor line against the actual status of the child it names (read the child's own `.md` file or folder README). Collect every mismatch, then apply the edge-first repair to each, deepest plans first so upward re-alignments land on already-corrected children.

If you arrived here because you already noticed one specific contradiction (e.g. a cold-resume read descended into a child whose real state did not match the parent), you don't need the full sweep — start at that child, treat it as the edge truth in step 1 above, and walk upward from there.

## When you are done

Every parent's step markers and cursor lines agree with the children they name, all the way to the root. A fresh cold-resume read from the root README now descends into exactly the children that are genuinely in progress and finds each child's state matching what its parent claimed.

A plain forgotten marker is yours to fix directly — no confirmation needed. But the moment a disagreement is **non-obvious or ambiguous** — it's unclear which side is right, or resolving it implies a real decision rather than a mechanical re-roll — **raise it in the plan's `QUESTIONS.md` and stop** until the user answers (the mechanism is **Blocking on a user decision** in [INSTRUCTIONS.md](INSTRUCTIONS.md)). Don't silently pick a side. Once answered, if the resolution turns on a non-obvious decision or reversal, record that one line in the relevant plan's `MEMORY.md` per the `MEMORY.md` rules in [INSTRUCTIONS.md](INSTRUCTIONS.md).
