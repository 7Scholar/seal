# Recursive Plan

> **This document is the complete design of the recursive plan** — its full structure, contracts, and the reasoning behind them, at both high and low level. **An agent using the system does not act on this document; it acts on the distilled, agent-facing operating instructions in [INSTRUCTIONS.md](INSTRUCTIONS.md)**, which carry only what an agent needs to know to work. By definition the README is always the more elaborate of the two, and INSTRUCTIONS.md a need-to-know distillation of it.

## Purpose

A self-sustaining planning and documentation system that lets an AI agent or user pick up any piece of work **cold — without conversation history** — and know exactly where things stand and what to do next.

## Core principle

A living record of contextual state: what exists, what is in progress, what decisions shaped the design, and what comes next.

## The system is still being hardened

This system is recent and has not been exercised over a long stretch of real work, so it still has rough edges. They show up in several forms: coverage or sync scripts that fail on the first try or need an undocumented incantation, error messages that don't print the fix they promise, instructions in this document or [INSTRUCTIONS.md](INSTRUCTIONS.md) that don't fit the situation in front of an agent or that pull against each other, conventions and plan shapes that create friction instead of removing it, and doc/code inconsistencies the sync tooling hasn't caught yet.

**These are expected, and they are most valuable to surface now.** Early friction is the signal that shapes the system into its settled form: each rough edge named while the system is young is a chance to fix the script, sharpen the instruction, or drop the convention that caused it. Friction that gets quietly worked around does the opposite — it teaches the system nothing, leaves the rough edge in place for the next agent, and lets one-off patches accumulate where a real fix belonged.

So the operating stance is: **an agent that hits friction with the system itself flags it and resolves it together with the user, rather than papering over it alone.** The fix targets the system — the script, the instruction, the convention — not just the single instance in front of it. This is **friction with the system**, a live collaboration about improving the tooling and docs — distinct from a **plan question** (a crossroad in the work itself), which is never put to the user live but always raised in `QUESTIONS.md` (section 7). Doc/code inconsistencies are the one case with an established procedure (the `DRIFT.md` flow in [SYNC.md](SYNC.md)); the rest of the friction is worked out with the user as it arises. This will happen more in the early going and taper as the system settles. The agent-facing, distilled form of this rule lives in [INSTRUCTIONS.md](INSTRUCTIONS.md) ("Flag friction with the system itself").

---

## 1. Structure: one recursive node type

- The unit of documentation is a **concern**, not a code location.
- A plan is **recursive**: the same node type at every depth. A plan decomposes a parent concern into child concerns, each of which is itself a plan that decomposes further, until eventually reaching plans that describe actual code.
- **A plan takes either of two physical forms:** a plan `.md` file under a parent, or a plan folder that is itself a full node. "Plan" names the concept regardless of form; "plan `.md`" and "plan folder" are used only where the form matters. **How a plan grows** (below) explains which form fits which scope and how one becomes the other.
    - A **plan `.md` file**'s entry point is the file itself.
    - A **plan folder**'s entry point is its `README.md` — see **README interior** for what it holds. Its children may be plan `.md` files, plan folders, or a mix; whenever it holds plan `.md` files directly, a `coverage.json` sits alongside them recording the code those plans describe.
- **A node's "steps" are its child plans, each with a roll-up status.** A node never restates a child's internal steps; it points to the child and reflects the child's status.
- **A node's work is divided into steps, each linking 1:1 to a child plan — no bare steps.** The step list is the plan; every step points at the child plan that holds its detail. For how steps come about, see **README interior** (section 3); for small, one-off, or ad-hoc changes that don't warrant their own step, see **Resolving drift** (section 4).
- **Cross-cutting features are not a special case.** A feature spanning multiple code layers (frontend/backend/db) is just an ordinary plan folder — no new node type needed.
    - **The children are the layers.** A feature like `plan-a/` becomes a folder whose children are its layers (`plan-a-1/`, `plan-a-2/`), each governing its own slice of code via its own `coverage.json`. "Spans three layers" simply means "has three children"; the recursion already handles it.
    - **The README is the seam.** The integration boundary between layers — the contract one layer exposes to another — lives in the parent folder's README, because that folder is the one node that sees all its children at once. Layer detail stays down in each child; the README holds only what connects them, never restating a child's internals (the same altitude rule as the cursor).

### How a plan grows

The system serves work of any size by letting a node enter at any altitude and grow without limit: a few scribbles in one `.md` can become a plan folder, then sprout dedicated child plan `.md` file, then turn those into dedicated plan folder, and those in turn can sprout their own — the same recursion at every level. Growth runs mostly upward, but a folder may also collapse back to a single `.md` when its scope drops durably and clearly will not scale up again. Both directions are deliberate, distilling moves (below), not churn — a folder that flickers up and down every session is worse than one left slightly oversized, so collapse needs a clear, lasting drop in scope, not a quiet stretch.

#### Scope assessment: calibrate effort to the size of the concern

Before any carving, an agent **gauges how big the concern actually is** — and that one judgement drives everything that follows: the form it reaches for, how many questions it raises, and how ambitious the eventual design must be. This is the missing front-of-mind move that keeps a node from being carved too thinly. Scope is a spectrum, anchored by two ends:

- **Small concern — carve it now.** _"Add a dialog for deleting a row."_ It is one self-contained sub-area that bottoms out in code with no real decomposition. The agent can frame **and** solution it immediately, in a single plan `.md`, raising a question only if a genuine fork appears. There is no value in ceremony here; the work is to do it.
- **Large concern — recognize it, do not carve deep alone.** _"Create an AI chat."_ This is a sprawling concern that will eventually run several plan folders deep (history, streaming, model selection, storage, auth boundaries, UI). **No agent is expected to carve that whole structure in one pass** — the entire point of the recursion is that successive agents build it up over time (one frames, the next researches, the next carves a slice, the next implements). What the agent **is** expected to do is _recognize the scale_ and act accordingly: frame it as a plan folder, and surface the major design crossroads it can see as blocking questions in `QUESTIONS.md` (section 7) rather than silently committing the design to a guess. **A large concern legitimately generates design-fork questions the moment it lands, even when its placement was never in doubt** — recognizing "I cannot responsibly carve this deep without the user" is itself a valid block, not just reshape-and-placement ambiguity.

Most concerns sit between these ends, and the agent slides its effort along the spectrum to match. **The asymmetry to internalize:** under-carving a large concern is the costly failure — a thin node hides the structure and the design forks, and a later agent inherits a shape that quietly committed to decisions nobody made. Over-ceremonializing a small one merely wastes a little motion. When unsure which end a concern is closer to, lean toward treating it as the larger: name the structure and raise the forks.

**A folder's children are sized for what they are, the moment they are first named — not for how much has been written yet.** The same judgement as above, applied one level down: a candidate child carrying its own independent state, its own design history, or its own reason to need a cursor gets its own plan `.md` immediately, rather than several such candidates bundled into one child `.md` "for now." Plans overwhelmingly grow and rarely shrink, so the two mistakes are not symmetric: a `.md` framed too finely costs almost nothing (an under-used sibling folds back in easily, per **Promotion is distillation** below), while a `.md` framed too broadly costs real rework, because by the time it is obviously oversized its design decisions for what should have been separate children are already entangled in one document.

Whether a concern already has an owner and whether it has a node are separate questions:

- **A missing node is not a missing owner.** A concern can have a real owner — some node whose Approach already states the design or contract it follows — without any node yet holding its coverage. A file that mirrors another layer's shape (a frontend type mirroring a backend record, a generated client mirroring a schema) is owned by whichever node states the contract it mirrors, even before anything claims its files. The fix is to add its coverage under the plan that already owns the contract, as a sibling slice of that plan (e.g. a `frontend.md` beside a `backend.md`, both under the one node stating the shared contract) — never a new node, which would fork a contract that already has a home.
- **A concern with no owner anywhere earns its own node**, the same as any self-contained module (below). A cross-cutting registry, adapter, or dispatch mechanism that several unrelated concerns route through, with no governing contract elsewhere, is a concern in its own right — carve it as one rather than folding it into whichever consumer happens to be nearby.
- **A procedure is not an implementation.** A short recipe that names the order to build something in and points at the real contracts elsewhere carries no coverage and specifies no behavior of its own — it does not need a node the way an implementation does. Two things that both currently lack an obvious home are not automatically the same kind of gap: place each by what it actually is, a mechanism or a procedure. When a pass turns up more than one gap of the same kind, give them one consistent home rather than deciding each in isolation.

#### Build each concern as a self-contained module

Carving the plan tree well is only half the shape; the **code a plan describes** is built to match it. Build each concern as a self-contained module: code that only that concern uses lives **inside** the concern's own files. You lift a piece of code out into a shared file **only when another concern actually depends on it** — sharing is forced by a real dependency, never the default. A concern's code is local until something outside it needs it.

This keeps coverage clean for free, because coverage is per-file (section 4): a file's concern owns it, so a change to it flags that concern's plan and no other. A shared file is legitimate precisely when the concerns depending on it **should** all re-review on a change — a shared **seam type** (a `SecretEntry` contract many plans read) is the good case: change its shape and every consumer is correctly flagged. What you avoid by keeping code local is the opposite — a file holding several unrelated concerns, where editing one flags every plan covering the others for no reason. Modularity, applied by default, makes that file never form.

This is a default the agent applies on its own at the **Solutioned** state (lifecycle below), the same way it carves plans without asking. Pulling code out into a shared file when a dependency appears is ordinary design. (If the code being moved is already covered by a plan, re-point coverage as in [SYNC.md](SYNC.md); the modularity itself is the agent's to apply freely.)

**Two registers.** The two plan forms are not just different sizes; they hold content at different registers.

- A **plan `.md`** is a **working surface** — a notepad for whoever is implementing. It is allowed to be loose: mid-implementation it carries scribbles, dead ends, and half-formed structure. It still follows the plan `.md` interior (section 3), but loosely; it is where messiness is permitted.
- A **plan folder** is an organized group of plans — its **README** is a _coordinating surface_, high-altitude and disciplined. It states intent and indexes the plan, and it must stay at its own altitude so it does not duplicate the detail living below it. A README is not a bigger notepad; it is a different kind of document.

The "working surface" register describes a plan `.md` **in flight**, not at rest — and that distinction is important enough to make explicit, because it is what the whole system is built to produce.

### The lifecycle of a plan

A plan `.md` is not one document. It is the same file moving through four states, and its register tightens as it advances:

1. **Framed** — the concern is stated as a problem: what is missing or broken and why it matters, what already exists, the open questions. **Approach** is `TBD`. Nothing is solved yet; the next move is research or brainstorming, never building. (This is the state a brand-new node starts in — see **README interior**, section 3.)
2. **Solutioned** — research and discussion shape the Approach from `TBD` into a chosen solution direction, taking the rest of the plan into account, and the steps are locked in. The plan now says how the concern will be built, not just what it is. **The design bar here is production-ready by default, not minimum-viable.** The Approach a plan commits to before implementation should be the comprehensive design — the one that reveals the concern's real structure, its layers, its edge and failure behavior, its seams — not the thinnest sketch that would compile. Designing fully _before_ building is deliberate: it surfaces the decomposition and the design forks while they are still cheap to change, rather than discovering them mid-implementation when the shape is already set. A solutioned plan that reads as a stub is under-designed; the natural next move on it is not to start building but to deepen the design (and, for a large concern, to raise the forks that deepening exposes — section 7).
    - **The design's register tracks scope** (scope assessment above): a **large** concern designs the _scope split_ and a scalable, robust shape, not the code; a **small** code-bottoming concern designs the _actual implementation_. Same production-ready bar, aimed at the altitude the concern lives at.
3. **In flight** — implementation is underway. Steps and Approach co-evolve: a step that proves wrong when tested feeds a correction back into the Approach, which may reshape later steps. **This is the only state where the loose notepad register applies** — scribbles, dead ends, half-formed structure are all permitted here, because the document is actively thinking.
    - **A code-bottoming plan's in-flight steps follow a default arc, flexed by scope:** **sanity-test the proposition** (a cheap throwaway check of the chosen Approach against the real system before implementing, to catch what would steer the design) → **implement** → **unit tests** → **test scripts** (a distinct phase after unit tests: exercise the real implementation end-to-end — happy path, stress, edge cases, and a deliberate attempt to break it — per the per-area testing tooling, section 6). It is a recommended shape, not a rigid template — steps still map 1:1 to the concern (no-bare-steps rule), and a plan may collapse or reorder where the concern calls for it. The sanity-test and the test scripts are named because they are the two phases most often skipped.
    - **A bug-fix plan follows a different arc, and its first phase is not optional: reproduce → diagnose → fix → confirm the reproduction is gone.** The reproduction comes _before_ the fix, always. Its role is the bug-fix counterpart of the sanity-test: a concrete, re-runnable demonstration of the wrong behavior against the real system — the failing test, script, or driven scenario that exhibits the bug. Without it there is no way to know a code change fixed anything: a fix applied to an unreproduced bug is unfalsifiable — it may have changed nothing, or masked the symptom while leaving the cause, and neither the agent nor a later reader can tell which. So the reproduction is what makes the fix _verifiable_: the same reproduction, re-run after the fix and now passing, is the proof. Diagnosis sits between them — a reproduction localizes the cause, and the fix targets that cause rather than the symptom. Skipping straight to a plausible-looking fix is the failure this arc heads off; a bug whose reproduction is hand-waved ("this line looks wrong, changing it") is not yet solutioned. When a bug genuinely resists reproduction, that difficulty is itself the work — narrow it until it reproduces, or raise the blocker — never proceed to a fix on a bug you could not first make fail on demand.
4. **Finalized** — implementation is done and verified. The Approach now describes **exactly what was built**, at the disciplined register of a specification.

**Writing the code is the small part — usually one step.** The weight of a plan lives in the work _around_ it: framing, design and research to a production-ready bar, and the verification after (sanity-test, unit tests, test scripts). Treating the plan as a wrapper around the coding and rushing to implement is the system's most common failure in practice — a plan that is mostly an implementation step is almost always under-designed and under-tested. The hard parts are the thinking before the code and the breaking-it after, not the typing in between.

**The finalized state is the point of the entire system.** A plan does not exist to track work and then get discarded; it _becomes_ the documentation. So a finished plan `.md` is held to a hard standard: its **Approach must be a complete enough specification that a developer or agent could reimplement the concern from the Approach alone**, without reading the code. The code is _one valid realization_ of that spec — not the thing the plan is about. This is what lets the same artifact serve as notepad, history, current state, and final documentation in turn: the notepad of step 3 is distilled into the specification of step 4, in place, in the same file.

**Plans start at step 1** (a blank problem) and evolve down the arc to step 4 (a reimplementable spec). The failure mode at step 4 is producing anything less than that spec — most commonly a **catalog** of files and functions rather than a specification of behavior.

**Specification, not catalog.** The failure mode that defeats the finalized state is writing _about the code's structure_ instead of _stating the code's behavior_. A catalog reads "here are the files, here is roughly what each does" — one-line glosses that point _at_ the code; a reader can navigate with it but cannot rebuild from it. A specification states the **contract the code satisfies**: its invariants, the ordering of its operations, its error and edge-case behavior, its concurrency and limit semantics — the durable behavioral layer a reimplementer actually needs. It deliberately omits the **volatile** layer (exact syntax, line-by-line logic), because that is what the code itself holds and what coverage ties back to the spec. Stating the contract once, in the plan that owns it, is not duplication of the code — it is the plan's reason to exist. (This is also why behavior never lives in `MEMORY.md`: `MEMORY.md` holds the mistake-preventing **why**, the Approach holds the **what**. A plan whose load-bearing behavior is only findable in its `MEMORY.md` has a hollow Approach.)

**Promotion is distillation, not a rename.** A plan `.md` earns its own folder when it is becoming its own entity — enough independent state, its own cursor, or work that no longer fits one working surface. That promotion is a single operation at every level (lone starter `.md` → plan folder is the same move at every depth), and it is **not** "rename the `.md` to `README.md`." The loose notepad content is **distilled**:

- the keep-worthy thinking rises into the new folder's README at coordinating register — boundaries and readiness into **What & why**, the emerging solution into **Approach** (section 3);
- the actual working detail drops back down into one or more fresh plan `.md` files under the new folder, where loose register is again allowed.

The README ends up high-altitude; the mess moves down a level, never up. _When_ to promote is a judgement call left to whoever works the node; what makes a promotion _correct_ is this distillation — keep-worthy thinking rising to the README at coordinating register, working detail dropping into fresh plan `.md` files — rather than notepad prose carried whole into a README slot.

**Promotion happens at two times: in flight, and as a later repair.** In flight, the implementer promotes at the moment a node outgrows one working surface. After the fact, the cleanup pass promotes a finalized plan that should have split but didn't — a single `.md` that has accumulated several independent sub-areas. Such a plan is structurally wrong: the recursion exists precisely so large concerns subdivide, so an over-stuffed `.md` is a folder that never formed. Its tell is a plan `.md` whose sections are **peer contracts over different code, sharing no single through-line or cursor** — not merely a long plan, since one cohesive concern legitimately has many parts. The repair is the same promotion move: lift the coordinating intent into a README, drop each independent sub-area into its own fresh `.md`. Because it reshapes the tree, it goes through the user first via the question channel (**Confirm before you reshape**, [INSTRUCTIONS.md](INSTRUCTIONS.md); the channel itself is section 7); the cleanup pass carries the detector.

**Collapse is the disciplined inverse.** When a folder's scope has durably shrunk, it folds back into a single plan `.md` under its parent. The danger is the mirror of promotion done wrong: the folder's README and `MEMORY.md` carry irreplaceable content (high-altitude intent, mistake-preventing constraints) that an agent will be tempted to just delete with the folder. So collapse **rescues the irreplaceable first**, then merges down:

- the surviving working detail (the folder's plan `.md` files) merges into the single `.md`;
- each existing `MEMORY.md` entry is re-checked against the memory bar (below) and, if it still prevents a future mistake, relocated by ownership — an entry about the _parent's_ design rises to the parent's `MEMORY.md`, one local to this work moves into the surviving `.md`. An entry that no longer clears the bar is dropped; that is applying the rule, not losing content. The collapse itself is a doc-structure change and generates no new entry.

Only after the load-bearing content has a home does the folder go away.

### Existing code is a reference, not a template

Much of the work may point at existing code — an earlier implementation, an adjacent module, a reference project — as a source to learn from. The stance toward that code is the load-bearing thing, and it is **skeptical but not dismissive**: treat it as code written by another capable developer, which means holding two assumptions at once — that **it has flaws** (it is almost never the best possible version of itself) and that **it was written the way it is for a reason** (there is context behind its choices the agent may not see yet). Neither assumption alone is safe: drop the first and the agent copies flaws forward; drop the second and it rewrites away hard-won constraints it didn't understand. Existing code is a reference to reason from, never a template to copy on trust.

That stance resolves into a concrete read on any piece of code being reused:

- **Normal-looking code → copy, modifying where the new context needs it.** When the code reads cleanly and its choices are legible, the reasonable-author assumption holds; reuse it and adapt it to the new home.
- **Strange or complex-looking code → investigate before deciding.** Odd code is genuinely ambiguous: it is either **poorly written** (then rewrite it, don't carry the mess into the new code) or **subtly right** for a reason that isn't visible on the surface (then the strangeness is load-bearing, so copy it and modify only as needed). The agent does **not** resolve this by guessing — it digs in until it knows which case it is, because the two cases call for opposite actions. A constraint discovered this way that a future agent would otherwise "optimize" back out is exactly a `MEMORY.md` entry (the memory bar, section 3).
- **Always → leave it better.** In every case the agent looks for the improvement the reuse makes available and takes it; it does not copy a flaw forward just because the source had it. Reuse is an occasion to improve the code, not an excuse to inherit its problems.

This is the same production-ready bar the lifecycle sets (the **Solutioned** state above), turned toward reused code: a design that launders an existing flaw into the new code is not production-ready, however faithfully it copies the source. Studying existing code is how solutioning is done well; copying it uncritically is how a thin design hides.

### How the current state is tracked

The current state of all work lives in **the cursor** — not one file, but a distributed structure assembled from every node in the tree.

**A cursor is a single README section.** Each node's `README.md` has a **Cursor** section: a hand-written, free-text status answering _where am I, what was just done, what's next_ for that one node. There is exactly one per node, and it is the only place that node's live status is recorded.

**The cursor (singular, the whole thing) is the path these sections form down the tree.** No file holds the global state — not even the root. A node's cursor records only _what was just done and what's next at this node_, never a flattened picture of everything below it; the full state exists only as the assembled path, reconstructed by walking from the root:

- A cursor on **a plan `.md` file** holds the **real next action** — the dense, concrete detail (which operations are implemented, what was just finished, the exact next step).
- A cursor on **a plan folder** holds no detail of its own. It points down by **naming its in-progress children and rolling each to a step status** — plus at most a line of seam reasoning (why this child before that one). There may be **more than one** in-progress child at once: if `plan/` has ten children and three are `[~]`, its cursor names all three and points into each. "Active child" is the common case, not a constraint.
- **Resuming cold** = read the root cursor → it names the in-progress child(ren) → descend into each → read its cursor → repeat → until the active plans, whose cursors hold the actual next actions. A single in-progress child is a straight line down; several is a fan-out into parallel paths. No conversation history needed.

So "the cursor" is a path (or a fan of paths): a chain of Cursor sections, one per README, each pointing one level deeper, terminating at the plan or plans that hold the truth.

#### Each cursor is written at its own altitude

The reason this path stays cheap to maintain is that a parent cursor and a child cursor answer **different questions**, so the parent never duplicates the child — it summarizes the child as one of its own steps.

A parent's vocabulary is its **own step list**. Each step _is_ a child plan, written `<child> -> <concern>`: the left side is the child's physical name — a plan `.md` file (e.g. `dotenv.md`) or a plan folder (e.g. `json/`), so the child's form is visible at a glance — and the right side names the concern it governs. A parent cursor references a child only through this step line plus its roll-up status marker, and at most a line of seam reasoning (why this child before that one). It does **not** restate the child's internal status — that detail has exactly one home, the child.

Worked example, with placeholder names. A code-describing cursor (e.g. a YAML format suite) carries the dense detail: which operations are implemented, what was just finished, the exact next action. Its parent, a "secret file formats" folder, holds only:

```
## Steps
- [x] dotenv.md -> dotenv format suite
- [~] json/ -> JSON format suite
- [~] yaml/ -> YAML format suite
- [ ] toml/ -> TOML format suite

## Current Cursor
dotenv complete. JSON and YAML in progress. Next: finish JSON, then YAML.
```

The parent says nothing about details inside yaml/ (e.g. multi-document parsing or its internal module layout) — that is the child plan's job.

#### Propagation: bottom-up, only on a child step-marker change

The lowest plan is always the **first writer**. Propagation is triggered **only when a child's own step marker changes** (a child finishes `[~]`→`[x]`, or becomes `[!]` blocked) — because the child _is_ a step in the parent.

- **When it triggers, the parent is updated in the same session.** Detail only crosses up to the parent when relevant to the parent; otherwise the parent update stays minimal and high-level.
- **It propagates only as far as the marker change is visible.** It stops as soon as a parent's own step status is unaffected.

Because the only thing a parent restates is a single step marker, the worst-case drift is one forgotten marker flip — a single visible bit, not a buried contradiction. The cold-resume read catches it: descending into the child immediately reveals the true state. Repairing such drift is mechanical — see [DOC_TO_DOC_DRIFT.md](DOC_TO_DOC_DRIFT.md).

---

### Example

The below tree shown what a realistic plan would look like. Names are placeholders, not a real project. `plan/` is the root concern. It decomposes into child plans, each a full recursive node:

```
plan/
  README.md
  MEMORY.md
  plan-a/
    README.md
    MEMORY.md
    plan-a-1.md
    coverage.json
    plan-a-2/
      README.md
      MEMORY.md
      plan-a-2-i.md
      plan-a-2-ii.md
      coverage.json
    plan-a-3/
      README.md
      MEMORY.md
      plan-a-3-i.md
      coverage.json
  plan-b/
    README.md
    MEMORY.md
    plan-b-1.md
    coverage.json
```

Reading the tree as the author built it — top-down, each node's intent spawning its child plans:

- **`plan/` is the root.** Its README states the top-level intent and approach, which can be split up in two child plans — `plan-a` and `plan-b` — each a step in its Plans index with a roll-up status. `plan/` holds no `.md` plans of its own, so its children are all plan folders and it has no `coverage.json`.
- **`plan-a/` carries an intent and approach that requires further decomposition into three parts: plan-a-1, plan-a-2, plan-a-3.** `plan-a-1` stays a plan `.md` directly under `plan-a/`; `plan-a-2` and `plan-a-3` turn out to be so large that they require their own plan folders. `plan-a/`'s `coverage.json` sits alongside `plan-a-1.md` and covers it.
- **`plan-a-2/`'s intent and approach are self-contained enough to bottom out in code.** It earned its own folder (independent state and a cursor worth tracking — section 1), and its work splits into two plan `.md` files: `plan-a-2-i` and `plan-a-2-ii`. `coverage.json` covers both `plan-a-2-i.md` and `plan-a-2-ii.md`.
- **`plan-a-3/`'s intent and approach needed only one plan `.md`:** `plan-a-3-i`. `coverage.json` covers `plan-a-3-i.md`.
- **`plan-b/` sits directly under root.** Its intent and approach fit one plan `.md`, `plan-b-1`. `coverage.json` covers `plan-b-1.md`.

Note that `coverage.json` is explained in [SYNC.md](SYNC.md).

Each node's intent is the thing being decomposed; a folder's children may be other folders, plan `.md` files, or a mix, and a `coverage.json` appears wherever plan `.md` files sit. Every step maps 1:1 to a child plan in either form (the no-bare-steps rule, section 1).

The cursor as a path down this tree. Suppose `plan-a/` has both its child folders in progress at once — the fan-out case (section 1):

```
plan/README.md             cursor → "plan-a/ in progress; plan-b/ not started"
  plan-a/README.md         cursor → "plan-a-1.md done; plan-a-2/ and plan-a-3/ both in progress"
    plan-a-2/README.md     cursor → "plan-a-2-i.md done; next: plan-a-2-ii.md step 2"
    plan-a-3/README.md     cursor → "next: plan-a-3-i.md step 1"
```

Resuming cold = read `plan/README.md` cursor → descend to `plan-a/` → its cursor names two in-progress children, so the path **fans out**: descend into both `plan-a-2/` and `plan-a-3/`, each a plan whose cursor holds a real next action. No conversation history needed.

---

## 2. Storage

- Physically **central** under `context/plans/`, one folder per root plan (e.g. `context/plans/app/`).
- The recursive doc tree lives **wholly** under its root-plan folder; it does **not** mirror the code tree physically. Plans that describe code **point at** the code they govern via the coverage manifest (below).
- The tree is **self-indexing**: each README's child list is the local registry. Likely no separate global registry file needed.

---

## 3. Per-node files (information placement)

Keep this minimal — maintenance load is the main thing that kills doc systems. `README.md` and `MEMORY.md` are the always-required files; the others are optional and should stay rare.

- **`README.md`** (required) — see **README interior** below.
- **child plans** (optional) — a node's children, each in either form (section 1): a plan `.md` for one sub-area (see **Plan `.md` interior** below), or a plan folder that is itself a full recursive node with its own README.
- **`MEMORY.md`** (required) — see **MEMORY.md** below.
- **`coverage.json`** (generated) — which code this node governs + freshness. See **section 4**.
- **`QUESTIONS.md`** (optional, ephemeral) — the async question channel: blocking questions the agent needs the user to answer before the plan can proceed. It sits alongside the plan `.md` files, like `coverage.json`, and exists only while a question is open — its presence is the signal that work here is blocked on the user. See **The question channel**, section 7.
- **`_docs/`** (optional) — a folder of freeform supporting `.md` documents this node wants an agent to follow: UI conventions, coding standards, testing rules, architecture notes, a glossary — anything prescriptive or referential that is not itself a plan. **The underscore marks it as not a node:** it is never a child plan, never appears in the **Plans** index, is never a step, and is never covered as code (like everything under `context/plans/`, it is invisible to coverage — see **section 4**). A node points at these files from its README **Supporting docs** section (below); the files hold the body, the README holds only the pointer. See **Supporting docs**.

The underscore prefix is the general signal for "this folder is not a plan node." `_docs/` is the one named use of it; the same convention covers any other non-node folder a node may need.

### README interior

A node README always has sections 1–4; their content evolves but the sections persist. Section 5 is optional.

1. **Intent** — the node's _why_ and _how_, in two labelled parts:
    - **What & why** — what this concern is, its boundaries, and its readiness definition. At a high-altitude node this reads as a feature ("the file system"); at a node that bottoms out in code it reads as a problem ("X is broken / missing and why it matters"). Same slot, viewed at different altitudes — not a special case.
    - **Approach** — the solution surface: input, output, key mechanisms. This is the **brainstorming canvas**. It starts at `TBD` and fills in as the solution emerges through research, brainstorming, or implemented child plans. Its weight tracks altitude: a node that only organizes children may stay one line ("decomposes into the layers below — see children"), because the real solutioning lives in the children; a node that bottoms out in code grows into the designed solution before child plans are spun off.
2. **Plans** — the index of this node's child plans (plan `.md` files, plan folders, or a mix), each a step with a roll-up status marker, under the no-bare-steps rule (section 1). On a fresh node whose Approach is still `TBD`, the first step is typically `[ ] Research solution directions` — research the problem space, land findings in Approach, then real implementation plans appear.
3. **Cursor** — where work stands and what's next, written at this node's altitude (section 1).
4. **Open threads** — agent-resolvable unknowns that shape future work: a thing to research, a decision the work itself will settle, something that depends on what a later step reveals. These never block — the node keeps moving (`[~]`) while they sit here, and an agent closes each by doing the work. They are written as notes-to-self ("backoff tolerance unknown; determine by testing before step 3"), not as questions addressed to a person. An item lives here only while open: once resolved it leaves this slot, and its reasoning moves to `MEMORY.md` only if forgetting it would later cause a mistake (the memory bar below). Resolved threads and their reasoning do **not** stay in the README. A thread that turns out to need the **user** to decide is not resolved here — it is promoted to a blocking question in `QUESTIONS.md` (see **The question channel**, section 7).
5. **Supporting docs** (optional) — pointers into this node's `_docs/` (section 3). Each pointer is a **trigger + link**, written so a cold agent reads only what is relevant: `When touching the UI, follow [ui.md](_docs/ui.md).` The body lives in the file; the README never restates it. Kept rare on purpose — maintenance load is what kills doc systems — so a node has this section only when it genuinely carries rules or reference material an agent must follow.

A `TBD` Approach is a meaningful signal to a cold agent: this node has been scoped but not yet solutioned, and the next move is research or brainstorming rather than implementation.

The README does **not** hold raw implementation detail (that is a plan `.md`'s job), a full change history (that is git plus the curated `MEMORY.md`), or resolved open threads.

An empty `README.md` looks like this:

```md
# Intent

## What & why

To be filled in.

## Approach

TBD.

# Plans

No child plans yet.

# Cursor

No cursor yet.

# Open threads

No open threads yet.
```

An empty `MEMORY.md` looks like this:

```md
# Memory
```

### Plan `.md` interior

A plan `.md` file covers one sub-area. Its shape depends on where it sits in the lifecycle (**The lifecycle of a plan**, section 1): in flight it is a working surface and this structure is a loose frame, not a rigid form; finalized it is a specification held to the reimplementable standard below. The frame it keeps throughout:

1. **Scope** — what this plan covers and what it explicitly does not.
2. **What exists** — what is already built that is relevant.
3. **What is missing** — the gap to fill, stated as a gap: it names what is absent without prescribing the solution before it is decided.
4. **Steps** — same status markers as the README; may be `TBD` until the solution direction is decided.
5. **Open threads** — sub-area-specific agent-resolvable unknowns (same register as the README's; a thread needing the user is promoted to `QUESTIONS.md`, section 7).
6. A reference back to the node README at the top.

This frame is the in-flight register; as the work finalizes it distills toward the spec. A `What is missing` shrinks to nothing, `Steps` all close, and the plan's behavioral content concentrates into the standard the lifecycle defines: **the finished plan specifies the behavior, it does not catalog the code.** The reimplementable contract (invariants, operation ordering, error/edge-case behavior, concurrency and limit semantics) lives in the plan; the volatile realization does not, and coverage ties the spec to the files that realize it. Behavior belongs in the plan; `MEMORY.md` holds only the mistake-preventing _why_. See section 1 for the full statement of this standard and the catalog failure mode.

A corollary of "does not catalog the code": **a plan never inventories its own files.** The spec→file map has a single home — `coverage.json`, script-maintained and freshness-tracked (section 4) — so a hand-written list of the files a plan covers duplicates a generated artifact and drifts the moment coverage changes. The distinction is behavior vs. inventory: a plan _may_ name a file when the file is load-bearing in a **behavioral fact** ("this seam type lives in one shared file so a shape change flags every consumer through coverage" is a contract), but it never carries a bare roster of the files it touches. That roster is what coverage is _for_. (This seam type is the legitimately-shared file from **Build each concern as a self-contained module** in section 1: code lifted out because many concerns genuinely depend on it, so a change to it correctly flags them all.)

### MEMORY.md

A node's `MEMORY.md` is its memory: a curated set of landmine warnings for future agents — the things that must be remembered to avoid a future mistake. The name is deliberate. It is **not** a changelog: it does not log changes, and despite the dated-entry format it is not a chronological history. It is also not a record of every reasoned decision. It holds only what a future agent must remember to keep from getting something wrong.

**The bar is consequence, not interest.** An entry earns its place only if **a future agent who did not know it would get something wrong.** Concretely, its absence would lead someone to: re-introduce a behavior that was deliberately removed, "fix" something that is the way it is on purpose, retry an approach that was already ruled out, or violate a constraint that is invisible in the code. If nothing breaks from not knowing it, it does not belong — **however true, non-obvious, or hard-won it is.** "Is this a real reason behind a design decision?" is the wrong question; almost every decision has one. The right question is: _what does a future agent do wrong without this?_ If the answer is "nothing," there is no entry.

The canonical good entry is a hidden operational constraint: a provider API that punishes a request faster than 1 every 3 seconds with a 60-second lockout, so the client's throttling looks over-cautious but must not be "optimized." An agent who didn't know that would break production. That is the shape every entry should have — a specific wrong action it heads off.

**Every entry explains the CURRENT design**, for a reader who sees only today's code and knows nothing of how it got there. It states why the system _is the way it is_ — "it is like this because X" — never the history of how it changed ("it used to be Y", "we switched from A to B", "restructured into C"). A reversal is recorded only for the live constraint it leaves behind ("tried X, it failed because Y, so it is Z now"), where the value is the surviving constraint Y — itself only worth recording if Y would trip a future agent up again.

**Belongs in it:** a hidden operational constraint that the code obeys but does not explain; an approach that was tried and ruled out for a non-obvious reason a future agent would otherwise re-attempt; a deliberate-looking-wrong choice that someone would be tempted to "correct." In every case there is a concrete future mistake the entry prevents, and the entry is still relevant to the implementation as it stands today.

**Does not belong:** steps completed as planned (the step list tracks them); attempts that failed for obvious reasons; experiments and test runs that revealed no durable constraint; anything derivable from the current plan or code; a non-obvious reason that endangers nothing if forgotten; and — the most common false positive — **decisions about the plan tree's own shape: where a node sits, why it was split or collapsed, how the docs are organized.** These are invisible to the code and irrelevant to a reader who only ever sees the current tree, so they prevent no code mistake and are not entries. (This subsumes the narrower "no reorganization narration" rule: not only is _narrating_ the reshape excluded, the structural rationale itself is.)

Entry format — one short paragraph maximum:

```markdown
## YYYY-MM-DD — Short title

The constraint or fact, as it stands today. **Why:** the non-obvious reason. **Mistake it prevents:** the wrong thing a future agent would do without this.
```

### Step status markers

```
[ ] not started
[~] in progress
[x] done
[!] blocked — one-line note on what is blocking it; when the blocker is a user decision, the note points at the question channel (`awaiting answer in QUESTIONS.md`, section 7)
[+] future improvement — optional extra, out of planned scope; a plan whose only open items are [+] is still done
```

---

## 4. Keeping everything in sync

How the system ensures the plan files and the code they cover are in sync: see **[SYNC.md](SYNC.md)**.

How work moves through git — branches off `main`, the merge-commit guarantee that keeps coverage stamps valid across a merge, and the partition rule for concurrent tasks: see **[GIT_WORKFLOW.md](GIT_WORKFLOW.md)**.

How several child branches under one concern come back together — why the roll-up makes the parent's plan files a shared-state hotspot, why union is the default resolution, and how the merge agent runs the pass: see **[MERGE.md](MERGE.md)**.

---

## 5. Intake: placing an unplaced request

Intake is the everyday door for new work. A request arrives — a feature or a bug, stated without saying which node it belongs to (_"add an unlock screen with a biometric fallback"_, _"fix the bug in cancelling a vault export"_) — and intake finds where in the tree it belongs and inserts it there as a **framed** node (Approach `TBD`, next move is research), so ordinary plan work can take over from there. The point is that someone who knows nothing of the tree — a non-technical colleague, eventually a user — can hand over a request and have it land correctly, without carving the node by hand.

The agent-facing procedure lives in **[INTAKE.md](INTAKE.md)**, loaded when there is a request to place. The rest of this section is the design behind it.

The job intake does is **placement followed by framing**. A request names a concern but not its slot; intake resolves the slot, then writes the node empty-but-framed so ordinary work can pick it up cold.

- **Placement finds the place(s) the request belongs — a set, usually of one.** A request maps to the **lowest existing node whose concern contains it**, and where it is cross-cutting it maps to **several** such nodes at once, because its parts are distinct concerns the tree already holds in different subtrees. This is not a single-parent rule with a split exception; placement resolves a _set_ of places, and that set commonly has one element. It is a concern judgement, read off the tree's What & why rather than its cursors (a request can belong under a node nobody is currently working, so the cursor path is irrelevant). A coverage search (`find_plans`, the read-only intake aid in `context/_scripts/`) and a grep over plan prose narrow the candidates so placement is not a blind walk from the root; the procedure for combining them is INTAKE.md's.
- **Framing is the existing new-node move, done once per place.** At each place the request (or its part) becomes a new child in the **Framed** state — the same node interior every new node starts from (section 3): What & why stated, Approach `TBD`, the no-bare-steps rule, the node's **Plans** index and **Cursor** updated. A split request yields several framed nodes that cross-link each other (`[[name]]`) so the shared origin survives the tree holding them apart. Intake adds no new node mechanics; its whole contribution is deciding _where_, then handing off to the ordinary framing the system already documents.
- **The form the request takes is normally a new child plan.** A request usually does not belong _inside_ an existing plan `.md` — it is a distinct concern, so it becomes its own framed child of the parent. It is folded into an existing in-flight plan `.md` only when it is plainly a continuation of work that plan already scopes, and it triggers a promotion (an existing `.md` grows into a folder to host it) only when the request itself is large enough to need decomposing. New framed child is the default; the other two are the exceptions, taken only on a clear signal.
- **Placement is a judgement call, so the agent confirms only when the call is unclear.** A request whose place(s) are obvious — one clear home, or a clean split where each part has one — is placed and reported; one that is ambiguous (fits several nodes equally, could sit at more than one altitude, the split itself is unclear, or is too vague to place) is surfaced to the user through the question channel (section 7) first. Because an unplaceable request has no node yet, its question goes in the root plan folder's `QUESTIONS.md` (section 7). This mirrors every other reshaping move in the system (restructuring during a reconcile, splitting a plan): a clear mechanical placement is the agent's to make, a real decision is the user's to confirm.
- **A request too vague to place is clarified, not guessed.** Intake is meant to take requests from non-technical colleagues and eventually users, so an underspecified request is expected. When a request cannot be placed because the concern itself is unclear, intake asks one focused question to pin down what is being asked, then places it — it never carves a node off a guess.

Starting a brand-new node when you _already_ know its slot needs none of this — it is just the ordinary framed-node move (section 3, and "Starting a new plan" in INSTRUCTIONS.md). Intake is for when the placement itself is the work.

---

## 6. Working a node (authoring conventions)

### Testing artifacts

Where test scripts and the pre-implementation sanity-test sit in a plan's flow, and what each exercises, is the in-flight arc (section 1); this section governs only how their artifacts are handled. Both are throwaway and **not** recorded in the plan. The exceptions:

- If a test script (or the pre-implementation sanity-test) reveals a non-obvious constraint or changes a decision, record that in `MEMORY.md` (not the script itself), and feed the correction back into the Approach.
- If a script is kept for reuse, note its name and purpose in the relevant plan's **Scope** section or under the relevant step.

Per-area testing tooling: each code area gets a `TEST_SCRIPTS.md` under the root plan's `_docs/` (`context/plans/app/_docs/<area>/TEST_SCRIPTS.md`), written when that area's tooling is first established.

### Session handoff protocol

**Start of a session on a node:**

1. Do not read all files upfront.
2. Read the node `README.md` first — the **Cursor** and the step list. If resuming cold from a higher node, follow the cursor path down (section 1) to the active plan.
3. Check the active plan's folder root for a `DRIFT.md` (written by the post-commit hook, section 4). Its presence means there is drift — read it and reconcile the findings per **Resolving drift** ([SYNC.md](SYNC.md)) before continuing; if absent, the root is in sync.
4. If the active step is `[!]` blocked on a question, read the plan group's `QUESTIONS.md` (section 7): act on any answered question and remove it; if the blocking question is still unanswered, the node is closed for work — do not start it.
5. Read the child plans relevant to the current step.
6. Read `MEMORY.md` for non-obvious constraints before starting work.

**End of a session:**

1. Update step statuses in the node README and the relevant plan `.md`.
2. Update the **Cursor** section. If a step marker changed, propagate to the parent in the same session (section 1).
3. Resolve any answered open threads; move the reasoning to `MEMORY.md` only if a future agent would otherwise get something wrong (the memory bar, section 3).
4. Add a `MEMORY.md` entry only if its absence would make a future agent do something wrong — the consequence bar in section 3. Not for completed steps, and never for plan-tree placement or doc organization.

---

## 7. The question channel: blocking on a user decision

Across the system the agent reaches **crossroads it cannot resolve alone** — points where continuing means making a decision that is the user's to make, not a mechanical move the agent owns. Reshaping the tree (splitting a plan, collapsing a folder), placing an ambiguous intake request, resolving a non-obvious drift, choosing between solution directions that genuinely diverge, and **the major design forks a large concern exposes the moment it is framed** (scope assessment, section 1): every one of these is a place the rest of this document says "confirm with the user." That last case is worth calling out because it is not triggered by ambiguity or a reshape — a large concern with a perfectly obvious placement still surfaces its design crossroads here, because carving it deep means committing decisions the user should make. This section defines **what that confirmation physically is**, so it works whether or not a user is sitting at the keyboard.

The naive reading of "confirm with the user" is "ask them live." But that forces a bad choice: either a human must be present at the moment the agent hits the crossroad, or the agent is handed a blank check to decide structural questions on its own. The question channel is the third path — the agent **parks the decision in a file and stops**, the user answers whenever they return, and a later agent picks the work back up from the answer. It makes every confirm-gate **asynchronous** without making it unsafe.

This is a **hard rule, not a preference: a plan question is never put to the user directly — it is always raised in `QUESTIONS.md`.** Every "confirm," "surface to the user," "ask," or "resolve with the user" across these docs resolves to _write it in the file and stop_, even when the user is sitting right there. The reason is the system's founding constraint — a cold agent must be able to reconstruct the entire state from the tree alone. A question asked and answered in live conversation leaves no trace in the tree: the next agent cannot see it was asked, cannot see the answer, and the plan silently rests on a decision recorded nowhere. Routing every plan question through the file keeps the tree the single source of truth. The only things that legitimately stay live are **not plan questions**: open-ended brainstorming of a `TBD` Approach (a collaborative activity, not a discrete gate — section 1), friction with the system itself (improving the tooling/docs, not deciding the work — see **The system is still being hardened**), and the bootstrap case of standing up the very first tree before any `QUESTIONS.md` exists.

**Raising a design fork is not proposing a solution.** When a large concern surfaces its crossroads here, the agent asks _which direction_, it does not pick one — and that line matters, because the framing rule still holds: an agent does not propose a solution unless the user asks for it (section 1, the **Framed** state). A design-fork question states the crossroad and its plausible directions neutrally ("How should chat history persist — server-side per user, client-only, or not at all?") and stops. It does **not** commit to an answer ("I'll store history in Postgres keyed by user with a 30-day TTL"), which is solutioning the agent was not asked to do. The question opens the decision for the user; it does not foreclose it. This is what lets a large concern generate rich questions on first contact without ever crossing into designing the solution unbidden — surfacing the forks _is_ framing, choosing among them is not.

### `QUESTIONS.md` — the async whiteboard

A blocking question lives in a `QUESTIONS.md` file that sits **alongside the plan `.md` files**, the same placement as `coverage.json` (section 4). It is the communication channel between the agent and the user:

- **Agent → user:** the agent writes the question into `QUESTIONS.md`.
- **User → agent:** the user writes the answer in place, in the same file, on their own time.
- **Agent → channel:** a later agent reads the answer back and acts on it.

It is an **ephemeral whiteboard, not a log.** It holds only the questions live _right now_, and only while they are open. It is never a transcript: resolved questions are removed, answered-then-acted-on Q&A is **not** archived in it. Anything worth keeping after a question resolves goes where the system already keeps such things — the durable **what** into the plan's Approach, the mistake-preventing **why** into `MEMORY.md` (the memory bar, section 3). `QUESTIONS.md`'s only job is to **unblock the plan**; its presence means work here is blocked on the user, and its absence means nothing is.

It can hold **several questions at once** — it covers all the plan `.md` files beside it, so different plans (or several crossroads in one) accumulate as separate questions. The user may answer **only some** of them at a time; that is expected. Resolution is therefore **per question, not per file**: an agent removes each question as it is acted on, leaving the unanswered ones in place, and **deletes the file once it is empty.**

The format is plain Markdown with an explicit answer slot per question, so the user writes freely and the agent's read of "answered yet?" is just "is the slot filled":

```markdown
# Open questions

## Should `unlock/` split into separate passphrase and biometrics plans?

They have grown independent and share no state. Continuing means committing to one shape.

- **A:** split into two plan `.md` files under a new `unlock/` folder
- **B:** keep as one plan `.md`

**Answer:**

## Does the "lock on idle" request belong under `vault/` or its own settings concern?

**Answer:** Under `vault/` — it's a lifecycle rule of the vault, not a setting.
```

An empty `**Answer:**` is an open question; prose under it is an answered one. A half-written answer reads as still-open, which is the safe failure — the agent waits rather than acting on a partial thought.

### The block lifecycle

1. **Agent hits a crossroad it cannot resolve alone.** It writes the question(s) into the plan group's `QUESTIONS.md`, sets the blocked step to `[!]` with a note pointing at the file (`[!] blocked — awaiting answer in QUESTIONS.md`), propagates that marker up the cursor path (section 1, the same `[!]` propagation as any blocked step), and **stops that line of work.** It does not guess and proceed.
2. **The user answers** in `QUESTIONS.md`, in place, when they return. They touch nothing else — not the marker, not the cursor, not the plans. Writing answers is the only thing the user does in this channel.
3. **A later agent picks the work back up.** Following the cursor path it lands on the `[!]` step, which sends it to `QUESTIONS.md`. Then, per question:
    - **Answered** → it acts on the answer, removes that question from `QUESTIONS.md`, and — if this unblocks the step — flips `[!]` back to `[~]`, propagates, and continues. If the answer resolves one fork but opens the next (path A chosen, now A1 vs A2), it replaces the resolved question with the new one and the step stays `[!]`.
    - **Unanswered** → it **rejects the work.** It does not start, does not improvise a decision, does not route around the gate to a different part of the node. It reports that the plan hinges on an unanswered question — see `QUESTIONS.md` — and stops. An `[!]` question-block means the node is closed for work until the user answers.

This hard stop is what makes "block" safe: without it, a later agent could quietly make the very structural decision the block existed to reserve for the user.

### Where the question lives when there is no node yet

A blocking question normally attaches to an existing plan group, so it lives in that group's `QUESTIONS.md`. **Intake** has one case where there is no such node: the request cannot be placed because _deciding where it goes is itself the question_, or it is too vague to place at all. That question has nowhere local to attach, so it goes in the **root plan folder's `QUESTIONS.md`** (e.g. `context/plans/app/QUESTIONS.md`) — the one node guaranteed to exist regardless of where the request lands. This is not a global aggregate of every node's questions (the system never flattens state upward, section 1); it is specifically the holding area for **pre-placement** questions about concerns not yet in the tree. The rule: if the concern the question is about already has a home, the question lives there; if it does not, it lives at the root.

### Open threads vs. `QUESTIONS.md`

The README's **Open threads** section (section 3) and `QUESTIONS.md` both hold open questions, so the line between them must be sharp:

|                    | **Open threads** (README section)                        | **`QUESTIONS.md`** (the file)        |
| ------------------ | -------------------------------------------------------- | ------------------------------------ |
| Resolved by        | the **agent**, through work                              | the **user**, by answering           |
| What unblocks it   | research, implementation, something a later step reveals | a decision only the user can make    |
| Effect on the node | none — work continues (`[~]`)                            | **hard-blocks** the node (`[!]`)     |
| Written as         | a note-to-self, no addressee                             | a question to a person, with options |

The single test: **can an agent resolve this alone?** Yes → it is an Open thread, and the node keeps moving. No → it is a `QUESTIONS.md` question, and the node blocks. The one crossing between them is **promotion**: an Open thread the agent discovers it cannot settle without the user moves into `QUESTIONS.md` and the step flips to `[!]`. There is no reverse move — a user question never demotes to a thread.

---
