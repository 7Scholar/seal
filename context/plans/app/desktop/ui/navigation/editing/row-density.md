Part of [the editing plan](README.md).

# Scope

**How the row presents its vocabulary**, once it has one: which operations hold a slot, which collapse, how the set is reached by keyboard, and how the four kinds of row read as one surface. Out of scope: what the operations *do* ([surface.md](surface.md)), what crosses the boundary ([boundary.md](boundary.md)), and the save's confirmation ([destructive-save.md](destructive-save.md)) — this plan moves controls, never behaviour.

# What exists

Eight controls side by side in every ordinary row: reveal, Edit, Rename, the enabled switch, Duplicate, Move up, Move down, Delete. It got the vocabulary working and driven, and it is not a design. Three findings in [_docs/row-density-research.md](_docs/row-density-research.md) indict it directly:

- **Carbon's threshold is three.** Three or more row actions belong in an overflow menu; we have eight.
- **A destructive verb sits permanently beside benign ones.** Delete is one misclick from Edit and Duplicate, and its consequence here is a secret that exists nowhere else.
- **Seven controls per row is seven tab stops per row.** At the four hundred variables [file.md](../file.md) measured, that is **2,800 tab stops** between the top of the file and the save control.

# Approach

## Three in the row, everything else in one menu

The row keeps exactly three interactive things, chosen by frequency and by whether they are commands at all:

- **The reveal control**, inside the value. The row's most-used affordance and the reason the surface exists.
- **Edit**, the dominant verb, fully reversible before a save.
- **The enabled/disabled switch**, at the trailing edge. It stays because it is a **state, not a command**: a stateful control inside a menu hides the row's own condition, and the switch is how a user reads the file's shape at a glance.

Everything else collapses into **one overflow menu** per row — Atlassian's rule that a row carries exactly one action button, which is also what keeps movement from becoming a second cluster beside the first. Its order:

**Rename**, **Duplicate**, **Move up**, **Move down**, **Move to top**, **Move to bottom**, then a separator, then **Delete** as the destructive item.

The two absolute moves are new, and they are cheap rather than clever: the model's `Reorder` already carries a full permutation, so *to top* is the same operation with a different index. They exist because movement reads better as a named outcome than as repeated arrow presses.

**The menu is [the disclosure primitive](../disclosure-primitive.md)'s fifth caller, and the `Overflow` component's fourth**, not a new thing. It is the same vertical-ellipsis trigger the repository tile and the file row already carry, with the same `aria-expanded`, the same Escape and outside-click dismissal, the same focus return, and the same `overflow__danger` treatment for the destructive item. A user learns the gesture once and it works everywhere; a second menu component would re-open the divergence [disclosure-primitive.md](../disclosure-primitive.md) closed.

## The row is one tab stop

The row's controls form a **toolbar**: `role="toolbar"`, one element in the tab order, arrow keys moving between the controls inside it. Home and End reach the ends. This is Primer's `ActionBar` pattern, adopted for the reason the measurement gives rather than for fidelity — it takes four hundred variables from 2,800 tab stops to 400, and it is what makes the keyboard path to the footer usable at all.

Tabbing therefore moves *between rows*; arrows move *within* one. Entering a row's toolbar focuses the control that was last focused there, or the first if none was — the roving-tabindex convention, so returning to a row does not always land on reveal.

## What may never be hidden

**Nothing is revealed by hover.** The obvious cure for clutter is to show the controls only on hover, and it is unavailable: hover-only functionality fails WCAG 2.1.1, does not exist on touch, and is what makes a surface undiscoverable in the first place. Hover and focus adjust **emphasis**, never existence — every control stays in the document, focusable and tappable, and each `:hover` rule is mirrored by `:focus-visible`.

Every interactive target is at least **24×24px** (WCAG 2.5.8), which the icon-only trigger must be held to explicitly since that is exactly where dense rows ship 16px hit areas.

## The four kinds of row, in one language

- **Ordinary** — key, masked value with reveal, Edit, switch, menu.
- **Disabled** — the same, switch off, key struck through at reduced emphasis. Its value stays masked and revealable, because a commented-out variable is still a secret. The research warns that *off* must not be styled as *disabled*; here the dimming is correct because the row genuinely is inactive **in the file** — it states a fact rather than a permission, which is the one case the rule exempts.
- **Being edited or renamed** — the row **looks different**, not merely holds a different child: it carries an edit treatment so a user can see what is editable. NN/g's rule, and the thing that keeps an edit from happening by accident.
- **Created** — key and value both inputs, no reveal (there is no stored secret behind it), and no Rename in the menu since the key is already an input.
- **Marked for deletion** — struck through, its controls replaced by a single **Undo**. Unchanged; it stays in the list rather than vanishing.
- **Malformed** — raw text, **Correct**, and delete. Below the collapse threshold, so it keeps its controls inline; it inherits these rules if it ever grows a third.

## The row's own geometry

The row is a **three-column grid** — the key at `minmax(6rem, 18rem)`, the value filling what remains, the controls sized to their content — rather than a flex row. Flex let the key win the negotiation at `flex: 1`, taking 355px and squeezing the controls into a column they stacked inside. The key now truncates with an ellipsis instead.

**The value column looks empty and is not.** A masked value is eight dots in a column wide enough for a connection string, which reads as wasted space until a value is revealed into exactly that space and the row does not reflow. The width is reserved rather than spare.

**Below 40rem the row stacks** — key on its own line, controls beneath — rather than wrapping. Wrapping is what a flex row does on its own and it produced a four-line row; stacking is two lines and deliberate. The threshold is where a sixty-character key plus a value plus three controls stops fitting, measured rather than chosen.

# Steps

- [x] The overflow menu as `Overflow`'s fourth caller, carrying rename, duplicate, the four moves and the destructive delete.
- [x] The row as a toolbar with one tab stop and roving focus.
- [x] The edit-mode treatment, and the target-size floor on the trigger.
- [x] Tests, including the tab-stop count and that nothing depends on hover.

# What was built

All of the Approach. The interface suite is **252 tests**, and a driven scenario of its own (`bun run e2e:density-row`) measures the row in the real window.

**The redesign's central claim is measured rather than argued: a row went from 192px to 66px.** At sixty variables in a 640px viewport, every row rendered **192px tall — four lines** — because the controls could not fit across and stacked. After the collapse and the grid it is **66px, one line**, at every window width tested. That measurement is the reason this pass existed, and it was not visible from the code: every unit test passed while each row was four lines tall.

The layout fix was not the collapse alone. The row was `display: flex` with the key at `flex: 1`, which let the key take 355px and squeezed the controls into a 208px column they then stacked inside. It is now a **two-column grid** — `minmax(6rem, 16rem)` for the key, the rest for the controls — so the key truncates with an ellipsis rather than winning the negotiation.

**A measurement trap is worth recording**, because it made the first fix look wrong: the window is sized in CSS pixels but the display is 2×, so `setWindowSize(1280, 720)` yields a **640px viewport**. A test that believes it is measuring a wide window is measuring a narrow one, and the "900px" case was really 450px.

**Three defects were found by looking at the running application, after every measurement passed.** This is the pass [SURFACE_AUDIT.md](../../../../../../docs/plans/SURFACE_AUDIT.md) exists for, and it caught what the numbers could not:

- The **malformed row** put its text field in a narrow column, `Correct` across the full width, and `Delete` wrapped onto a line of its own. It is now a two-column grid like every other row.
- The **value looked stranded** — a small dot cluster adrift in a wide gap. The CSS selector for it named `.secret` while the component renders `.secret-value`, so the rule had never matched anything. Confirmed correct only by revealing a value and seeing it fill the space.
- The **narrow-window stack did not exist**, so a row wrapped to four lines at a 450px viewport.

Four guards were confirmed non-vacuous:

- **Putting Delete back in the row** fails the destructive-separation check, which asserts that no control in the row carries a delete name.
- **Removing the roving tabindex**, so every control is a tab stop, fails the one-tab-stop check.
- The driven set fails on **row height** if the grid is reverted, and on **target size** if the 1.75rem floor is dropped.

# Open threads

- Whether **Edit** should also collapse, leaving reveal, switch and menu. Cleaner by count; buries the product's primary verb one click deeper. Built with Edit in the row, and worth revisiting against a real user rather than an argument.
