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

## Three positions, two controls

The value occupies three positions — **masked**, **revealed**, **editing** — and they are carried by **two** elements, not by one element with three states.

**Masked and revealed are one button.** It draws the dots or the value, it is pressed to move between them, and it is the only thing in the row that does so. An **eye** appears beside the dots on hover, as a hint that the text is a control; it is decoration rather than a control, so nothing is lost where hover never happens.

**Editing is an input that replaces that button.** A press on a revealed value swaps the button out for a text field. At any moment the element is therefore either a two-state toggle or a text input, never a control with three positions — which is what keeps every rule below expressible.

## The reveal contract, in the new shape

[screens.md](../../screens.md) holds it and none of it is weakened:

- **State lives in `aria-pressed`**, not in a label or a glyph. The button is a toggle between masked and revealed and reports which it is.
- **The accessible name identifies the variable**, so two rows are never confused — and it names **what a press will do**, because the same press reveals or edits depending on where the value already is. *Reveal DATABASE_URL* when masked, *Edit DATABASE_URL* when revealed.
- **The state change is announced**, unchanged.
- **Revealing is never an edit.** Reveal is held outside the draft entirely; only the draft's difference from the opened view feeds the change count and the save payload. This rule has the most evidence behind it in the whole surface, and collapsing reveal and edit onto one element puts them a single press apart — which is exactly the adjacency the rule was written against, and why it is guarded in both directions.

## Escape re-masks

Removing the Reveal control removes the **Hide** control with it, and the design draws nothing in its place. That would leave a revealed secret on screen with no way to put it back until the fifteen-minute expiry — in a product whose whole claim is that secrets are not readable at rest, and in the exact situation a user needs it: somebody walked over.

**Escape re-masks a revealed value.** It is the conventional dismissal, it costs no chrome, and it closes the hole. The expiry re-mask ([freshness.md](../freshness.md)) is unchanged and still the backstop.

## What comes off the row

**Reveal and Edit both go**, which is two controls off every row. **Comment out** joins Rename, Duplicate, Move and Delete in the `⋯`, replacing the enabled/disabled switch that sat on the surface. What remains on the line is the key, the value, and the `⋯`.

**Move to top and Move to bottom stay in the menu**, though the design's board draws only Move up and Move down. They are built, driven and free; a rare-actions menu is where a rare action belongs, and dropping a working capability to match an illustrative list would be a reduction the design does not actually ask for.

# What exists

All of the Approach. The row holds exactly two controls — the value and the `⋯` — down from four.

Twelve tests cover the control itself, including that a press reveals and a second press edits, that Escape re-masks and does nothing when nothing is revealed, and that no copy control exists. The editor's own suite reaches its edit field through both presses, which is what a user does.

Two defects came out of building it, both found by driving rather than by the unit suite. The value button was **18px tall inside a 44px row**, below the accessible target floor, because a flex child does not stretch by default. And revealing **disabled the button while the reveal was in flight**, which blurred it — so Escape had nothing focused to reach and a revealed secret could not be put back at all. It reports `aria-busy` and guards re-entry internally instead.

# Steps

- [x] Settle how three positions live on two elements, and restate the reveal contract against that shape.
- [x] Build it, and take Reveal, Edit and the enabled switch off the row.
- [x] Guard both directions of "revealing is never an edit", and that Escape re-masks.
- [x] Carry the reveal-or-edit intent through the expiry resume, so unlocking returns the user to what they were doing.
