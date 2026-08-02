# Agent entry — plans / code

You are doing **implementation work**: writing or editing application code, or working a plan in the recursive implementation tree ([context/plans/app/](../../context/plans/app/README.md)).

## Before you start

1. Read the operating manual: [docs/plans/INSTRUCTIONS.md](INSTRUCTIONS.md). It tells you how the plans are organized, how to find where work stands, and what to do in every situation. **Exception:** when the work is UI improvements — a declared session ("we're going to do UI improvements") **or** any small ad-hoc change to existing frontend code (a component rename, a copy tweak, a styling fix) — read [docs/plans/UI_IMPROVEMENTS.md](UI_IMPROVEMENTS.md) instead; it is that mode's operating manual. The mode is defined by the work's shape, not by the words the request arrives in.
2. Read the root plan: [context/plans/app/README.md](../../context/plans/app/README.md). Start at its **Cursor** and follow the cursor path to the active leaf.
3. **If the product has a user-facing surface, read [context/journeys/README.md](../../context/journeys/README.md)** and the manual behind it, [docs/plans/JOURNEYS.md](JOURNEYS.md). Journeys are the axis the plan tree cannot state about itself: the implementation tree verifies each concern against its own contract, while a journey asks whether a person can actually get through the product. **An unsatisfied journey means the product is not done, however many plans are `[x]`** — so if the work you are picking up is "make this production-ready" or anything about whether a person can get through the product, the journeys are your entry point rather than the cursor.

4. **When the work is judging how finished a built surface is** — "the UI feels unfinished," "go over this screen and tell me what's missing," a deliberate pass over something that shipped fast — read [docs/plans/SURFACE_AUDIT.md](SURFACE_AUDIT.md). This is a distinct axis from the journeys: a journey asks whether a person can complete a path, and a surface can satisfy every journey while its empty, error and overflow states were never designed at all. That pass finds what is missing and frames it; it does not fix it.

## Before writing or editing code

Read the best-practices docs for the area you are about to touch — before the first line, not after — and apply them. They are indexed under **Supporting docs** in the [root plan](../../context/plans/app/README.md) and live under its `_docs/`; each code area's docs are established when that area first forms, so if none exists yet for your area, this step is a no-op (and establishing one may be part of your work).

## Before ending any work that touched covered code

However small the change — a one-line rename counts — work on plan-covered code is finished only when this close-out has run. Skipping it leaves the plan system silently drifted, the one failure it cannot tolerate:

1. Run the targeted check for the touched area (typecheck, unit tests).
2. Commit the code and plan-prose changes locally. Never push — the landing rules in [INSTRUCTIONS.md](INSTRUCTIONS.md) own that boundary.
3. Stamp coverage, strictly after step 2's commit: from `context/_scripts/`, find each changed file's covering plans with `uv run find_plans <changed-file-path>` (read-only; a file may be covered by more than one plan — stamp under each), run `uv run add_to_coverage <plan.md> <path...>` per covering plan, then commit the `coverage.json` changes as the final commit. The order is enforced, not stylistic: the stamp records `HEAD`, so `add_to_coverage` refuses any file whose changes are uncommitted.
4. Confirm clean: `uv run run_coverage --all --verbose` reports no drift and `context/plans/app/DRIFT.md` is absent. Drift in files you touched is always yours to clear. Drift in files you never touched is **unrelated drift**: don't resolve it silently, don't blind-stamp it, and don't ignore it — ask the user **in the chat** whether this session should also take it on. (That is a session-scope question, not a plan question, so it is asked live rather than in `QUESTIONS.md`.)

If you cannot complete these steps, say so explicitly in your report — never stop silently with unstaged changes, an unstamped covered file, or a live `DRIFT.md`.
