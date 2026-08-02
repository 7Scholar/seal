# UI improvement sessions

> **Load this when the work is UI improvements** — a declared session (_"we're going to do UI improvements"_) or any small ad-hoc change to existing frontend code: a component rename, a copy tweak, a styling fix, a batch of visual polish. The mode is defined by the work's **shape** — small edits to code existing plans already cover, with no plan being worked deep — not by the words the request arrives in; a single one-file rename rides this manual the same as a twenty-file polish sweep. It is the operating manual for that mode. The plan system's background is [INSTRUCTIONS.md](INSTRUCTIONS.md) and the machinery this file leans on (coverage, drift, the question channel) is owned there and in [SYNC.md](SYNC.md); what this file adds is the procedure that keeps a many-small-changes session from drifting the plans.

## Why this mode has its own manual

Ordinary work is **one plan, worked deep**: follow the cursor to the active plan, work it, run the session protocol on it. A UI session is the inverted shape — **many plans, touched shallow**: a stream of small edits landing in files covered by many different, mostly finalized plans, none of which is "the active plan." Running the full per-plan protocol on every tweak is all ceremony; skipping it wholesale is how the plans silently stop describing the UI, and the drift surfaces later as a large cold reconcile. The middle path this manual encodes: **classify each change against its covering plan the moment it is made** — cheap, and only possible while the change is fresh — and **batch all doc and coverage work into one close-out**.

## The session's frame

- **A UI improvement is an edit to existing, covered code. The plan tree does not grow.** No new nodes, no new steps, no "polish" step appended to a finished plan — a finalized plan stays finalized when its realization gets visually better without its contract changing.
- **The mode's boundary:** a "UI improvement" that is actually **new scope** — a new page, a new user-facing capability, a flow no plan's What & why contains — is not a tweak and does not ride the session. Route it through intake ([INTAKE.md](INTAKE.md)) as its own framed node, and keep the session to the true improvements.
- **One session is one task on one branch.** The landing rules in [INSTRUCTIONS.md](INSTRUCTIONS.md) apply unchanged: branch off `main`, commit locally, stamp coverage last, never push. Because the session spans many plans' coverage, it breaks the one-subtree partition ordinary tasks keep ([GIT_WORKFLOW.md](GIT_WORKFLOW.md)) — so a UI session must not run concurrently with another in-flight task that touches frontend-covered files, or the two conflict on `coverage.json`.

## The improvement bar

A UI improvement is small in **scope**, never in **finish**. The mode exists so a batch of small changes doesn't drag the full per-plan protocol behind each one — it is not permission to work shallowly, and the two get confused constantly because "this is just a tweak" is true of the scope and false of the standard.

So, on every surface this session touches:

- **Leave it at production depth or leave it alone.** If a tweak reveals that the surface's empty, error, or overflow state was never designed, that is a finding to raise ([INSTRUCTIONS.md](INSTRUCTIONS.md), **a request with many parts**) — not something to patch around because the session was meant to be quick.
- **Match the reference when there is one.** A screenshot or named product supplied with the request is specification; the fidelity rules are in [docs/UX_RESEARCH.md](../UX_RESEARCH.md) under **Building against a reference**.
- **Drive what you changed.** A styling change you never looked at in the running application is a change you have not made — this repo has shipped that defect more than once, and unit tests do not see it.

If a "batch of polish" turns out to need a real design pass on any surface it touches, the honest move is to finish that one surface properly and report the rest as untouched, rather than applying a thin coat to all of them.

## Before the first change

1. Read the frontend supporting docs indexed under **Supporting docs** in the root plan's README before touching UI code.
2. If `context/plans/app/DRIFT.md` exists, reconcile it first ([CODE_DRIFT.md](CODE_DRIFT.md)) — a UI sweep on top of unreconciled drift makes the eventual reconcile ambiguous about which change caused which flag.
3. Start the **session ledger** (below), empty. It is a scratch artifact for this session, not part of the plan tree — keep it out of `plans/`.

## Per change: classify while it is fresh

The ledger holds one line per touched file: the covering plan(s) and a classification. Write the line at change time; at close-out it is checked against the detector, never reconstructed from memory at the end of a long session.

**Find the covering plan(s)** with `uv run find_plans <path>` from `context/_scripts/` (read-only, always safe), passing the changed file's repo-relative path — terms match covered paths as case-insensitive substrings, so the full path returns exactly the plans covering that file, overlap included. A changed file that returns no plans is a signal, not a pass: either the change is new scope (see the session's frame) or it is a coverage gap — flag it, don't skip it. For concept-level questions ("which plan owns the sidebar?"), use broader terms plus a grep over plan prose — the same two-tool candidate search intake uses ([INTAKE.md](INTAKE.md)).

**Classify by reading the covering plan's Approach** and asking one question: _does this change alter anything the plan states?_ Plans specify behavior, not pixels (the spec-not-catalog rule, [INSTRUCTIONS.md](INSTRUCTIONS.md)), so for genuine polish the answer is usually no:

- **Cosmetic** — spacing, sizing, color, typography, copy, visual hierarchy, a styling refactor that leaves every stated behavior intact. The plan's prose is already correct; the file only needs a coverage re-stamp at close-out.
- **Contract-touching** — the change alters something the plan does state: an interaction flow, a visible state or status, edge-case behavior, a seam another concern reads, a capability added or removed. **Update that plan's Approach in the same session** — this is exactly the drift the mode exists to prevent, and it is a small edit now versus a cold reconcile later. If the plan is in flight rather than finalized, the ordinary cursor and step rules apply on top ([INSTRUCTIONS.md](INSTRUCTIONS.md)).
- **Design-shaped** — the tweak turns out to imply a real decision: choosing a data model, a persistence boundary, a consumer contract, a divergence between plausible directions. That is not a tweak. Raise it in the covering plan's `QUESTIONS.md` and drop it from the session (**Blocking on a user decision**, [INSTRUCTIONS.md](INSTRUCTIONS.md)); a UI session never quietly answers a design fork.

A file covered by more than one plan is classified against **each** covering plan — a change cosmetic to one can be contract-touching to another; overlap exists precisely so both get looked at ([SYNC.md](SYNC.md)).

**Updating prose means re-reading the covering plan, never patching grep hits.** A literal search for an old identifier finds only the lines that spell it; the plans also describe the same surface in plain words, in `MEMORY.md` entries, and in sibling plans of the same folder. The tell-tale failure is a rename: a rename retires **vocabulary**, not just an identifier — renaming a component to drop an `Experimental` suffix retires "experimental" from every plan describing that surface, headings and memory entries included, even where the identifier never appeared. After a contract-touching change, read the covering plan's affected sections whole and fix what the change made untrue; after a rename, additionally sweep the covering folder's plans for the retired concept words, case-insensitive.

## Close-out: once per session

1. **Prose settled.** Every contract-touching ledger line has its plan's Approach already updated. Step markers and cursors normally do not move — polish on a finalized plan is not a step and does not reopen it; only a change inside an in-flight plan's code propagates per the ordinary rules.
2. **`MEMORY.md` under the ordinary bar** ([INSTRUCTIONS.md](INSTRUCTIONS.md)) — which a polish session almost never clears. The one shape that does: a looks-wrong-but-load-bearing constraint discovered while tweaking (a z-index, an overflow rule, a suppressed transition that exists for a non-obvious reason) that a future agent would "clean up." Record that; record nothing else.
3. **Verify the code:** run the targeted check for the touched area (the repo's typecheck), plus the relevant unit tests when stateful code changed. A session's changes are individually small, which is exactly why nobody re-tested them one by one — this is where that debt is paid.
4. **Commit code and prose.** Coverage stamps at `HEAD`, so this precedes the stamp.
5. **Stamp coverage, strictly after step 4's commit:** for every ledger file — cosmetic and contract-touching alike — run `uv run add_to_coverage <plan.md> <path...>` from `context/_scripts/`, under each covering plan, then commit the `coverage.json` changes as the session's final commit. The stamp is the statement "this plan has re-reviewed this change"; a cosmetic change earns it exactly as much as a contract one. The order is enforced: the stamp records `HEAD`, so `add_to_coverage` refuses any file whose changes are uncommitted.
6. **Verify with the detector:** `uv run run_coverage --all --verbose` until it reports no drift and `DRIFT.md` is gone ([CODE_DRIFT.md](CODE_DRIFT.md)). Anything the detector flags that the ledger missed but the session touched is an unclassified change — classify it per the section above; never blind-stamp it to silence the flag. Drift in files the session never touched is **unrelated drift**: don't resolve it silently and don't blind-stamp it — ask the user **in the chat** whether this session should also take it on. (That is a session-scope question, not a plan question, so it is asked live rather than in `QUESTIONS.md`.)
7. **Stop at the local commit and report.** The user pushes and opens the PR ([INSTRUCTIONS.md](INSTRUCTIONS.md)).
