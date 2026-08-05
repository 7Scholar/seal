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

**Adding a folder Seal already manages is refused in a dialog, before any scan runs.** The dialog names the repository, states how many files are already managed and that nothing was added or changed, and points at *Scan for more files* as the way to bring in a file Seal missed. It offers opening that repository as its affirmative action, so the refusal ends somewhere useful rather than at a dead end. The refusal is on the **add** entry only: a rescan reaches the same surface deliberately and must keep working, which is [the protect-a-repo journey](../../../../../journeys/protect-a-repo.md)'s seventh step. Routing an add of a known folder into the manage surface is what this rules out — the surface would open in its rescan form, with every already-managed row inert, which answers a question the user did not ask and buries the fact that the folder was already there.

## The add tile

The grid's last cell is an **add tile**, the same size as a repository tile and drawn as an outline rather than a solid: a dashed border at the palette's strong line weight, a muted fill, and the plus and its label on **one row**, centred. It is the same action as the toolbar's primary button, placed where the eye ends up after reading the grid. Stacking the plus above the label is what this rules out — it made the tile read as an empty repository whose name happened to be *Add repository* rather than as an action.

## The tile

The whole tile navigates into its repository. Inside it exactly one control competes for the press — the **ellipsis** in the top-right corner — which is what keeps a large target unambiguous.

The tile carries, in order: the repository's **name**; its **path**, de-emphasised and monospaced; a **managed-file count**; and its **state**. The reference's region and plan-size line is replaced by these because they are the two facts that matter about a repository here — how much Seal is watching, and whether anything is wrong.

State on a tile is exposure and nothing else. A repository holding an exposed file says so, in the danger treatment, because that is an alert and alerts never collapse. A repository with nothing exposed says nothing at all — chrome scales to the count including to zero, so a healthy grid is a quiet grid of names.

The tile is a real button rather than a clickable box, so it is focusable, activates on Enter and Space, and announces itself as a control. The ellipsis inside it stops its press from reaching the tile, so opening the menu never also navigates.

## The ellipsis menu

The repository's secondary operations, collapsed per the disclosure architecture: **Scan for more files**, and **Stop managing this repository** in the danger treatment. Both are the operations the withdrawn shell's overflow carried, with their behaviour and their confirmations unchanged — including that removing a repository never deletes a file and states its disk consequence rather than defaulting it.

The owner's example named *unseal* as a candidate entry. It is deliberately **not** here: Seal offers no way to leave a managed file decrypted on disk ([the root intent](../../../README.md)), and the operation that legitimately ends with plaintext at the path is stopping management, which is already in this menu under a name that says exactly that. An entry labelled *unseal* would promise an operation the product does not have.

## Every state the grid can occupy

The grid is one surface in one visual language, whatever it holds. It is never replaced by a different layout.

**Empty** — the grid renders with the **add tile** in it and nothing else. The tile is the same size and shape as a repository tile, drawn with a dashed border and a `+`, and it starts the same add flow the toolbar's button starts. There is no heading, no paragraph and no centred call to action: the empty grid is a grid.

**One and populated** — repository tiles, and the add tile last. The add tile stays at every count, so the way to add is in the same place whether the user has none or twenty.

**Excessive** — tiles are a **fixed height**, and the name and path each truncate to one line with an ellipsis rather than growing the tile. A tile that sized to its content let one absurd name grow 60% taller than its neighbours and break the row. The path truncates from its **left**, keeping the meaningful tail visible, and the full value of both is carried in a `title`. The surface states the repository **count** beside its heading, so the size of what is below the fold is a fact rather than a scroll.

**Loading** — three **skeleton tiles** in the grid's own shape, marked `aria-busy`, while the overview is in flight. This state exists because without it the surface says *"nothing here"* about data it has not read yet, which is a false statement about the user's own product. The skeleton's pulse is dropped under `prefers-reduced-motion`.

**Error** — the overview failing states that Seal **could not read what it manages** and offers a retry, in the danger treatment, as an `alert`. It also says the repositories are untouched and still sealed, because the question a user actually has at that moment is whether their secrets are safe. This is a state and a consequence, not explanatory prose.

This state is **hard to reach from disk**, and that is a property of the layer beneath rather than of the surface: corrupting `registry.json` does not produce it, because the registry recovers from `registry.json.previous` and returns an empty set. The state is therefore driven by a rejecting `overview` in the interface tests. It is still worth having — the call can fail for reasons the registry's own recovery does not cover, and the alternative is the surface claiming the user manages nothing.

**No match** — a search matching nothing states that and offers to clear the field, inside the grid rather than replacing it.

The toolbar's search is disabled when there is nothing to search, and the add action is disabled only while loading.

# What exists

All of the Approach: the toolbar with its filter, the tile with its facts and its ellipsis, the menu with the two operations, and every state above.

Interface tests cover navigation from a tile, the ellipsis not navigating, the filter, the no-match state, the exposure treatment appearing only for a genuine exposure, the add tile at every count, the count, truncation carrying full values, and the loading and error states at the application level where the defect actually lived.

Guards confirmed non-vacuous by reintroducing the defect each prevents:

- letting the ellipsis press fall through to the tile — so opening the menu also navigates — fails 1
- showing a state tag on a repository with nothing exposed fails 1
- reordering rather than filtering on search fails 1
- removing the loading state, so an in-flight overview renders as an empty product, fails 1
- reporting a failed overview as `ready`, so a failure renders as an empty product, fails 1
- removing the add tile from the grid fails 2

# Steps

- [x] The grid and its tile, with whole-tile navigation.
- [x] The toolbar with the search filter and the add action.
- [x] The ellipsis menu with the repository's secondary operations.
- [x] The empty state as an add tile inside the grid.
- [x] Every other state: loading, error, excessive, no-match.
- [x] Tests, with each load-bearing rule confirmed non-vacuous.

# Open threads

- The grid's breakpoints are set against the window's minimum width rather than measured. Wants seeing at the sizes people actually use.
- Nothing virtualizes. At 25 repositories every tile is in the document, which is fine at the scale this product expects and would not be at a thousand. The count beside the heading makes the size visible; the DOM cost is untouched.
