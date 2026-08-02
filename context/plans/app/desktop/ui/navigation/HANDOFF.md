# Handoff — rebuild the navigation and the repositories overview

> **You are picking this up cold. Read this first, then stop reading and go look at the running application.** This document tells you what is wrong, what is binding, and where the traps are. It does **not** tell you what to build — that is the work, and the previous session's habit of deciding quickly is what produced the state you are inheriting.

## The situation

The interface's navigation was rebuilt in one session: a breadcrumb trail in the title bar over three full-width altitudes (repository tiles → file rows → file surface), replacing a sidebar. The model works. It is driven end to end by the first-run journey against a release build, 135 interface tests and 74 Rust tests pass, and there is no drift.

**And the product owner opened it and found it amateur.** That judgement is correct, and the gap between "everything passes" and "this looks unfinished" is the whole reason you are here.

Two failures produced it, and both are the *kind* of failure rather than isolated bugs — assume more of each than the examples below.

### Failure 1 — the reference was not matched

The owner supplied two screenshots — Supabase's projects grid and its breadcrumb switcher — and named Supabase and Vercel explicitly. **Those image files are no longer in the repository**, so ask the owner to re-supply them before you begin the fidelity pass; do not attempt it from the descriptions alone. What they showed is recorded in [_docs/navigation-research.md](_docs/navigation-research.md) under *Sources surveyed*, which is detailed enough to work from in the meantime but is a transcription, not the reference. The build is adjacent to them rather than faithful:

- **The `Repositories` root segment has no switcher at all.** On the landing screen — the only screen a new user sees — there is no chevron, so the "add a repository from the breadcrumb" affordance the owner asked for is unreachable exactly when it is the only thing a user can do. The plan rationalised this: *"a popover over an empty set is a control that lies about having options."* That reasoning is **wrong** and is recorded here so you do not re-derive it: the popover also carries **+ Add repository**, so with zero siblings it is not lying, it is the fastest path to the only available action.
- **The chevron is `⌃⌄`** — two stacked ASCII carets — where the reference shows a chevron-up-down icon.
- **There is no icon system in the product at all.** Every glyph in the interface is a text character: `···` for overflow, `◐` for the theme control, `▾` for a tree twisty, `✓` for a tick. This is a systemic cause of the amateur impression and is bigger than the breadcrumb. Deciding what to do about it is part of this work — see **Decisions that are yours** below.

### Failure 2 — only the populated state was designed

The three surfaces were built for the case where everything is present and working. The other states were never enumerated, so they were never designed:

- **The repositories grid returns early when empty** — a centred heading, an explanatory paragraph, and a button. That is a *different visual language* from the grid it replaces. The owner's own instinct is the fix: an **add-repository tile** inside the grid, keeping one language. (Do not treat that as a completed design. It is a starting point, and the empty state deserves the full treatment.)
- **Excessive, loading, error, degraded and unavailable states were never considered** for any of the three surfaces. Nobody has looked at fifty tiles, a two-hundred-character repository name, a failed scan, or what the grid does while `overview` is in flight.
- The empty state also carries a two-sentence explanatory paragraph, which violates this plan group's own stated rule that *"if the interface needs a sentence to explain itself, the interface is insufficient"* ([ui/README.md](../README.md)). It survived because a journey asserts it — see the trap below.

## Read these, in this order

1. **[docs/plans/AGENT_ENTRY.md](../../../../../../docs/plans/AGENT_ENTRY.md)** — the entry manual. It routes you to everything else and is not optional.
2. **[docs/plans/SURFACE_AUDIT.md](../../../../../../docs/plans/SURFACE_AUDIT.md)** — how to judge a built surface. **Your first phase is this audit**, not building.
3. **[docs/UX_RESEARCH.md](../../../../../../docs/UX_RESEARCH.md)** — Step 5 (enumerate every state) and **Building against a reference** are the two sections this work exists to satisfy.
4. **[docs/plans/INSTRUCTIONS.md](../../../../../../docs/plans/INSTRUCTIONS.md)** — specifically the passage on a request with many parts: *each part is done to full depth or not started*. This handoff names four surfaces. **You are not expected to finish all four**, and finishing one properly beats touching all of them.
5. **[README.md](README.md)** in this folder — the node's Approach and its cursor, which record the current design and its shortfalls.
6. **[_docs/navigation-research.md](_docs/navigation-research.md)** — the prior-art survey the model was built from. It is sound on *which* affordances; it never asked about states, which is the hole you are filling. **One line in it needs care:** it records that the reference's add action is "a button in the toolbar rather than a ghost tile in the grid." That is an accurate observation of the *populated* grid and says nothing about the empty one — do not read it as ruling out an add-repository tile when the grid is empty. Both can be true, and in the reference's own empty state they generally are.
7. **[docs/RUNNING.md](../../../../../../docs/RUNNING.md)** — before you launch or build anything. Non-negotiable: a hand-built binary without the `custom-protocol` feature is a blank window that looks like an app defect and is not.

## Binding constraints — do not design around these

These are settled and are not yours to relitigate. Each has a reason that is not obvious from the code.

- **The webview persists nothing.** Its data store is memory-only, deliberately, as a security property. No route, scroll position, filter text, sort order or expansion survives a restart, and `localStorage` does not work. Every launch is a cold start and the default must be right every time. (The theme preference is the sole exception and it goes through a Rust-side store — see [theme.md](theme.md).)
- **The frontend never holds plaintext.** Values arrive masked; one crosses only on an explicit per-row reveal. No surface may aggregate, preview, batch or cache secret values. A tile previewing a repository's variables would defeat the architecture.
- **A strict CSP blocks every external resource.** No CDN, no remote fonts, no remote images. Anything you add is inlined or bundled.
- **The exposure alert is resolved, never dismissed**, its chrome scales to the count including to zero, and its cross-repository carrier is the title bar strip. That carrier was a settled design fork ([README.md](README.md) records why the alternatives were refused) — do not move it without raising a question.
- **Friction is spent exactly twice** — the first-seal acknowledgement and the password change. Do not add a third confirmation anywhere.
- **Prose is a last resort.** A surface needing a sentence to explain itself is an insufficient surface; full sentences are allowed only inside an info affordance the user opened, or in a destructive-act confirmation.
- **Only env files are editable.** Everything else opens opaque.
- **Disclosure never defers an alert, a state, or a consequence.** Collapse explanation and secondary actions; never collapse the fact that a secret is exposed.

## The traps

**The empty-state copy is a test contract, and changing it breaks the harness.** `e2e/journeys/first-run.e2e.ts` asserts the literal strings `Seal manages nothing yet`, `Nothing is encrypted until you choose`, and `button=Add a folder`; `return-and-use.e2e.ts` clicks `Add a folder` twice in its fixture. The *journey document* ([context/journeys/first-run.md](../../../../../journeys/first-run.md)) mandates only that the path from empty be "obvious and short" — so redesigning the empty state **is allowed**, and it means updating those specs in the same change and re-driving both journeys. What is not allowed is changing the interface and leaving the harness red, or preserving a bad design merely because a test names it.

**A frontend change reaches a real binary only by rebuilding both.** `bun run build` then the cargo build. A surface that "looks unchanged" after a rebuild is a stale `dist/`, not a working change. This has bitten this repo repeatedly.

**Unit tests and journeys will not catch what you are here to fix.** Everything currently passes. If your work ends with green tests and you have not opened the application and looked at every state, you have repeated the failure.

**The harness cannot drive the title bar drag.** Its synthetic press carries no click count, so the framework's listener rejects it before the drag region is considered. The check in `e2e/journeys/title-bar.e2e.ts` fails whether the drag is broken *or* merely undrivable — never read it as a pass, and confirm dragging by hand. See [MEMORY.md](MEMORY.md).

**Read [MEMORY.md](MEMORY.md) before touching the title bar or the window controls.** Two entries there describe behaviour that looks wrong and is load-bearing: the drag region's `deep` value, and why the window controls are positioned from Rust rather than by the framework's config option. Both would be "cleaned up" by a reader who did not know.

## How to run this

**Phase 1 — audit, and fix nothing.** Follow [SURFACE_AUDIT.md](../../../../../../docs/plans/SURFACE_AUDIT.md) over the four surfaces: the title bar strip and its breadcrumb, the repositories grid, the files list, and the file surface. Drive the real application and *get into every state* rather than reasoning about it — a scratch profile gives you empty for free (`SEAL_E2E_HOME=$(mktemp -d) ./e2e/launch-fresh.sh`), and you can create the rest. Put the reference side by side with the running app and go element by element.

Produce the findings document, and frame what it turns up as plans under this node. Then **stop and report** before building. The audit's value is that it is complete before anything is fixed; an audit that turns into a fix halfway through covers the first three findings and silently drops the rest.

**Phase 2 — one surface, to full depth.** Take the single surface the audit shows is worst, and finish it: every state designed and built, the reference matched element by element, driven in the real application in each state, tests updated, plan prose brought in line, coverage stamped. Then stop, report, and leave the rest framed.

The repositories grid is the obvious first candidate — it is the landing surface, the empty case is a new user's first impression, and it is where the owner's add-tile instinct applies. But the audit decides, not this document.

**Do not attempt all four surfaces in one session.** That is precisely what produced the state you are inheriting. The plan tree exists so the next agent resumes cleanly; a cursor reading *"the grid is complete to production depth, the other three are audited and framed"* is a success, and four half-rebuilt surfaces is not.

## Decisions that are yours, and one that is not

**Yours** (make them, record them in the plan's Approach, and say what you chose in your report):

- **What to do about icons.** Text glyphs are the current state and are a real part of why the product reads as unpolished. Inline SVG is the obvious route given the CSP; whether to hand-roll the handful needed or vendor a small set is a judgement about maintainability. If you introduce an icon system, it is its own concern and probably its own plan — do not scatter one-off SVGs across components.
- **What the empty state actually becomes.** The add-tile is the owner's instinct and the right starting point; its content, its copy, and whether anything accompanies it are design work.
- **Whether the interface's disclosure controls should share one primitive.** `Overflow`, `Switcher`, `ThemeControl` and `Toggletip` each implement their own outside-click and Escape handling today — four near-identical pieces of the same logic, with four chances to drift apart.

**Not yours** — raise it in `QUESTIONS.md` and stop that line of work: anything that changes what the product *does* rather than how it looks, any move of the exposure alert's carrier, any new friction, and any change to a journey's stated requirements. Reference deviations belong here too: if you conclude the owner's reference is wrong for this product, **ask** — do not resolve it in the build, which is exactly how the missing root switcher happened.

## Definition of done for the phase you complete

Not "the code works." A surface is done when:

- every state it can occupy is designed, built, and **seen running** — empty, one, populated, excessive, loading, error, degraded, unavailable, or explicitly recorded as unreachable with the reason;
- the empty state wears the same visual language as the populated one;
- every element of the supplied reference is present, adapted with a stated reason, or excluded with a stated reason;
- it was driven in the real application, not only unit-tested;
- the plan's Approach describes what is actually built, the cursor says where the remaining work stands, and coverage is stamped;
- and your report says plainly what you did **not** do.
