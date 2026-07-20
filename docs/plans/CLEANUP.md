# Plan-tree cleanup: post-review doc correctness

This is the operating manual for the **cleanup agent** — an independent agent that runs **after** a plan has been implemented and the code has passed review. The implementing agent, heads-down in the work, drifts: it copies the shape of nearby plans (so divergence snowballs), and over a long implementation it simply forgets format standards it was meant to hold. The cleanup agent has no stake in the implementation and one job: bring the plan docs back into line with the rules in [INSTRUCTIONS.md](INSTRUCTIONS.md), so the finished docs faithfully capture intent, approach, memory, and structure.

[INSTRUCTIONS.md](INSTRUCTIONS.md) is the home of every rule. This one does **not** restate them — it names each thing the cleanup agent checks, links to where the rule lives, and adds only what is specific to a cleanup pass: how the failure shows up in finished docs, and what to do about it. The checks are below, each its own concern. Work them one at a time; do not look for a fixed checklist of lines to delete. Understand the rule, then apply judgment.

The cleanup agent **fixes descriptions, never the design.** It may rewrite how a plan states what was built — sharpen an Approach, move a misplaced rule, repair a cursor — but it never changes what the system actually does. When the docs and code genuinely disagree on substance, that is drift, not a cleanup edit: stop and follow the drift flow ([CODE_DRIFT.md](CODE_DRIFT.md)) rather than papering over it.

Most concerns below the agent fixes itself. One — splitting an over-stuffed plan into a folder (concern 7) — **reshapes the tree, so the agent raises it as a question in `QUESTIONS.md` and stops** rather than carving it alone. That is the same confirm-before-reshape line every structural move in the system holds; the mechanism is **Blocking on a user decision** in [INSTRUCTIONS.md](INSTRUCTIONS.md).

## 1. Information flow

The first and most pervasive check: the tree of `.md` files must read as one cohesive whole, with detail increasing cleanly as you descend and nothing said twice. This concern has a recurring _problem_ and a _principle_ that fixes it; the specific edits differ from folder to folder.

### The model

A plan folder is a tree. **Detail increases as you walk down it.** A parent describes the _idea_; each child describes the _implementation_ of one part of that idea. Concretely:

- `repos/README.md` → "Every repo the user registers has its secret files tracked and tagged."
    - `repos/scanning/README.md` → "Discovering secret files inside a registered repo."
        - `repos/scanning/watchers/README.md` → "The file watchers that keep discovered secret files current."
            - `events.md` → "The debounced event stream a watcher emits when a secret file changes on disk."

Each step down narrows scope and adds detail.

The load-bearing rule: **a child assumes its parent has already been read.** An agent reading `handoff.md` has already read `orchestration/README.md`, which has already read `ingestion/README.md`, and so on up to the root. So a child gives **no** context about where it lives, why it exists in the larger picture, or what its siblings do. It describes its own task and nothing else.

A useful consequence: this lets you write and fix the tree **bottom-up**. Settle a child's content on its own terms, then place that child into its parent's context. A parent is written _after_ its children, because the parent's job is partly to introduce and index them.

### The problem

Plan files drift into restating context that belongs to an ancestor. Symptoms, in rough order of how often they appear:

- **A child re-explains the parent's idea.** It opens by describing the whole suite/feature/system it belongs to before getting to its own task. That framing is the parent's job; here it's noise the reader already has.
- **A child maps out its siblings.** Lines like "this does _not_ cover X — see the other file for that," enumerating what lives elsewhere. The parent already drew that map. (A _single pointer_ to where one specific thing is handled is fine — see "What is not a flow problem" below. A _survey_ of the neighborhood is not.)
- **The same rule, gate, constraint, or decision is stated in many files.** A shared convention (a readiness bar, a verification rule, a scope boundary, a naming rule) gets copy-pasted into every sibling and often the parent too. It has one correct home — the lowest common ancestor of everything it governs — and everywhere else should assume it or link to it. Duplicated text drifts out of sync the moment one copy is edited.
- **Shared reference material is repeated.** Source links, external-doc lists, and background that several siblings share get pasted into each. They belong once in the common parent.
- **Upward/sideways navigation cruft.** Back-links to the parent, "see also" pointers to siblings that exist only for orientation. In a tree read top-down, position in the folder already establishes the parent; orientation links fight the "parent already read" model.
- **A file inventory of what the plan covers.** A section (often titled "What's covered here" or similar) that lists the files the plan describes. That list is a hand-made copy of `coverage.json`, the single script-maintained home of the spec→file map — it duplicates a generated artifact and drifts the moment coverage changes. Remove the inventory. The plan states behavior; coverage states which files realize it.

The net effect: the same information lives in several places, detail does _not_ cleanly increase as you descend, and a reader who follows the tree top-down hits the same context two or three times.

### The fix

Walk the folder **bottom-up**. For each node, ask: _does this sentence describe this node's own task, or does it describe an ancestor's idea / a sibling / a shared rule?_ If the latter, it does not belong here.

1. **Settle each leaf first.** Strip anything that re-explains the parent, surveys siblings, or restates a shared rule. What remains should open directly on the leaf's own task at full implementation detail. A leaf is the most detailed, most self-contained node — it should read as "here is exactly what this piece does," assuming everything above it is known.

2. **Then settle each parent.** A parent (README) owns: the _idea_ of its subtree, the index of its children, and any rule/constraint/reference **shared across those children** — stated once, here, as the single home. When you pull a shared rule up out of the children, the children stop restating it; if a child needs a provider/case-specific _delta_ on that rule, the child keeps only the delta, not the general rule.

3. **Push each shared thing to its lowest common ancestor.** A rule that governs all of a suite's layers lives in the suite README. A rule that governs all suites lives in the suite-collection README above them. Never higher than it needs to be, never copied sideways.

4. **Re-read top-down at the end.** Walk root → leaf as a first-time reader would. Detail should increase at every step and nothing should be said twice. If you read the same fact at two levels, the lower one should usually defer to the higher.

### What is _not_ a flow problem (do not over-correct)

- **A single, specific cross-link is good.** "The transport primitives this layer calls live in `transport.md`" is a precise pointer that prevents duplication — keep it. The problem is _surveying_ siblings for orientation, not _pointing_ at one specific thing.
- **Provider/case-specific deltas belong in the child.** When a parent states a general rule, a child may state how _its_ case specializes that rule. That is the detail-increases gradient working correctly, not duplication.
- **Genuinely standalone reference docs** (a captured research survey, a DTD/schema map, an external-API digest) are inherently more self-contained than implementation plans. Apply the "assume parent read" trim to them loosely — their value is in being a complete reference, so don't gut them to match the shape of an implementation leaf.
- **A file named inside a behavioral fact stays.** Removing the file _inventory_ does not mean scrubbing every filename. "The seam type lives in one shared file so a shape change flags every consumer" is a contract that happens to name a file — keep it. The test is behavior vs. inventory: a fact a reimplementer must honor stays; a bare roster of covered files goes.
- **Moving information is not changing it.** This concern relocates and de-duplicates; it does not alter what a plan says. Carry a fact to its correct home and drop the copies — do not reword the design in transit.

## 2. Approach is the evolved design contract, not a catalog

The home of this rule is [INSTRUCTIONS.md](INSTRUCTIONS.md) §"The lifecycle of a plan" and "Specify behavior, do not catalog code." A finalized plan's **Approach** must capture the design the plan evolved into: the problem-specific shape that was intended, discovered, adjusted, and finally built. The bar is not "list enough code details to clone the implementation"; it is "state enough of the final approach that a future implementer can rebuild the same design and avoid undoing the lessons learned." That includes the concern's intentional seams, data and output shapes, status and error states, invariants, operation ordering, edge cases, concurrency, retries, throttles, and limits when those details explain how the design works.

This is the cleanup agent's highest-value check, because it is the failure that the rest of the system cannot catch and that is **most likely on exactly the input the cleanup agent sees** — a plan written for finished code. An implementing agent, fresh from the code, tends to write either a **catalog** ("here are the files, here's roughly what each does") or an **implementation dump** (function signatures, constants, helper behavior) that misses the actual arc of the plan. A finalized Approach should read like the end state of the plan's design history: it started as `TBD`, became a proposed approach, absorbed facts discovered during implementation, and now states the durable design as built.

How it shows up, and what to do:

- **Catalog masquerading as Approach.** The Approach reads as a file tour or a list of functions rather than the design. The cleanup agent **rewrites it into a specification**: read the code the plan covers, identify the behavior and seams that are deliberate, then state the final approach at the reimplementer's level. This is not changing the design — the design is what the code now embodies; the catalog merely failed to state it, and the rewrite states the same design at the right register.
- **Implementation dump masquerading as Approach.** The Approach names every helper, literal value, or exact string even where the exact detail is incidental. The cleanup agent lifts it back to the design contract: keep the fact that key derivation is deliberately slow and memory-hard; drop the exact parameter literals unless a compatibility guarantee depends on those exact values. Keep a concurrency limit, ordering rule, serialized key, or status code when changing it would change behavior; drop an internal helper name or magic number when it is just one realization of the design.
- **Behavior summary without the load-bearing lesson.** The Approach says "client fetches from provider" but omits the discovered constraint that shaped the implementation — for example, a provider's aggressive 429 behavior that forced a queue, hard backoff, and typed busy errors. The cleanup agent adds that lesson to the Approach as the **what** of the current design. If the non-obvious **why** would prevent a future mistake, leave that in `MEMORY.md` (see concern 3).
- **Load-bearing behavior stranded in `MEMORY.md`.** If the only place a key invariant or ordering rule is written down is a `MEMORY.md` entry, the Approach is hollow. Move the **what** up into the Approach; leave only the non-obvious **why** in `MEMORY.md` (see concern 3).
- **`TBD` Approach on finished code.** A finalized plan whose Approach is still `TBD` is unfinished docs, not unfinished work. The cleanup agent writes the spec from the code. (A genuinely unstarted or in-flight plan keeps its `TBD` — that is a correct signal, not a defect. Only finished work demands a finished Approach.)

Do not over-correct into line-by-line transcription. The Approach does not need private helper choreography, exact local variable names, incidental loop structure, or every literal constant. The test is design reconstruction: if omitting a detail would let a future implementer rebuild the concern with a different architecture, miss a provider/product constraint, emit different serialized data, return a different class of status/error, apply the wrong retry/throttle/limit behavior, or violate an ordering/concurrency guarantee, the detail belongs in the Approach. If omitting it only changes how the same design is implemented internally, the code and coverage can hold it.

The one limit: rewriting the description never licenses rewriting the design. If, while reading the code to write the spec, the cleanup agent finds the code and the existing docs disagree on what the system actually does, that is drift — stop and follow [CODE_DRIFT.md](CODE_DRIFT.md), do not silently reconcile it inside the Approach.

## 3. MEMORY.md entries each prevent a concrete future mistake

The home of this rule is [INSTRUCTIONS.md](INSTRUCTIONS.md) (the `MEMORY.md` entry rule in "Ending a session"). A `MEMORY.md` is a set of landmine warnings, not a log of reasoned decisions. The bar is consequence: an entry earns its place only if **a future agent who didn't know it would do something wrong** — re-introduce a deliberately-removed behavior, "fix" something that is the way it is on purpose, retry a ruled-out approach, or violate a constraint invisible in the code. It never holds behavior (the **what** belongs in the Approach — concern 2).

This is where the cleanup agent is most useful, because a finished plan accumulates entries that read like valid decisions and pass every _formatting_ rule yet warn of nothing. For each entry, apply the test from its own end: _what does a future agent get wrong without this?_ If the answer is "nothing," delete it — being true and non-obvious is not enough. The failures:

- **Harmless rationale.** An entry that records a real, non-obvious reason behind a choice that endangers nothing if forgotten — a placement, a naming call, "why we structured it this way." It passes the format and fails the bar. Delete it.
- **Doc-structure entries.** "Split this plan", "imported from the old folder", "this concern is a sibling of that one", "the spec lives in the .md not the README." The shape of the plan tree is invisible to the code, so it prevents no code mistake. Delete it — and never log the cleanup pass's own restructuring (concerns 1–2). A cleanup pass leaves no trace of itself in `MEMORY.md`.
- **Change narration.** "It used to be Y", "we switched from A to B." Strip the narrative; keep only a surviving constraint, and only if that constraint would itself trip a future agent ("tried X, it failed because Y, so it is Z" survives for Y). If nothing survives the bar, the entry goes.

## 4. README sections present, each at its own altitude

The home of this rule is [INSTRUCTIONS.md](INSTRUCTIONS.md) §"What's inside a README." A plan-folder README carries its sections — **Intent** (What & why, Approach), **Plans**, **Cursor**, **Open threads**, and optionally **Supporting docs** — and keeps them as the plan evolves. A long implementation tends to let one erode. The cleanup agent checks each is present and that nothing has crept in below its altitude.

- **Missing or collapsed sections.** A README that has lost its Cursor, or never grew an Open-threads slot, or folded Approach into What & why. Restore the section. (Approach correctness itself is concern 2; this check is only that the slot exists.)
- **Resolved threads lingering in Open threads.** That slot holds only _open_ unknowns. Once resolved, an item leaves it — its non-obvious reasoning moving to `MEMORY.md` (concern 3), the rest dropped. Clear out anything already settled. Open threads are agent-resolvable by definition; a question that turns out to need the user belongs in `QUESTIONS.md`, not lingering here (see **The question channel** in [README.md](README.md)).
- **Step descriptions pitched below the parent's altitude.** Each entry in the **Plans** index names a child as `<child> -> <concern>`: the concern the child _governs_, at the parent's altitude. The failure is a description that reaches down into the child's internals — naming a specific mechanism, field, or helper instead of the concern. For example, a frontend-foundation child whose index line reads `shell/ -> the app shell, sidebar, and the lockState prop` has leaked `lockState`, a child-internal detail, into the parent's one-line concern. The concern is "the shared frontend foundation"; `lockState` lives inside the child, not in the parent's name for it. Lift each step description back to the concern it governs and let the detail stay down in the child.

This concern and concern 1 share the altitude principle but act at different grains: concern 1 de-duplicates prose _across_ files; this one checks that each README has its _sections_ and that the **Plans** index in particular names children at concern altitude.

## 5. Cursor written at its own altitude

The home of this rule is [INSTRUCTIONS.md](INSTRUCTIONS.md) §"The cursor: how to find where work stands." A cursor answers _where am I, what was just done, what's next_ for **one** node. A plan-`.md` cursor holds the real, concrete next action. A folder cursor holds **no detail of its own**: it names its in-progress child(ren), rolls each to a step status, and adds at most one line of seam reasoning (why this child before that one).

The cleanup agent checks the cursor's _shape_, not whether it agrees with the children:

- **A folder cursor that restates child internals.** It describes _what's happening inside_ a child — which operation is half-built, the exact next line of code — instead of naming the child and its roll-up status. That detail has one home, the child's own cursor. Lift it out; leave the parent cursor naming the active child and its status, plus seam reasoning if any.
- **A cursor that flattens the whole subtree.** A node's cursor reaches several levels down, painting a global picture. No node owns the global state — it exists only as the assembled path. Trim each cursor back to its own level.

**Contradiction is not this concern's job.** When a parent's marker or cursor _disagrees_ with the child it points at — parent says `[x]`, child says `[~]`; cursor names a child that's actually finished — that is doc-to-doc drift, repaired edge-first by a different procedure. Don't reconcile it inside a cleanup edit: follow [DOC_TO_DOC_DRIFT.md](DOC_TO_DOC_DRIFT.md). This concern only fixes a cursor that is _shaped_ wrong; that one fixes a cursor that _says the wrong thing_.

## 6. Every step is a child plan, every child plan is a step

The home of this rule is [INSTRUCTIONS.md](INSTRUCTIONS.md) §"What's inside a README" (the no-bare-steps rule): a node's **Plans** index and its actual children are the same list seen two ways — every step maps 1:1 to a child plan, and there are no bare steps. A long implementation breaks this when work is added to the folder without indexing it, or an index line outlives the child it named.

- **Orphan step.** An index entry with no child plan behind it — a bare to-do that was never spun out into a plan `.md` or folder. Either the child exists under another name (relink the step) or the step is describing ad-hoc work that should not be a step at all (remove it).
- **Unindexed child.** A plan `.md` or plan folder sitting in the directory that no parent step points at. Add it to the **Plans** index at the right altitude (concern 4) so the tree stays self-indexing.

The `_docs/` folder is the deliberate exception: its underscore marks it as not a node, so it never appears as a step and is not an unindexed-child finding.

## 7. A plan `.md` that should be a folder

The home of this rule is [INSTRUCTIONS.md](INSTRUCTIONS.md) §"Splitting or merging a plan" and the promotion move it describes. The recursion is the system's whole point: large concerns subdivide so each piece stays a single working surface. An implementer under load often skips the split and lets one `.md` accumulate several independent sub-areas — so a plan reaches finalized state as a folder that never formed. The other concerns assume the tree is already shaped right; this one checks the shape itself.

Unlike concerns 1–6, **this is detect-and-propose, not fix.** Splitting reshapes the tree, which goes through the user first (confirm-before-reshape). The cleanup agent surfaces the candidate and its proposed split as a question in `QUESTIONS.md` (**Blocking on a user decision**, [INSTRUCTIONS.md](INSTRUCTIONS.md)); it does not silently re-carve.

- **The tell.** A plan `.md` whose top-level sections are **peer contracts over different code, sharing no single through-line** — each could stand alone, each covers a distinct file group, none is a sub-detail of another. A spec for one cohesive concern naturally has many parts; the signal is not length but **independence**: sections that are siblings, not a concern described at increasing detail.
- **What to propose.** The ordinary promotion move applied late: the coordinating intent rises into the folder's README (What & why, a thin Approach indexing the children), and each independent sub-area drops into its own fresh plan `.md`. Name the proposed children and what each would cover in the plan's `QUESTIONS.md`, then stop and wait for the user's answer before carving.
- **Do not over-correct.** A long but cohesive plan — one concern, many facets, one cursor — stays a single `.md`. The question is never "is this big?" but "is this several concerns wearing one hat?" When in doubt, it is one concern; propose a split only on a clear independence signal.

## Working order, in short

The concerns are listed by importance, not by execution order. Run a pass like this:

1. **Read the whole subtree first** so you know what's shared, what's local, and what the code actually does — you can't write a spec, place a shared rule, or judge whether a node should split without seeing the whole picture.
2. **Settle the shape** (concerns 6, 7). Fix the bijection yourself: every step has a child, every child is indexed. Where a single `.md` is really several concerns, **raise the split in `QUESTIONS.md` and wait for the user** before carving — don't clean prose into a shape you're about to change. Settle shape first so the rest of the pass runs on the real tree.
3. **Settle content bottom-up, leaves first** (concerns 2, 3, 1). At each leaf: write the Approach as a spec, not a catalog; strip `MEMORY.md` narration; cut ancestor-idea, sibling-survey, and shared-rule restatements. A leaf should open directly on its own task at full detail.
4. **Settle each parent** (concerns 1, 4, 5). Make each README the single home for its subtree's idea, index, and shared rules; pull every shared rule up to its lowest common ancestor; restore any missing sections and pitch each step description and cursor at the parent's altitude.
5. **Route or propose, don't silently reshape.** Any code↔doc disagreement goes to [CODE_DRIFT.md](CODE_DRIFT.md); any parent↔child marker/cursor contradiction goes to [DOC_TO_DOC_DRIFT.md](DOC_TO_DOC_DRIFT.md); any tree-reshape (a split, concern 7) goes through the user via `QUESTIONS.md`. The cleanup pass fixes how the docs are _written_ on its own; it does not redraw the tree or overrule the code without confirmation.
6. **Re-read top-down at the end.** Walk root → leaf as a first-time reader. Detail should rise at every step, every Approach should be reimplementable, and nothing should be said twice.
