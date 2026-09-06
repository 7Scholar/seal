Part of [the navigation plan](README.md).

# Scope

The **repositories altitude**: the list of repositories, its toolbar, the per-row ellipsis menu, and the states that replace the list. Out of scope: the manage flow that adding a repository opens ([screens.md](../screens.md) and [repo-layer/adopting.md](../repo-layer/adopting.md)), and the trail above it ([breadcrumbs.md](breadcrumbs.md)).

# What & why

The top altitude and the application's landing surface. Every launch arrives here, so it carries both the steady-state view of everything Seal manages and the empty state of a fresh install.

# Approach

The surface is a **list of full-width rows**, not a grid of tiles. Its behavioural rules come from [the research](_docs/navigation-research.md); its layout and state language are the product owner's design.

**The screen is not named on the screen.** There is no heading and no repository count. The title bar's trail already says where the user is, and the rows are the count — a number above a list of the things it counts says the same thing twice.

## The toolbar

One row above the list: a **filter field** at the leading edge, and **Add repository** at the trailing edge. Nothing between them — the sort control, the status filter and the view toggle the reference carries are refused for scale, with reasons in the research.

**Add repository is outlined here and filled only in the empty state.** A screen with a list on it has more than one reasonable thing to do, so nothing on it earns the one filled button; a screen with nothing on it has exactly one, and that one is worth filling.

Search filters the list live on a case-insensitive substring of the repository's name or path. It filters rather than reorders, so a row never moves under the pointer. With no match the surface states that nothing matched, echoes what was typed, and offers to clear the field.

**A repository whose seal broke sorts to the top**, and that is the one thing allowed to reorder the list. The no-reorder rule exists so a row does not move while a user is typing, which happens constantly; a broken seal happens rarely and is the single event this whole surface exists to surface. The sort is unconditional and derived on render rather than timed against the pointer — a rule about *when* it is allowed to move would be a rule with a case in which the alarm is withheld, and there is no such case.

**Adding a folder Seal already manages is refused in a dialog, before any scan runs.** The dialog names the repository, states how many files are already managed and that nothing was added or changed, and points at *Scan for more files* as the way to bring in a file Seal missed. It offers opening that repository as its affirmative action, so the refusal ends somewhere useful rather than at a dead end. The refusal is on the **add** entry only: a rescan reaches the same surface deliberately and must keep working, which is [the protect-a-repo journey](../../../../../journeys/protect-a-repo.md)'s seventh step. Routing an add of a known folder into the manage surface is what this rules out — the surface would open in its rescan form, with every already-managed row inert, which answers a question the user did not ask and buries the fact that the folder was already there.

## The row

A row is `72px` and carries four lanes: the repository's **name** and **path**, its **ticks**, an **actions** lane, and the **ellipsis**. The last three are fixed widths, so they form vertical lanes down the list whether or not a given row has anything to put in them — a row whose seal is intact has an empty actions lane rather than a narrower one.

**A tick per managed file replaces every count.** Copper for sealed, faint and shorter for not sealed, red and full height for a broken seal. Nine ticks is the cap; beyond it the remainder is counted as `+n`. Height carries the same order as colour, so the state of a repository is legible before any colour is resolved — which is what makes it answerable at a glance and readable to someone who cannot separate the two hues.

**Truncation never hides a broken tick.** Below the cap the ticks are in file order; at or above it, broken files are drawn first. Nothing else in the product may be truncated into silence about a secret that is readable.

The ticks carry an accessible name stating the count and the breakdown in words, because the whole device is visual and a screen reader would otherwise get nothing at all.

The **whole row navigates** into its repository. The name is a real button, so it is focusable, activates on Enter and Space, and announces itself; its hit area is stretched over the row so a press anywhere lands on it. The ellipsis and the row's own actions sit above that area, so opening the menu never also navigates.

**A repository whose seal broke takes the matted wash**, an `ⓘ` explaining what a broken seal is, and a **Seal** action shown at rest rather than on hover. The explanation is behind the `ⓘ` because nobody has learned this vocabulary; the action is at rest because the row is asking to be acted on.

Red is not used for a repository that merely holds unsealed files. That is a resting state the developer chose, and the faint tick says it.

## The ellipsis menu

The repository's secondary operations, collapsed per the disclosure architecture: **Scan for more files**, and **Stop managing this repository** in the danger treatment. Both are the operations the withdrawn shell's overflow carried, with their behaviour and their confirmations unchanged — including that removing a repository never deletes a file and states its disk consequence rather than defaulting it.

*Unseal* is deliberately **not** in this menu, though the product now has the operation ([files.md](files.md) owns it). It belongs to a **file**, and this is a repository's menu — an unseal-everything entry here would be a single press that makes every secret in a repository readable, which is the one shape of this operation that is genuinely dangerous. Sealing a whole repository is safe in the direction that matters and unsealing one is not, so the asymmetry in what this menu offers is deliberate rather than an oversight.

## Every state the surface can occupy

Three conditions **replace** the list rather than appearing inside it; the rest are the list in a different shape.

**Nothing yet** — the list is replaced by a single quiet statement, *Nothing is under Seal yet.*, and the one action there is, filled. This is the only screen in the application where **Add repository** is the filled button.

**One and populated** — rows, in the registry's order.

**Excessive** — rows are a **fixed height**, and the name and path each truncate to one line with an ellipsis rather than growing the row. The path truncates at its end and carries its full value in a `title`. No count is stated; the scrollbar is the fact about size.

**Loading** — three **skeleton rows** in the list's own shape, marked `aria-busy`, while the overview is in flight. This state exists because without it the surface says *"nothing here"* about data it has not read yet, which is a false statement about the user's own product. The skeleton's pulse is dropped under `prefers-reduced-motion`.

**Error** — the overview failing **replaces** the list: Seal **could not read what it manages**, and a retry. It also says nothing on disk was touched and every sealed file is still sealed, because the question a user actually has at that moment is whether their secrets are safe. It is deliberately **not** red — Seal failing to read its own records is not an exposure, and red is reserved for the case where a secret is actually readable.

This state is **hard to reach from disk**, and that is a property of the layer beneath rather than of the surface: corrupting `registry.json` does not produce it, because the registry recovers from `registry.json.previous` and returns an empty set. The state is therefore driven by a rejecting `overview` in the interface tests. It is still worth having — the call can fail for reasons the registry's own recovery does not cover, and the alternative is the surface claiming the user manages nothing.

**No match** — a filter matching nothing **replaces** the list with the statement, the text that matched nothing, and **Clear**.

The add action is disabled only while loading.

# What exists

All of the Approach: the toolbar with its filter, the row with its four lanes, the ticks, the menu with the two operations, and every state above.

Interface tests cover navigation from a row, the ellipsis not navigating, the filter and its no-match state, the matted wash appearing only for a genuine broken seal, the ticks and their accessible name, the nine-tick cap with a broken file beyond it, truncation carrying the full path, the add action filled only when the list is empty, the absence of any repository count, and the loading and error states at the application level where the defect actually lived.

The surface carries a `data-surface="repositories"` attribute, which is what the driven scenarios anchor on. They previously anchored on a heading and on the add tile's class — both of which this design removes, and neither of which was ever a promise the surface made.

Guards confirmed non-vacuous by reintroducing the defect each prevents:

- sorting a broken repository anywhere but first fails 1
- letting the ellipsis press fall through to the row — so opening the menu also navigates — fails 1
- washing a repository with nothing broken fails 1
- reordering rather than filtering on search fails 1
- removing the loading state, so an in-flight overview renders as an empty product, fails 1
- reporting a failed overview as `ready`, so a failure renders as an empty product, fails 1

# Steps

- [x] The list and its row, with whole-row navigation.
- [x] The toolbar with the search filter and the add action.
- [x] The ellipsis menu with the repository's secondary operations.
- [x] Every state: nothing yet, loading, error, excessive, no-match.
- [x] The tick per managed file, replacing every count the surface stated.
- [x] Tests, with each load-bearing rule confirmed non-vacuous.
- [x] A repository whose seal broke sorts to the top of the list.

# Open threads

- Nothing virtualizes. At 25 repositories every row is in the document, which is fine at the scale this product expects and would not be at a thousand.
- The row's fixed lanes are set against this window's width. A narrower window has not been driven, and the name column is the only one that gives — the ticks, the actions and the ellipsis do not.
