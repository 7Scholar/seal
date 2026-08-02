# Questions

## Answered — the reference screenshots

The product owner re-supplied both images. They live at [_docs/reference/projects.png](_docs/reference/projects.png) and [_docs/reference/breadcrumbs.png](_docs/reference/breadcrumbs.png), and [the audit](_docs/surface-audit.md) now carries a completed element-by-element fidelity pass against them.

Keeping them in the tree is the point: the transcription that stood in for them while they were missing had dropped several elements, including that the reference's **root segment carries a switcher** — the one deviation the previous session reasoned its way into.

## Answered — the empty state

Both parts settled by the product owner:

1. **The action is named "Add repository"** everywhere. The empty state's "Add a folder" goes, so one flow has one name, matching the noun the product uses for the thing.
2. **The explanatory paragraph goes**, and the empty state **becomes a tile in the grid** rather than a centred call to action — so the empty state is the same grid with an add tile in it, in one visual language.

Both change copy the journey harness asserts (`Seal manages nothing yet`, `Nothing is encrypted until you choose`, `button=Add a folder` in `first-run.e2e.ts`; `Add a folder` twice in `return-and-use.e2e.ts`), so the specs are updated and both journeys re-driven in the same change. [The journey document](../../../../../journeys/first-run.md) requires only that the path from empty be *"obvious and short"*, which an add tile satisfies.
