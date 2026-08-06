Part of [the editing plan](README.md).

# Scope

The row and its verbs at the file altitude: create, rename, delete, duplicate, the enabled/disabled toggle, the malformed row's free-text field and its **Correct**, and how pending structural change is drawn. Out of scope: reordering's interaction ([reordering.md](reordering.md)), the destructive save's confirmation ([destructive-save.md](destructive-save.md)), and the three-band frame [file.md](../file.md) already established.

# What exists

The editor draws one row per variable: the key as static text, a masked value with a reveal toggle, and an **Edit** button that swaps the value for an input. Reveal and edit write to separate state, and only the edit map feeds the dirty count and the save payload — the rule [screens.md](../../screens.md) holds with the most evidence behind it.

Nothing creates, deletes, renames, duplicates or toggles. Malformed lines and duplicate keys are reported as notices above the rows.

# Approach

## One pending model for every verb

The editor holds a **draft**: the rows as the user has arranged them, derived from the opened view and mutated locally by every verb. Nothing reaches disk until save.

The draft is a list of entries carrying `{ id, key, value?, disabled, removed, created, malformedText? }`, and the **edit list sent at save is derived from the difference** between the draft and the view it started from, rather than accumulated as the user works. Deriving it is what makes the surface's undo trivial — undo is a state change in the draft, not a compensating operation — and it means a user who edits a value and then edits it back sends nothing, which is correct and would take explicit cancellation to achieve under accumulation.

**Reveal stays outside the draft**, in its own map, exactly as today. The rule that revealing is never an edit is the one with a shipped-defect behind it, and a larger vocabulary is precisely when it gets broken.

The dirty count now counts **changes** rather than edited values: a created row, a removed row, a renamed key, a toggled row and a changed value each count one.

## The verbs on a row

**Edit a value** — unchanged: press Edit, the masked value becomes an input holding the revealed plaintext.

**Rename** — the key becomes editable in place. Reached from the row's overflow menu rather than a control in the row, which [row-density.md](row-density.md) owns; not offered on a created row, whose key is already an input.

**Toggle enabled/disabled** — a switch on the row, labelled by what the row *is* rather than by what pressing it does, with its state in `aria-checked`. A disabled row is drawn at reduced emphasis with its key struck through, so the file's shape is readable at a glance. **Its value stays masked and revealable** — a commented-out variable is still a secret.

**Delete** — reached from the overflow menu, below a separator and styled as destructive ([row-density.md](row-density.md)). Marks the row removed. It stays in the list, struck through and dimmed, with its verbs replaced by a single **Undo**. It is not hidden: a list that silently drops rows shows neither what will happen nor a way back, and the confirmation this product puts in front of destruction lives at the save ([destructive-save.md](destructive-save.md)), which is only honest if the user can see what they are about to destroy.

**Duplicate** — reached from the overflow menu. Inserts a new row directly after the source, carrying its value and disabled state, with a key derived by suffixing `_COPY` and, if that is taken, `_COPY_2` upward until it is free. A duplicate arrives with a **legal key** rather than an empty one, because arriving invalid would make the surface's first act after a duplicate be an error state.

**Add** — a control at the end of the row list appends an empty row with its key input focused. A created row's key and value are both plain inputs; there is nothing to reveal because there is no stored secret behind it.

## What a row must not do

**A created or renamed key is validated as the user types**, against the same rule the model applies: non-empty, no whitespace, no `#`. An invalid key marks its input `aria-invalid`, states why beside it, and **disables the save** — the boundary would refuse the whole list, so letting the user press save to discover that would spend a round trip and a confirmation on a preventable error.

**A duplicate key is not an error.** The file may legitimately hold one, the model preserves both, and the existing notice already explains that tools disagree about which wins. Creating one is allowed and the notice covers it.

## The malformed row

A malformed line is drawn as a row in its place in the list, showing its raw text in a full-width monospace input, with **Correct** beside it. Correct parses the current text and, on success, replaces the row with an ordinary variable row. On failure it says the text is still not a variable and shows the shape one takes — the refusal is local to the row, so a user is never taken to a global banner for something they can fix where they are standing.

The row can also be **deleted** like any other, which is the only way to remove a line Seal cannot parse.

The notice counting unparseable lines is **withdrawn**: it existed because the lines were invisible, and a count of things the user can now see and act on is noise.

## How the verbs are presented

This plan fixes what each verb *does*. Which of them hold a slot in the row and which collapse into an overflow menu is [row-density.md](row-density.md)'s, taken after the vocabulary was built and driven: the row keeps reveal, Edit and the switch, and everything else lives behind one menu.

## Every state the surface can occupy

The rule the altitude established holds: states are the same surface, not different screens.

- **Empty** — a file with no variables draws the **add row control alone**, in the row region, rather than the current bare sentence. The one thing possible is the one thing offered, which is the shape the repositories grid settled on for its own empty state.
- **One / populated** — the ordinary list.
- **Excessive** — unchanged from [file.md](../file.md)'s three-band frame: the rows are the only scrolling region and the footer is pinned, so the save control stays reachable at any variable count.
- **All rows removed** — every row struck through, the save enabled, and the count stating what will be destroyed. Not an empty state: the file still holds those variables until the save lands.
- **Loading / error / unavailable** — unchanged, and owned by [file.md](../file.md).

# What was built

All of the Approach, with the interface suite at **233 tests**.

Three guards were confirmed non-vacuous by reintroducing the exact defect each prevents:

- **Making reveal write into the draft** — the shape a surveyed product shipped, and the rule with the most evidence behind it — fails 5.
- **Dropping the key validation from the save's disabled condition** fails 1.
- **Making delete drop the row immediately** rather than marking it fails 1.

## Two findings from building it

**A guard that read as load-bearing was unreachable, and the attempt to prove it non-vacuous is what exposed that.** The derivation anchors each created row to the last row from the *opened view*, and it carried a check that the anchor was a known id — protecting against anchoring an insert to another created row's negative draft id, which the boundary would refuse. Removing that check failed nothing, across three deliberately-strengthened attempts. The reason is structural: a created row `continue`s before the anchor is updated, so the anchor can only ever hold an id the view supplied, and the check could never fire. It is removed rather than left in place, because unreachable code that reads as a safety check sends the next reader to test what never runs.

The ordering it produces is the part worth stating: consecutive inserts sharing one anchor each land immediately after it, so they are emitted **in reverse** to come out in the order the user arranged them. That is asserted directly rather than left to be rediscovered.

**Every created row shared one accessible name**, found when a test could not distinguish two of them. A screen-reader user met the same defect: several rows called *Name for the new variable* with nothing to tell them apart. The name now carries the key once typed, and an ordinal while the row is still unnamed — for both the key field and the value field, since the value field had the same failure through `Value for ${key}` with an empty key.

# Steps

- [x] The draft model, with the edit list derived by difference and reveal held outside it.
- [x] The row verbs: rename, toggle, delete with undo, duplicate, add.
- [x] Key validation as typed, blocking the save.
- [x] The malformed row with its free-text field and Correct.
- [x] The empty state as the add control.
- [x] Tests, with the reveal-is-not-an-edit rule re-asserted across the new verbs.

# Open threads

- Nothing yet.
