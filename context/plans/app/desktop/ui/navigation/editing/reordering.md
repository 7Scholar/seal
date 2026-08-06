Part of [the editing plan](README.md).

# Scope

Moving a row to a new position: the interaction that does it, its keyboard equivalent, and how the resulting order reaches the model. Out of scope: what reordering moves and what it leaves in place, which [model.md](model.md) owns.

# Approach

## Move controls, not a drag

A row offers **Move up**, **Move down**, **Move to top** and **Move to bottom** as named outcomes in its overflow menu ([row-density.md](row-density.md) owns that placement; they were buttons in the row when this plan was first built). There is no drag-and-drop.

The reason is reach rather than taste. A drag needs a keyboard equivalent to be usable at all, and the equivalent is always a pair of move commands — so building the drag means building this anyway, plus a pointer interaction whose auto-scroll and drop-target behaviour would have to work inside the three-band frame's single scrolling region, at four hundred rows, in a window a user can make 720px tall. The buttons are the whole feature for every input device; a drag would be a second path to the same result, and the one more likely to break at the sizes [file.md](../file.md) measured.

The menu that carries them is labelled with the variable — *More actions for API_KEY* — so the items inside need not repeat it. A column of identical *Move up* buttons would be unusable by screen reader; a named menu solves that once for every item it holds.

A move that cannot act is **absent rather than disabled**: the first row's menu has no *Move up* and no *Move to top*. A disabled item among enabled ones reads as a fault in that row.

## The order reaches the model as a permutation

Moving swaps a row with its neighbour in the draft. At save, if the draft's managed rows are in a different order from the view's, one `Reorder` op carries **every managed row's id** in its new order — the model refuses a partial list, since omission must never be a way to delete.

Removed rows are still part of the permutation, because they are still in the file until the save lands. The op order matters: `Reorder` is emitted **before** the removals, so the permutation the model validates matches the file it is validating against.

## Moving past what is not there

The interface draws only managed rows, so a move is a swap with the *next managed row*, which on disk may sit several lines away with comments and blank lines between. Those stay where they are ([model.md](model.md)), so a variable moved past a comment heading does not carry the heading with it. The interface cannot warn about this, because it does not draw the thing that would change meaning.

# What was built

All of the Approach, with six tests. Two guards confirmed non-vacuous, and both break the same test — the one that pins the op order:

- **Emitting the reorder after the removals** fails 1, because the model validates the permutation against a file that no longer holds the removed rows.
- **Dropping removed rows from the permutation** fails 1, for the same reason from the other direction: until the save lands those rows are still in the file, so a permutation without them is not a permutation and the model refuses the whole list.

# Steps

- [x] Move up and move down on the row, labelled per variable, absent at the ends.
- [x] The permutation derived at save, ordered before the removals.
- [x] Tests: the swap, the labels, the ends, and the full-permutation requirement.

# Open threads

- Nothing yet.
