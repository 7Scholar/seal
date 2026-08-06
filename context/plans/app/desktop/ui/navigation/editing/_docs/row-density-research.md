Supporting doc for [the editing plan](../README.md). Research input for the row's redesign, produced by the procedure in [docs/UX_RESEARCH.md](../../../../../../../docs/UX_RESEARCH.md).

# Concern

**The environment-variable row, once it carries the full editing vocabulary.** The surface is the file altitude's row list: one row per variable, inside a three-band frame whose middle band is the only scrolling region, in a desktop window a user may size down to 720px tall and roughly 800px wide. A file may hold four hundred variables; a key may be sixty characters long.

The row must express **eight operations** — reveal, edit the value, rename, enable/disable, duplicate, move up, move down, delete — and it currently expresses them as **eight controls side by side in the row**. That is the design under review. It was a deliberate first pass that got the vocabulary working and driven; it is not a design, and at populated width it reads as a wall of buttons with no hierarchy, no grouping, and a destructive verb sitting one pixel from a benign one.

**The constraints that make this surface unlike a generic data table:**

- **A value is a secret.** It arrives masked and crosses the boundary one row at a time on explicit request. No affordance may cause a bulk crossing, and revealing must never count as an edit — the rule with the most evidence behind it in this tree.
- **Everything is staged.** No operation touches disk until the user saves, and a save that removes anything confirms once. So a row's controls do not need the immediacy a settings toggle usually implies.
- **A row can be four things**: an ordinary variable, a disabled variable, a row marked for deletion, and a malformed line the model could not parse. Each needs a different set of controls, and the four must read as one surface.

**The family it must mirror.** This is not a fresh product. [shape.md](../../shape.md) fixes the radius, surfaces and tokens; [palette.md](../../palette.md) fixes the four-role colour rule and the split between `--primary` (a fill ink sits on) and `--accent` (a foreground on the page). [icons.md](../../icons.md) established that every glyph is a real inline SVG rather than a text character standing in for one. [disclosure-primitive.md](../../disclosure-primitive.md) fixes one contract for every collapsed control: a trigger carrying `aria-expanded`, dismissal on Escape and on outside click, focus returning to the trigger. **An overflow menu on this row is not a new component — it is that hook's fifth caller**, and building it any other way would re-open a divergence this tree already closed once.

The prior survey in [ui/_docs/ux-research.md](../../../_docs/ux-research.md) covered the editor's *semantics* — masking, reveal, copy, validation, duplicates. It did not cover **density**, because the editor it studied had three controls. This document covers only what that one does not.

# Sources surveyed

**IBM Carbon** — the only source giving a hard numeric threshold: fewer than three row actions stay inline as icon buttons, three or more go to an overflow menu. Its default is **persistent** overflow triggers rather than hover-revealed, with hover-only offered as an explicit opt-out, on the stated grounds that always-visible controls signal that actions exist at all. It also fixes the batch-mode rule: when any row is selected, per-row actions are disabled.

**Atlassian (Pragmatic drag-and-drop accessibility guidelines)** — the most prescriptive source on reordering, and it contradicts the folk answer. It recommends *against* arrow-key drag mode as the primary alternative, in favour of a menu of **named movement outcomes** — "Move up", "Move to top", "Move to position…" — because directional arrow movement forces screen-reader mode changes and does not always make sense. Two rules it states flatly: **exactly one action button per row** (never both a "More" menu and a separate drag-handle menu), and the drag-handle icon stays regardless of whether a menu exists. Announcements must carry the item name plus old and new position.

**GitHub Primer** — the competing convention: a six-dot grab handle with Enter/Space to pick up, arrows to move, Enter/Space to confirm, **Escape to cancel**. Its `ActionBar` contributes the density mechanism this surface actually needs: a `role="toolbar"` with **arrow-key navigation inside a single tab stop**, so N row actions cost one tab stop rather than N. It overflows by *fit* rather than by count, preserving source order into the menu.

**Linear** — the highest density-to-clutter ratio available: nearly every row action lives in a right-click context menu plus a command menu, with the row itself visually clean. Its distinctive contribution is treating the context menu as a **teaching surface**, each item displaying its keyboard shortcut.

**Nielsen Norman Group** — names the exact trap, and refuses to call the kebab a free lunch: single-record actions are either "crowded, with no text labels, and thus hard to click and also hard to distinguish" **or** "hidden under a hover gesture or a generic Actions menu, and thus hard to discover". Also fixes the edit-in-place rule: the row must *look different* in edit mode so the user can see what is editable.

**eBay Playbook and Nord** — switches are **trailing accessories** in a list row; the leading edge belongs to the scannable name, and the leading position is reserved for selection checkboxes. State is shown visually rather than by an adjacent "On"/"Off" label. Critically: **off must not be styled as disabled** — dimming an off-but-available row makes it read as unavailable.

**WCAG 2.2 and accessibility guidance** — the binding invariants, listed as rules below.

# Findings

## Tier 1 — table stakes, absent or broken here today

- **Three or more row actions belong in an overflow menu** (Carbon's threshold). We have eight. This is the finding the review exists for, and it is the difference between a considered row and a control dump.
- **A destructive action never holds a permanent slot beside benign ones.** Delete currently sits adjacent to Edit and Duplicate, one misclick apart. Its consequence here is a secret that exists nowhere else.
- **Nothing may be reachable by hover alone** — a WCAG 2.1.1 failure, and it does not exist on touch at all. This constrains the fix rather than the current state: the obvious cure for clutter is hover-reveal, and it is not available.
- **Targets ≥24×24px** (WCAG 2.5.8 AA). Dense icon clusters routinely ship 16px hit areas; any move to icon-only controls must not.
- **A single-pointer path for reordering** (WCAG 2.5.7 AA, new in 2.2). Reordering a list is the canonical failing example of drag-only. Our move buttons already satisfy this — the redesign must not lose it in the name of tidiness.
- **The row looks different in edit mode** (NN/g), so a user can see what is editable and cannot edit by accident.

## Tier 2 — strong, high value for this surface

- **One action button per row** (Atlassian), with movement outcomes *inside* that menu rather than as a second cluster. This is what collapses eight controls to a defensible number without losing a verb.
- **A toolbar with arrow-key navigation in one tab stop** (Primer). At four hundred rows the tab-stop arithmetic is the difference between a usable keyboard surface and an unusable one: seven controls per row is 2,800 tab stops to reach the footer.
- **Movement as named outcomes** ("Move up", "Move to top") rather than a spatial drag mode (Atlassian). It also reads better in a menu than a pair of arrows does in a row.
- **Persistent rather than hover-revealed controls** (Carbon's default), with hover raising emphasis rather than creating existence.
- **The switch trailing, with off ≠ disabled** (eBay/Nord). Our disabled row currently dims *and* strikes through, which is the exact conflation these sources warn about — except here the row genuinely is inactive in the file, which is the one case where dimming states a fact rather than a permission.

## Tier 3 — out of scope, with reasons

- **Right-click context menu carrying the full action set (Linear).** Genuinely the best density answer, and excluded for two reasons: a context menu alone is mouse-only and fails 2.1.1, so it must duplicate an accessible menu rather than replace one — meaning it is additive polish over the work below, not a substitute for it. And this product has no command menu or shortcut vocabulary for it to teach, so its most valuable property does not apply yet. Worth revisiting once the interface has shortcuts.
- **Drag-and-drop reordering with a grab handle.** The accessible implementations all require a parallel keyboard path plus live-region announcements with old and new positions, and Atlassian's own guidance prefers the menu of outcomes we are adopting anyway. Building the drag as well would add a second path to the same result and the one most likely to break inside a single scrolling region at four hundred rows — which is precisely where [file.md](../../file.md) measured this surface's worst defect.
- **Bulk selection with checkboxes and a batch bar (Carbon).** A real affordance, deferred rather than refused: it needs a batch vocabulary (delete these six, disable these six) that the edit list can express but no plan has designed, and Carbon's own rule that selection *disables* per-row actions makes it a mode over this surface rather than an addition to it. It belongs with bulk entry.
- **Inline editing by clicking the value directly** (Pencil & Paper's lowest-friction tier). Refused on the security model, not on taste: the value is masked and absent from the interface until revealed, so there is nothing to click into. The Edit affordance must fetch before it can edit, which makes it an action rather than a focus.

# States

Each is the same row with different contents, not a different component.

- **Ordinary variable** — key, masked value with its reveal control, and the action set. The populated case.
- **Disabled variable** — identical, plus the switch off and the key struck through at reduced emphasis. Its value stays masked and revealable, because a commented-out variable is still a secret.
- **Being edited** — the value replaced by an input holding the revealed plaintext. NN/g's rule applies: the row must read as different, not merely contain a different child.
- **Being renamed** — the key replaced by an input, with validation stated inline and the save blocked while it fails.
- **Newly created** — key and value both inputs, nothing to reveal, and no rename affordance since the key is already editable.
- **Marked for deletion** — struck through and dimmed, its action set replaced by a single **Undo**. It stays in the list: a list that silently drops rows shows neither what will happen nor a way back.
- **Malformed** — the raw text in a monospace input, with **Correct** and delete. No value, no reveal, no toggle, no rename, because none of them mean anything until the line parses.
- **Empty file** — the row region holds the add control alone, in the row list's own language rather than a centred sentence.
- **Excessive** — four hundred rows. The row region is the only scrolling region; the frame holds. Every control the row gains multiplies by four hundred, which is the argument for the collapse rather than a footnote to it.
- **Error** — a refused save states itself and the draft survives. Owned by [file.md](../../file.md) at the surface level; the row's own refusals (an invalid key, a Correct that will not parse) state themselves *on the row*, because a user should not be sent to a global banner for something they can fix where they are standing.
- **Loading and unavailable** — not the row's; the surface's, and unchanged.

# Best-practice rules

Extracted as invariants the build must honour:

1. **Three or more actions collapse into one menu.** Fewer than three stay inline.
2. **Exactly one action button per row.** Movement lives inside it, not beside it.
3. **A destructive verb never holds a permanent slot** adjacent to a benign one.
4. **Nothing is reachable by hover alone.** Hover and focus adjust emphasis; every control stays in the document, focusable and tappable. Every `:hover` rule is mirrored by `:focus-visible`.
5. **Every interactive target is at least 24×24px.**
6. **Reordering has a single-pointer path with no dragging and no travel.**
7. **A row in edit mode looks different**, not merely populated differently.
8. **The switch is trailing; off is not styled as disabled** — except where the row genuinely is inactive, where the dimming states a fact about the file rather than a permission.
9. **A row's own refusal states itself on the row.**
10. **Revealing is never an edit** — carried forward from the existing rules, and restated because a larger control set is exactly when it gets broken.

# Synthesis — what to build

**The row collapses from eight controls to three, plus one menu.**

**What stays in the row**, chosen by frequency and reversibility:

- **The reveal control**, inside the value. It is the row's most-used affordance and the reason the surface exists.
- **Edit**, the dominant action. Highest frequency, fully reversible before save.
- **The enabled/disabled switch**, trailing. It is a *state* rather than a command — putting a stateful control in a menu hides the row's own condition, and the switch is how the file's shape is read at a glance.

**What moves into the overflow menu**, in this order: **Rename**, **Duplicate**, **Move up**, **Move down**, **Move to top**, **Move to bottom**, and — after a separator, styled as destructive — **Delete**.

The two absolute-position moves are new. They come from Atlassian's finding that movement reads better as named outcomes than as repeated arrow presses, and they cost nothing: the model's `Reorder` already carries a full permutation, so "to top" is the same operation with a different index.

**The menu is the disclosure hook's fifth caller**, not a new component: `aria-expanded` on the trigger, Escape and outside click dismiss, focus returns. Its trigger is a vertical ellipsis, the same glyph the repository tile already uses, so the gesture is learned once.

**The row's controls form one toolbar with a single tab stop**, arrow keys moving within it. At four hundred variables this is the difference between 2,800 tab stops and 400 — the finding with the largest measured consequence on this surface, given it is the one [file.md](../../file.md) already had to rescue from a 26,000px layout failure.

**Load-bearing vs. rounding-out.** Load-bearing: the collapse to three plus a menu, the destructive separation, the single tab stop, and every state above rendering in one language. Rounding-out: the two absolute moves, and the menu items carrying their own icons. Under pressure the absolute moves are the first thing to cut — they are convenience over a path that already exists.

**What is deliberately not built** is carried from Tier 3: no drag-and-drop, no right-click menu, no bulk selection, no click-the-value-to-edit. Each has its reason recorded there so the next pass does not re-open it by accident.

# Open threads

- **Whether Edit earns its permanent slot or should also collapse.** The case for collapsing it: the row would then hold reveal, switch, and menu — three things, unarguably clean. The case against: editing a value is the single most common reason a user opens this file, and burying the product's primary verb one click deeper to win tidiness is the trade NN/g warns about in the other direction. Built with Edit in the row; worth revisiting against a real user rather than an argument.
- **The malformed row's control set has not been density-reviewed**, because it holds only two actions and falls under the threshold. If Correct ever grows siblings, it inherits this document's rules.
