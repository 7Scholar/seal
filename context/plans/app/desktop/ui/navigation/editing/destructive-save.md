Part of [the editing plan](README.md).

# Scope

The one confirmation standing in front of a save that removes variables: when it appears, what it says, and what it is deliberately not. Out of scope: the delete verb itself and its undo ([surface.md](surface.md)).

# Approach

## The batch decides, not the click

Deleting a row raises **no dialog**. It marks the row locally and Cancel undoes it like any other pending change.

**The save inspects its own batch.** If the edit list contains any removals, one confirmation appears before anything is written. With no removals pending, saving proceeds directly — a confirmation that fires when nothing will be destroyed is exactly the ceremony [the disclosure rules](../../shell-layout.md) reserve for consequences.

The placement is the whole argument. Until the save, a delete has not happened; a dialog there guards nothing while taxing every click of the cleanup pass this feature invites. At the save, the removal is real and irreversible, and one dialog covers however many rows the batch removes.

## What it says

It names **what will be removed**, not merely how many — the variables are listed by key, because "3 variables will be deleted" asks the user to trust a count they cannot check against what they meant to do. Beyond a threshold the list is truncated with a remainder, so a batch removing forty rows does not produce a dialog taller than the window.

It states plainly that the values **cannot be recovered**, because this product has no history, no backup and no recovery path by design, and a user who has only ever deleted things in software that keeps a trash can will reasonably assume one exists.

It is a **plain confirm-and-cancel**. No typed phrase. That is a deliberate departure from [the acknowledgement gate](../../screens.md), and the boundary is the frequency of the act rather than its severity: the typed phrase exists for the irreversible acts a user meets once, and it is the only thing that cannot be satisfied by the reflex that opened the dialog. Removing a variable is routine work in a tool for managing variables, and a typed phrase on a routine act trains the reflex it exists to defeat. Responsibility rests with the user, stated once, at the moment it matters.

The confirming control names the outcome — *Delete and save* — rather than *OK*, per the confirmation primitive's own rule.

## What it does not do

It does not appear for a save that only changes values, renames keys, toggles rows, or creates them. It does not appear when a created row is discarded before saving, since nothing on disk was ever involved. And declining it leaves the whole draft intact — the user returns to their pending changes, deletions included, rather than losing the batch they were assembling.

# What was built

All of the Approach, with five tests: the confirmation raised once for a batch and naming each variable, the absence of any typed phrase, no confirmation for a save that only changes values, no confirmation when a created row is discarded before saving, and declining leaving every pending change intact.

Two guards confirmed non-vacuous: **saving without inspecting the batch** fails 5, and **rebuilding the draft when the confirmation is declined** — the plausible-looking "reset on cancel" — fails 1.

# Steps

- [x] The batch inspection and the confirmation it raises.
- [x] The listing with its truncation, and the unrecoverability statement.
- [x] Tests: raised on removal, absent otherwise, declining preserves the draft.

# Open threads

- Nothing yet.
