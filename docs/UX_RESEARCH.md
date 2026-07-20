# Researching leading products' UX before designing a feature

A repeatable procedure for grounding a feature's design in proven UX. Before you design something that respected products have already solved well, study how a handful of them solved it, extract the reusable UX (not their code), and let that shape what you build. The output is a **research document** that becomes the design input for the build — so the feature is grounded in prior art instead of invented from a blank page.

This doc is feature-agnostic. It applies equally to a file viewer, a command palette, a comment thread, a file uploader, an onboarding flow, an editor surface — anything with strong prior art.

## When to use this

Use it when **the feature has strong prior art**: respected products have almost certainly solved a version of the problem, and there is proven UX to learn from. Signals: "we're building a viewer / palette / picker / editor / thread / uploader / …", or any surface a user will judge against the polished equivalents they use every day.

Skip it when the thing is **genuinely novel** (no meaningful prior art to study) or **trivial** (a single button with one obvious behavior — there is nothing to learn). When unsure, lean toward doing it: the cost is an afternoon of study, and the failure it prevents — designing a familiar surface from scratch and shipping something that feels worse than what users already know — is expensive to undo.

This is a **design-input step**: it runs _before_ you commit a design, and its product is not the feature but the research that shapes the feature. Treat it as its own phase, not a footnote to building.

## Goal: input → output

- **Input** — a feature or design problem with prior art, plus the context and constraints of _our_ surface (where it lives, what it sits beside, what it must not do).
- **Process** — pick the right players to study, survey how each handles the problem, extract _functionality and behavior_ (not implementation), tier the findings by relevance to our surface, and synthesize a buildable proposal.
- **Output** — a research document (skeleton below) that a designer or engineer reads _instead of_ re-deriving the design, and builds the feature from.

## The procedure

### Step 1 — Frame what you are actually researching

Write one paragraph naming the concern precisely: **what** surface, **in what context**, **under what constraints**. Findings are only useful if they can be judged _for our case_ — "a good code viewer highlights syntax" is worthless until you've said "ours is a readonly evidence file in a project tab, so highlighting is enhancement, never a gate." The frame is the yardstick you'll hold every finding against.

Name the **things we have already built** that this feature sits beside — the siblings whose visual and interaction language it should mirror. A new feature that ignores the established family reads as bolted-on, however good it is in isolation. The frame states the family so the synthesis can honor it.

### Step 2 — Choose who to study

This is the highest-leverage judgment in the whole procedure. Pick **3–6 respected-for-UX players** who have solved this problem well, spanning:

- **The reference implementation** — the one product everyone benchmarks against for this problem (the most complete, most-copied affordance set).
- **Strong peers** — a few others with a distinctive take, so you see more than one good answer.
- **General best-practice and accessibility writing** — style guides, design-system docs, accessibility guidance. These surface the invariants (keyboard reachability, focus, semantic markup, "never do X") that individual products embody but rarely state.

Two rules govern the choice:

- **Exclude the vendor whose own product the format or feature _is_.** Study how neutral players _handle_ the thing, not the source product itself. You do not study Microsoft Word to design a Word _viewer_; you study how a general file host _views_ a document. The native vendor's surface is entangled with authoring, its own history, and its own product goals — studying it biases you toward reimplementing their product instead of designing the clean handling of it. (When the feature has no single "native vendor," this rule simply doesn't bite.)
- **Respected _for UX_, not merely popular.** Popularity is not the bar; a large product with mediocre UX teaches the wrong lessons. Choose the players a thoughtful designer would point to as doing this _well_.

### Step 3 — Survey each source

For each source, capture **what it uniquely contributes** — its distinctive affordances and behaviors — in a line or two, not a generic description. "GitHub's blob view: line numbers, per-line anchors, soft-wrap toggle, copy-raw, sticky symbol header" beats "GitHub shows code."

Extract **functionality and behavior**, explicitly **not implementation**. What affordances exist, how they behave, what the defaults are, what the edge-case handling is — yes. Which library, framework, or architecture they used — no. The research must transfer to our stack; implementation details do not, and chasing them wastes the survey. If a source does something you _can't_ tell is good or bad for us yet, note it and move the judgment to the tiering step.

### Step 4 — Tier the findings by value _to our surface_

Do not produce a flat feature list — the **tiering is the analysis**. Group every affordance you found by how load-bearing it is _for our concern_ (not in the abstract), each with a one-line reason it lands in that tier for us:

- **Tier 1 — table stakes.** Every serious product in this space has it; its absence reads as broken or unfinished.
- **Tier 2 — strong, high-value.** Not universal, but a clear win for our surface given its context.
- **Tier 3 — advanced / mostly out of scope.** Real affordances that don't fit our constraints, our scope, or our family's visual language — named honestly, _with the reason they're excluded_, so the exclusion is a decision on record rather than an oversight.

The same affordance can be Tier 1 for one surface and Tier 3 for another; that is exactly why the tiering is judged against the frame from Step 1, not copied from the sources.

### Step 5 — Extract the best-practice behavioral rules

Pull out the cross-cutting **rules for how the affordances should behave** — the invariants that recur across sources, phrased as rules. These are the "always / never" statements that a builder must honor: _"copy copies raw text, never the rendered markup or the gutter," "every control is keyboard-reachable with a visible focus ring," "the highlight is enhancement — the content is always readable without it."_ Rules travel further than features: they constrain the whole design, including affordances you haven't thought of yet.

### Step 6 — Synthesize into a buildable proposal

Converge. The research must end in a **concrete, buildable feature set** that feeds the next phase — not a survey that stops at "here's what everyone does." State:

- **What to build**, in the visual and interaction language that mirrors the family from Step 1.
- **The load-bearing pieces vs. the rounding-out ones** — what carries the feature vs. what polishes it — so the build can be staged and cut under time pressure without losing the essence.
- **What is out of scope, and why** — carried forward from Tier 3, so the next phase doesn't relitigate settled exclusions.

A research doc that lists options without recommending one has not finished its job. Synthesis is the deliverable; the survey is just how you earned the right to make it.

## The output document — skeleton to fill in

Write the research into a document with these sections, in this order:

1. **Concern** — the frame from Step 1: what surface, what context, what constraints, and the sibling/family it must mirror.
2. **Sources surveyed** — the players from Step 2, each with the one-line "what it uniquely contributes" from Step 3.
3. **Findings** — the affordances from Step 4, **grouped into the tiers**, each with its reason-for-us.
4. **Best-practice rules** — the behavioral invariants from Step 5.
5. **Synthesis / proposal** — the buildable feature set from Step 6: what to build, load-bearing vs. rounding-out, and what's out of scope with reasons.
6. **Open threads** — anything the research surfaced but could not settle, left for the build to resolve (or "None").

## Principles and pitfalls

- **Extract UX, not implementation.** The deliverable is affordances and behaviors; libraries and architecture do not transfer and are not the point.
- **Don't study the native vendor.** Study neutral players who _handle_ the thing; the source product biases you toward rebuilding it.
- **Respected for UX, not just popular.** Big and good are different; choose the players a thoughtful designer would cite.
- **Tier, don't dump.** A flat feature list is not analysis. Rank by value _to our surface_, with reasons.
- **Judge every finding for our surface.** The frame from Step 1 is the yardstick; an affordance's value is contextual, never absolute.
- **Synthesize — don't stop at a survey.** The output must converge to a concrete, buildable proposal, not an even-handed catalog.
- **Fit the family.** New features mirror the established visual and interaction language of what we've already built, so the product feels like one thing.
- **Name what you're leaving out, and why.** Out-of-scope decisions on record prevent the next phase from re-opening them by accident.
