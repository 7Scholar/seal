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

TBD

# Steps

- [ ] Research solution directions
