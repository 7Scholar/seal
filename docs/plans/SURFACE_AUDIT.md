# Auditing a surface that is already built

> Load this when the work is **finding out where a built interface falls short**, rather than building something new: a request like _"the UI looks unfinished"_, _"go over the navigation and tell me what's missing"_, or a deliberate pass over a surface that shipped fast. Its product is a **findings document plus framed plans** — not fixes. Fixing is the next session's job, under the ordinary manuals.

## Why this is its own pass

A surface can pass every test, satisfy its journeys, and still be visibly amateur. Those checks answer *does the code do what the plan says* — they cannot answer *is this surface finished*, because a plan that only ever described the happy path is satisfied by a build that only has one.

That gap is where interfaces actually fail: the state nobody enumerated, the reference element nobody noticed was dropped, the affordance that exists as an approximation of what was asked for. None of it shows up as a failing test. All of it shows up the moment a person opens the application.

So this pass is **deliberately adversarial and deliberately non-productive**. You are looking for what is missing, and you are not allowed to fix it as you go — because fixing while auditing is how an audit turns into a shallow patch of the first three things found and silence about the rest.

## How to run it

**Drive the real application.** Not the code, not the tests, not the plans — the running product, per [docs/RUNNING.md](../RUNNING.md). Everything below is judged against what is on screen. Reading the implementation tells you what was intended; only the running app tells you what a user meets.

**Get into every state, don't just imagine it.** A scratch profile gives you the empty case for free. Then make the others happen: add one item, add twenty, make a name absurdly long, disconnect what a call depends on, trigger the failure. A state you reasoned about but never saw is a state you have not audited.

### 1. States — per surface

For each surface, walk the list from [docs/UX_RESEARCH.md](../UX_RESEARCH.md) (**Step 5**) and record what you actually see:

**empty · one · populated · excessive · loading · error · degraded/partial · unavailable**

For each, one of three verdicts: **designed** (it exists and belongs to the same product), **absent** (it does not exist, or falls back to something generic), or **not reachable** (with the reason it cannot occur).

Two failures to look for specifically, because they are the common ones:

- **The empty state in a different visual language.** A grid whose empty case is a centered heading and a button; a table whose empty case is a sentence. The empty state of a grid is a grid.
- **The excessive state nobody tried.** What a hundred rows do to the layout, what an unbroken 200-character name does to a tile, what happens to a control that assumed a short label.

### 2. Reference fidelity

Where the surface was built against a screenshot or a named product, put the two side by side and go element by element. For each element of the reference: **present**, **approximated** (drawn or behaving differently — say how), or **absent**.

Approximations matter as much as absences here. A control in the right corner that opens the wrong thing, or a glyph drawn from ASCII where the reference has an icon, reads as unfinished in a way a missing feature does not.

Where a deviation was deliberate, find whether the reason was ever surfaced to the requester. A deviation reasoned about in a plan and never raised is still an unannounced deviation.

### 3. Affordance completeness

Per surface, ask what a user can reasonably want to do here, and whether they can. Then check the paths *into* actions rather than only the actions: an operation offered on one screen but not from the place a user most naturally reaches for it is a hole, even though it is not missing.

### 4. Consistency across surfaces

Compare surfaces against each other rather than each against itself: the same concept named two ways, the same control drawn two ways, one surface with a search field and its sibling without, spacing and radii that do not agree. Individually invisible, collectively the thing that reads as amateur.

### 5. First-run impression

Finally, open the application from genuinely nothing and look at the first screen as a stranger would. It is the screen most shaped by what the build ran out of time for, and the one every user sees.

## What to produce

**A findings document**, one entry per finding: the surface, what you saw, what it should be, and the severity — *broken* (a user cannot do the thing), *unfinished* (a state or element that was never designed), or *inconsistent* (disagrees with its siblings). Group by surface, not by severity, so each surface's total state is visible in one place.

**Framed plans for the real work.** Findings that amount to design work become framed nodes in the tree under the plan that owns the surface, per [INTAKE.md](INTAKE.md) — `[ ]` and unsolutioned, so the next agent picks up a stated problem rather than re-deriving it from a list of complaints. Do not fold them into the covering plan's Approach: the Approach describes what *is*, and these are things that are not.

**No fixes.** The one exception is a change so small and so obviously right that framing it costs more than doing it — and even then, it rides the ordinary close-out ([UI_IMPROVEMENTS.md](UI_IMPROVEMENTS.md)), not this pass.

## The bar for the report

Say what is wrong plainly. An audit that softens its findings to sound constructive is worthless — the reader asked precisely because the polite version ("mostly good, a few improvements possible") is what they already have. Name what a user would notice, in the order a user would notice it.

Equally: do not manufacture findings to look thorough. A surface that is genuinely finished is recorded as finished, and an audit that finds four real problems is more useful than one that finds four real problems and eleven invented ones.
