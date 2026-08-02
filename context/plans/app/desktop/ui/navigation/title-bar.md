Part of [the navigation plan](README.md).

# Scope

The title bar as a **real window control surface**: dragging the window by it, double-clicking it to zoom, and the exclusion that keeps its own controls clickable. Out of scope: what the strip contains, which [breadcrumbs.md](breadcrumbs.md) and [theme.md](theme.md) own.

# What & why

The window is configured with an overlay title bar ([shell.md](../../shell.md)) so the interface can draw its own strip where the platform's title bar would be. That is what lets the trail and the session controls live there instead of costing a second horizontal band.

The cost of taking that space over is that the interface must supply what the platform's own title bar gave for free, and it did not. **The strip cannot drag the window and does not zoom on a double-click** — behaviour every desktop application has and whose absence reads as the window being broken rather than as a missing feature.

The markup carried `data-tauri-drag-region` on the header all along, which is exactly why this went unnoticed: the attribute is present, so the behaviour looks implemented. It does nothing on its own for the two reasons the Approach records.

This is a **bug**, so it follows the bug arc: reproduce, diagnose, fix, confirm the reproduction is gone.

# Approach

## The reproduction

Driven in the real application against the shipped markup, by evaluating the framework's own drag-region decision at four points in the strip: its bare surface, the spacer, the breadcrumb trail, and the current segment. The shipped strip answered **true only for its own bare surface** and false for all three children — so the parts of the strip a user actually presses could not drag the window. Re-run after the fix, all four answer true.

This must be driven rather than unit-tested. The decision depends on the framework's injected script and the real element tree, neither of which exists in the interface's own test environment, which is precisely the class of defect [the interface plan](../README.md) requires driving to confirm.

## Dragging is decided in JavaScript by the attribute, not by CSS

The framework injects a script that walks the composed path of every mouse press and decides whether that press starts a drag. Two facts about that walk govern the whole design here, and both are the opposite of the obvious guess:

**The CSS app-region property has nothing to do with it.** It is not consulted, and this webview discards the declaration at parse time — measured: the rule does not survive into `cssRules` and reads back empty from `getComputedStyle`, in both a working and a broken build. Setting it is inert, which makes it worse than useless: it looks like the mechanism and silently is not.

**A bare attribute means the element itself only.** The attribute has three meanings — bare or `true` drags only on a direct press of that exact element, `deep` drags on a press anywhere in its subtree, and `false` blocks dragging. The strip therefore carries **`deep`**, because everything a user would press in it — the trail, the current segment, the empty space — is a child, and a bare attribute answers false for every one of them. A strip marked bare is the shipped defect above: technically marked, effectively dead.

**Interactive children need no exclusion, and must not be given one.** The same walk stops at the first clickable element it meets — a button, an input, a link, anything with a non-negative `tabindex` or an interactive role — and refuses the drag there. So every control in the strip already excludes itself by being a control, and the framework's `false` value is reserved for the rare non-interactive element that must not drag. Adding per-control exclusions is redundant, and expressing them in CSS is doubly so, since the property is inert.

## Double-click to zoom

The same script handles it, on the same decision: a double press inside a drag region asks the window to toggle its maximised state, on this platform deferred to the release so a drag can cancel it. It follows from the region being correct rather than being separate work.

## What the strip must not do

It must not select text on a drag, and it must not show a text cursor: both make the strip feel like content rather than chrome. Its own labels are unselectable for that reason.

# What exists

All of the Approach. The strip drags the window from every part of it a user would press, double-clicks to zoom, and every interactive control in it remains clickable.

Four driven checks in `e2e/journeys/title-bar.e2e.ts` cover it, run against the real release binary: that all four probed surfaces drag, that no strip control is swallowed by the region, that the controls are genuinely operable (the theme control is exercised end to end and its effect read back off the document), and that the strip's text is not selectable.

The first check is non-vacuous by construction — it is the reproduction. Restoring the shipped bare attribute flips three of its four surfaces to false and fails it, while the other three checks stay green, which is what proves it tests the drag region rather than the strip in general.

# Steps

- [x] Reproduce the defect in the driven application, against the framework's own decision rather than a proxy for it.
- [x] Mark the strip as a subtree drag region.
- [x] Confirm interactive children exclude themselves, and remove the inert CSS that appeared to do it.
- [x] Suppress text selection and the text cursor on the strip's own labels.
- [x] Confirm the reproduction is gone by driving it again, and that every strip control still responds.

# Open threads

No open threads.
