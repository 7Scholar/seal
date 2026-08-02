# Questions

## Blocking — the reference screenshots are no longer in the repository

[The surface audit](_docs/surface-audit.md) could not complete its **reference-fidelity pass**. The two screenshots the product owner supplied — Supabase's projects grid and its breadcrumb switcher — are not in the repository, and no copy exists anywhere in the tree.

What stands in for them is the transcription under *Sources surveyed* in [navigation-research.md](_docs/navigation-research.md). That is detailed and was written from the images, but it is a **description of the reference, not the reference** — and the procedure this work runs under requires going element by element with the reference and the running application side by side ([UX_RESEARCH.md](../../../../../../docs/UX_RESEARCH.md), *Building against a reference*). An element nobody transcribed is invisible to a transcription, which is exactly the failure class that produced the missing root switcher.

**Please re-supply both screenshots.** Until then the audit's fidelity findings are limited to the two deviations already known from the transcription — the absent root switcher and the `⌃⌄` glyph — and cannot be treated as complete.

## Blocking — the empty state's copy is asserted by the journey harness

Redesigning the repositories grid's empty state is the audit's clearest single piece of work, and [the handoff](HANDOFF.md) states it is allowed: the journey document requires only that the path from empty be *"obvious and short."*

But the copy is a **test contract**. `e2e/journeys/first-run.e2e.ts` asserts the literal strings `Seal manages nothing yet`, `Nothing is encrypted until you choose`, and `button=Add a folder`; `return-and-use.e2e.ts` clicks `Add a folder` twice in its fixture. Changing the interface means updating both specs and re-driving both journeys in the same change.

Two things follow that are the owner's call rather than a builder's:

1. **The primary action's name.** The empty state says **"Add a folder"**; the toolbar and the switcher popover both say **"+ Add repository"**. One flow, two names, and the product calls the thing a *repository* everywhere else. Settling on one name changes asserted copy, so it is asked rather than assumed.
2. **Whether the explanatory paragraph goes.** It violates this plan group's own rule that a surface needing a sentence to explain itself is insufficient ([ui/README.md](../../README.md)), and the audit records it as surviving only because a journey asserts it. Removing it is a change to what a first-run user is told, which is a product decision.
