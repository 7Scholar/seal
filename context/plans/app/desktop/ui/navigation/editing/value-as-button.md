Part of [the editing plan](README.md).

# Scope

**The value itself as the row's control.** Clicking the masked value reveals it; clicking the revealed value edits it. Out of scope: the rest of the row's vocabulary and its overflow menu ([row-density.md](row-density.md)), and what a save does ([destructive-save.md](destructive-save.md)).

# What & why

Every row currently carries a Reveal control and an Edit control beside the value they act on. The product owner has asked for both to go: the value becomes the button, with an eye icon appearing on hover, and the two clicks — reveal, then edit — replacing the two controls. Rename, duplicate, comment out, move and delete move into the row's `⋯`.

The gain is two controls off every row, on a surface whose density is already the thing [row-density.md](row-density.md) exists to manage. The cost is that this node has to re-establish rules the removed controls were carrying, and one of them has more evidence behind it than anything else on this surface.

[screens.md](../../screens.md) holds the reveal contract: the toggle's state lives in `aria-pressed` rather than in its label or its glyph, it carries an accessible name that identifies its variable, it announces the state change, and **revealing a value is never an edit**. A single element that is a toggle on the first click and an activation on the second is not the shape any of that was written for — `aria-pressed` describes a two-state control, and this one has three positions (masked, revealed, editing) reached in sequence. What that element announces itself as, and how a keyboard user reaches both behaviours, is the question this node exists to answer rather than to assume.

The last rule is the one to be most careful with: reveal must still not mark the file dirty. Collapsing reveal and edit into one control puts the two a single click apart on the same element, which is exactly the adjacency that rule was written against — a surveyed product shipped that bug when it added click-to-reveal.

**Approved by the product owner.**

# Approach

TBD

# Steps

- [ ] Research solution directions
