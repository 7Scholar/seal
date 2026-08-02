Part of [the navigation plan](README.md).

# Scope

The **repositories altitude**: the grid of tiles, its toolbar, the per-tile ellipsis menu, and the empty state. Out of scope: the manage flow that adding a repository opens ([screens.md](../screens.md) and [repo-layer/adopting.md](../repo-layer/adopting.md)), and the trail above it ([breadcrumbs.md](breadcrumbs.md)).

# What & why

The top altitude and the application's landing surface. Every launch arrives here, so it carries both the steady-state view of everything Seal manages and the empty state of a fresh install.

# Approach

Built from [the research](_docs/navigation-research.md), whose reference is Supabase's project grid.

## The toolbar

One row above the grid: a **search field** at the leading edge, and **+ Add repository** as the primary button at the trailing edge. Nothing between them — the sort control, the status filter and the view toggle the reference carries are refused for scale, with reasons in the research.

Search filters the grid live on a case-insensitive substring of the repository's name or path. It filters rather than reorders, so a tile never moves under the pointer. With no match the grid states that nothing matched and offers to clear the field, which is a state rather than an explanation and so is not the disallowed prose.

## The tile

The whole tile navigates into its repository. Inside it exactly one control competes for the press — the **ellipsis** in the top-right corner — which is what keeps a large target unambiguous.

The tile carries, in order: the repository's **name**; its **path**, de-emphasised and monospaced; a **managed-file count**; and its **state**. The reference's region and plan-size line is replaced by these because they are the two facts that matter about a repository here — how much Seal is watching, and whether anything is wrong.

State on a tile is exposure and nothing else. A repository holding an exposed file says so, in the danger treatment, because that is an alert and alerts never collapse. A repository with nothing exposed says nothing at all — chrome scales to the count including to zero, so a healthy grid is a quiet grid of names.

The tile is a real button rather than a clickable box, so it is focusable, activates on Enter and Space, and announces itself as a control. The ellipsis inside it stops its press from reaching the tile, so opening the menu never also navigates.

## The ellipsis menu

The repository's secondary operations, collapsed per the disclosure architecture: **Scan for more files**, and **Stop managing this repository** in the danger treatment. Both are the operations the withdrawn shell's overflow carried, with their behaviour and their confirmations unchanged — including that removing a repository never deletes a file and states its disk consequence rather than defaulting it.

The owner's example named *unseal* as a candidate entry. It is deliberately **not** here: Seal offers no way to leave a managed file decrypted on disk ([the root intent](../../../README.md)), and the operation that legitimately ends with plaintext at the path is stopping management, which is already in this menu under a name that says exactly that. An entry labelled *unseal* would promise an operation the product does not have.

## The empty state

With no repositories the grid is replaced by the add call to action — one heading and the primary button, no illustration and no paragraph. This is the surface a fresh install lands on, and [the first-run journey](../../../../../journeys/first-run.md) asserts against it, so its copy is a contract rather than a choice: changing the words means updating the journey and the harness in the same change.

# What exists

All of the Approach: the toolbar with its filter, the tile with its facts and its ellipsis, the menu with the two operations, and the empty state.

Interface tests cover navigation from a tile, the ellipsis not navigating, the filter, the no-match state, the exposure treatment appearing only for a genuine exposure, and the empty state's action.

Guards confirmed non-vacuous:

- letting the ellipsis press fall through to the tile — so opening the menu also navigates — fails 1
- showing a state tag on a repository with nothing exposed fails 1
- reordering rather than filtering on search fails 1

# Steps

- [x] The grid and its tile, with whole-tile navigation.
- [x] The toolbar with the search filter and the add action.
- [x] The ellipsis menu with the repository's secondary operations.
- [x] The empty state, matching the journey's asserted copy.
- [x] Tests, with each load-bearing rule confirmed non-vacuous.

# Open threads

- The grid's breakpoints are set against the window's minimum width rather than measured. Wants seeing at the sizes people actually use.
