Part of [the navigation plan](README.md).

# Scope

The **shared disclosure behaviour** behind `Overflow`, `Switcher`, `ThemeControl` and `Toggletip`: opening, dismissing on Escape and on an outside click, and returning focus to the trigger. Out of scope: what any of them discloses.

# What & why

Four components implement the same disclosure contract independently, and they have **already drifted** — which is the reason this is a finding rather than an observation about tidiness.

[The surface audit](_docs/surface-audit.md) established the divergence:

- `Overflow`, `ThemeControl` and `Toggletip` are **byte-identical** in their dismissal logic — the same document `keydown` capture listener and the same `mousedown` listener, at the same lines of each file.
- `Switcher` has **no document `keydown` listener**. It handles Escape only on its own popover subtree.

So three of them dismiss on Escape from anywhere, and the fourth dismisses only while focus is inside it. A user who opens the repository switcher, clicks into the surface behind it, and presses Escape gets a different result than with any other disclosure in the product.

The contract itself is settled and stated — [the research](_docs/navigation-research.md) fixes it: every disclosure is a real button carrying `aria-expanded`, dismissible on Escape and on an outside click, never a hover target, with focus returning to the trigger. What is missing is one place that implements it. Four copies mean four chances to drift, and the drift has already happened once.

The [handoff](HANDOFF.md) names this as a decision that belongs to whoever picks this up, so this node records the problem rather than presuming the answer.

# Approach

## One hook, not one component

The four disclosures share their **behaviour** and share almost nothing of their **markup**: one draws a menu of buttons, one a bubble carrying a live region, one a popover holding a search field and a listbox, one a small list of theme choices. A wrapper component would have to accept all of that through props or slots, and would end up parameterised into something harder to read than the four copies it replaced.

What is actually common is the open state and the rules for leaving it. That is a **hook** — `useDisclosure` — which each component calls, keeping its own markup entirely:

```
const { open, setOpen, wrapper, trigger, dismiss } = useDisclosure();
```

- `open` and `setOpen` are the state, so the caller decides what opening means.
- `wrapper` and `trigger` are refs the caller puts on its outer element and its button; the hook needs the first to tell inside from outside, and the second to return focus.
- `dismiss` closes and returns focus, for the callers that close on their own terms — choosing an option, activating a menu entry.

The hook owns exactly the contract [the research](_docs/navigation-research.md) fixes, and nothing else: while open, **Escape from anywhere** closes it and returns focus to the trigger, and a **pointer press outside the wrapper** closes it without moving focus. Both listeners are on the document and both are removed when it closes, so a closed disclosure costs nothing.

## Escape is heard from anywhere, and this is the divergence being closed

The listener is on the document, in the **capture** phase, and stops propagation once it acts. Three of the four already did this; the switcher handled Escape only on its own subtree, so a user who opened it, clicked into the surface behind, and pressed Escape found it still open while every other disclosure in the product would have closed. The document listener is what makes the four agree.

Capture rather than bubble, and stopping propagation, is what keeps a disclosure inside another dismissible surface from closing both: the innermost open disclosure sees the key first and consumes it. The manage surface's own Escape-to-cancel sits behind exactly this, which is why the phase is part of the contract rather than an implementation detail.

## What the hook does not own

Opening, and everything specific to what is disclosed: focus into the popover, filtering, the keyboard model over a listbox, and whether the trigger toggles or only opens. The switcher keeps its own `onKeyDown` for arrows and Enter, which is a model of its list rather than of disclosure.

# What exists

The hook at `ui/components/useDisclosure.ts`, and all four components using it. No component carries its own dismissal logic.

Interface tests cover each of the four dismissing on Escape and on an outside press, and returning focus to its trigger — one pair per disclosure, written once and run over all four.

**The Escape check moves focus without pressing**, which is the only way to test the rule at all: a press outside dismisses the disclosure by the other rule, so a test that clicks away and *then* presses Escape has already closed it and asserts nothing. Writing it the obvious way is what showed this — three of the four passed for the wrong reason and the fourth failed for a reason that had nothing to do with its divergence.

Guards confirmed non-vacuous by reintroducing the defect each prevents:

- restoring the switcher's subtree-only Escape handling fails the switcher's Escape check while the other three still pass — the divergence, caught exactly
- dropping the focus return fails 4
- dropping the outside-press dismissal fails 5

# Steps

- [x] Research solution directions: the shared part is behaviour rather than markup, so the primitive is a hook.
- [x] The hook, with the contract the research fixes.
- [x] All four components on it, closing the switcher's divergence.
- [x] Tests, with each rule confirmed non-vacuous.
