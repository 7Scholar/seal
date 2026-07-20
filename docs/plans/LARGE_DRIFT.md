# Large-scale drift reconciliation

`CODE_DRIFT.md`'s loop (reconcile → re-stamp → re-run the detector) assumes a `DRIFT.md` small enough to work file by file, or slice by slice, straight through. That breaks down when a `DRIFT.md` is large (dozens of nodes, backend and frontend both, spanning many unrelated concerns) and some of its drift traces back to one architectural change that touches far more of the tree than any single folder-shaped slice would reveal. This doc is for that case: reconciling it well needs a different first move than reconciling it fast.

## Sweep the whole ledger before reconciling any of it

Classify **every** flagged file — incidental or real drift, and if real, which cross-cutting change (if any) it belongs to — before rewriting a single plan doc or re-stamping any coverage. Do this in two levels:

1. **Commit-level shape, once per commit.** For every distinct commit cited in the drift ledger, sample a few of its touched files to characterize it once: **mechanical** (one transformation applied uniformly — rename, import-path rewrite, codemod, formatting; a file in it is presumptively incidental unless it diverges) or **mixed/feature** (N independent real changes bundled together; every file needs its own look, no shortcut). This turns "diff every file" into "diff a sample per commit, then classify the rest against the pattern."
2. **Per-file classification, against its commit's shape.** For every flagged file, check its diff against its owning commit's shape. Matches the shape → incidental, one line, no prose. Diverges (real logic/shape change, or a rename that also changed behavior) → real drift, gets a short summary of what changed. As real-drift files accumulate, cluster them by what they share (a common new import, a common deleted mechanism, a common new call site) — that clustering is how a cross-cutting change gets named as its own thing, rather than being assumed upfront or missed entirely.

Even inside a commit characterized as mixed/feature, a minority of its files can still turn out to be no-op reformatting — the per-file check catches that rather than assuming either drift or safety from the commit-level label alone.

**Why sweep first instead of reconciling one self-contained-looking slice at a time:** a slice chosen for folder-tree locality (e.g. "the key-derivation files") can be a shallow cross-section of a much larger cross-cutting change — a handful of its files may be incidental noise from one architectural landing while the slice as a whole never surfaces that landing's full extent, because the other files it touches live in unrelated folders the slice never looks at. Reconciling that slice's docs in isolation produces a plan that's locally consistent but wrong about the bigger shift, and any structural question the change raises (e.g. "where does this new pattern's plan node live") gets answered from a partial view instead of the complete one.

**The tell that a slice is secretly cross-cutting:** its "real drift" traces back to the same commit(s) as unrelated-looking flagged nodes elsewhere in the ledger. That's the cross-cutting change signaling itself — stop reconciling that slice and go characterize the commit against the whole ledger before continuing.

The sweep produces a map, not a rewrite: it does not touch plan docs or coverage. A file classified incidental in the sweep still gets re-stamped later, under whichever group claims its node — the sweep just means that re-stamp doesn't require re-deriving "was this incidental" from scratch.

## Reconcile in groups carved from the sweep's findings

Once the sweep is complete, carve groups from what it actually found — which may not match the folder tree; a cross-cutting change can become its own group spanning several unrelated plan subtrees. Each group runs:

1. **Document** (real-drift files only) — write fresh documentation of the code as it stands now — behavior, not a file catalog (the "Specify behavior, do not catalog code" rule in `INSTRUCTIONS.md`). Before overwriting an existing doc, read its old Intent/Approach, not just its behavioral description — "code is the source of truth for behavior" does not license discarding _why_ the old plan did things a certain way. If the old doc names a concern the current code doesn't address, or contradicts it, don't silently drop it or silently keep it: resolve which side is right (see below), or flag it if you can't.
2. **Reconcile** — realign the affected plan node(s) directly if it's a same-shape doc-lag fix. If the group reveals a structural question (does a concern need splitting, does a new pattern need its own node, does a domain now span two places), raise it and stop that line of work rather than guessing, per `INSTRUCTIONS.md`'s "Blocking on a user decision."
3. **Close out** — re-stamp coverage for every touched node, confirm the ledger no longer flags the group's files (`run_coverage <plan-root> --verbose` per `CODE_DRIFT.md`).

## Resolve an old-intent conflict by reading the one downstream file that would have to carry it

When an old doc argues for a design property (e.g. "no plaintext is ever written to disk, only sealed blobs are ever stored") and it's unclear whether a refactor dropped that property deliberately or lost it as a side effect, the fastest and most reliable resolution is usually not more reading of the old doc or more reasoning about the refactor's stated goals — it's identifying the one current file that would have to implement the property if it survived, and reading that file directly. If the property survived, it's visible there in a few lines; if it didn't, its absence is just as visible.

**Why this works:** an old design's rationale argues for a property in the abstract, and a refactor's commit messages rarely re-litigate every property of every design they touch — silence in the commit message is not evidence either way. But a property that matters is almost always load-bearing somewhere concrete: a function that would have to construct the placeholder if the old constraint were violated, or a function that would have to fetch eagerly if the old batching were dropped. That function is a much smaller, more decidable thing to read than "did the team consider this."

This can settle a conflict without needing a `QUESTIONS.md` round-trip at all — check the code before assuming the question needs the user. It also cuts the other way: don't resolve the question by re-deriving intent from commit messages or doc prose alone (which can rationalize either answer) instead of checking the one place where the property would have to be visible if true.

## Cleaning up coverage after a rewrite has two distinct moves

A doc rewritten to describe a redesigned mechanism naturally covers a different file set than before — some old files renamed, some deleted outright, some new ones added. `add_to_coverage` only adds or updates entries for the paths you give it; it does not diff the doc's old covered-file list against the new one and prune what's no longer relevant. So:

- **A doc that's renamed or merged away** — its whole coverage key is orphaned. Drop it with `remove_from_coverage <plan.md>` (no paths).
- **A doc that survives but covers deleted files** — those individual stale entries need `remove_from_coverage <plan.md> <path...>` per file, or they sit in `coverage.json` forever (a deleted file can't drift, so it never fails a drift check — it just accumulates as dead weight misdescribing what the doc currently covers).

Re-stamping a rewritten doc by only calling `add_to_coverage` with the new file list and calling it done leaves the old deleted-file entries behind. Check the doc's pre-rewrite coverage entries against the current filesystem before considering the re-stamp finished.
