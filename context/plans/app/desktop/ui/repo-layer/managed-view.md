Part of [the repo-layer plan](README.md).

# Scope

The steady-state repository surface: the same tree drawn over only the files Seal manages, replacing the flat file list the repository detail surface shows today. Out of scope: the tree primitive itself, which [adopting.md](adopting.md) owns and this plan reuses; the scan's shape ([scan-shape.md](scan-shape.md)), which this surface does not call at all.

# What & why

A user meets [the adopting surface](adopting.md) once per repository and this one every day after. If the two disagree about what a repository looks like, the framing wins at adoption and is lost immediately afterwards — the product would tell the user "this is your repository, annotated" once, then spend the rest of its life showing them a flat list of paths, which is the inventory shape the whole concern exists to remove.

So the steady state is the same view at a lower fidelity: the repository's structure, drawn over the managed set alone. Because Seal typically manages a handful of files, the tree collapses to a few rows and a couple of directory levels — the structure costs almost nothing here and buys the thing that matters, which is that a managed file is seen **where it lives** rather than as a path string on a row.

# Approach

## The same tree, drawn over the managed set

The surface reuses [adopting.md](adopting.md)'s tree primitive with a different input: only managed files, with the directories needed to position them. A file managed at `services/api/.env` appears under `services/` and `api/`, which are drawn as structure rather than as anything actionable.

**There are no checkboxes for management here, and nothing is proposed.** This surface answers "what does Seal cover in this repository, and what state is it in" — the question of what *else* could be covered is the adopting surface's, reached by rescanning. Directories on this surface are pure structure: they position files and nothing more.

Since the managed set is small, everything is **expanded by default**. The computed-expansion rule from the adopting surface degenerates to "expand it all" rather than being a separate mechanism, and there is no collapsing worth doing on three rows.

## What the rows carry, unchanged

Every behavioural rule the repository detail surface holds today survives this change, because none of them is about the list being flat:

- Each file's state tag in the established vocabulary — sealed, readable, not found — as a fact that never collapses.
- The exposure treatment reserved for the genuine regression, derived from the per-file alert flag rather than from the state, never shown for a missing file or one the user deliberately left readable.
- Sealing offered only where it applies, releasing offered per file, and the batch selection that seals a chosen set together — which is selection for an *action*, distinct from the adopting surface's selection for *management*, and must not be visually confused with it.

The exposure alert stays exactly where [screens.md](../screens.md) and [shell-layout.md](../shell-layout.md) put it: on the surface, undismissible, above the tree rather than inside it. An alert positioned on a row could be hidden by a collapsed ancestor, and disclosure never defers an alert.

## Two selections, one surface

This surface already has a selection concept — the set of files a batch seal will act on — and the adopting surface has a different one. They must not look alike. The batch selection is an *action* scope chosen and spent immediately; the adopting selection is a *management* proposal that persists as configuration. Reusing one visual treatment for both would teach the user that checking a box in Seal means one thing when it means two.

# What exists

Nothing yet. The current repository detail surface renders a flat file list with all of the behavioural rules above; this plan changes the shape it renders them in.

# What is missing

All of the Approach.

# Steps

- [ ] Draw the managed set through the tree primitive, with directories as pure structure and everything expanded.
- [ ] Carry the existing per-file behaviour onto the tree rows unchanged: state tags, sealing where it applies, releasing per file.
- [ ] Keep the batch-seal selection visually distinct from the adopting surface's management selection.
- [ ] Update [shell-layout.md](../shell-layout.md)'s Approach, whose detail-surface description states a file list.
- [ ] Tests: the existing repository-surface assertions hold against the tree — the alert derived from the per-file flag, a missing file never treated as an exposure, sealing offered only where it applies — plus a managed file appearing under its real directory chain.

# Open threads

- Whether this surface can reach the rest of the repository without a rescan. `git-crypt status` shows covered and uncovered in one view, and the answer that settled the two fidelities deliberately left open whether the lower one can expand back to the higher one in place. It wants deciding once both surfaces exist and can be compared, rather than on paper.
