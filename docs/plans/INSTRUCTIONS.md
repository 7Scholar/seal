# Working a plan

This is your operating manual for the planning system under `context/plans/`. It tells you how the plans are organized, how to find where work stands, and what to do in every situation you can land in. Read it once, then act from it.

## What a plan is

Work is organized into **plans**, arranged as a tree. Each plan is a **concern** — one thing being built or solved. A plan decomposes into smaller child plans, which decompose further, down to the ones that describe actual code.

A plan takes one of two forms:

- a **plan folder** — a directory whose entry point is its `README.md`. Use it for a concern big enough to decompose into children.
- a **plan `.md` file** (e.g. `storage.md`) — a single file that is its own entry point. Use it for a small sub-area that needs no further decomposition.

A plan folder holds:

- **`README.md`** — what the plan is, how it stands, what its children are. Always present; it is the folder's entry point.
- **`MEMORY.md`** — the node's memory: a short, curated set of landmine warnings holding only the things a future agent would get wrong if it didn't know them. It is **not** a changelog — it does not log changes, it records what must be remembered. Always present.
- **child plans** — each a plan folder or a plan `.md` file.
- **`coverage.json`** — present whenever the folder contains plan `.md` files; it sits alongside them and records which code files those plans describe. That co-location is the only rule for where it appears. You touch it only through the scripts below, never by hand.

```
context/plans/app/
  README.md
  MEMORY.md
  vault/                  plan folder
    README.md
    MEMORY.md
    unlock/               plan folder
      README.md
      MEMORY.md
      keychain.md         plan .md file — describes real code
      coverage.json       sits alongside keychain.md
```

### What's inside a README

A plan's `README.md` has these sections, and keeps them as the plan evolves:

1. **Intent** — _what & why_ (what the concern is, its boundary, what "done" means) and _approach_ (the solution: inputs, outputs, key mechanisms). Approach starts as `TBD` on a fresh plan and fills in as the solution emerges. A `TBD` approach means the plan has been scoped but not yet solved — the next move there is research or design, not building.
2. **Plans** — the list of this plan's children, each a step with a status marker. Every step _is_ a child plan; there are no steps that don't map to a child.
3. **Cursor** — a short, hand-written note of where this plan stands and what's next.
4. **Open threads** — agent-resolvable unknowns that shape the work: a thing to research, a decision the work itself will settle, something a later step will reveal. They never block — the node keeps moving while they sit here, and you close each by doing the work. Write them as notes-to-self ("backoff tolerance unknown; test before step 3"), not as questions to a person. An item lives here only while open; once resolved it leaves, and its reasoning moves to `MEMORY.md` only if forgetting it would later cause a mistake (the memory bar). A thread you find you cannot settle without the **user** is promoted to a blocking question in `QUESTIONS.md` (see **Blocking on a user decision**).
5. **Supporting docs** (optional, usually absent) — pointers into the plan's `_docs/` folder: freeform reference material an agent must follow (UI conventions, coding standards, testing rules, notes). Each pointer is a **trigger + link** — `When touching the UI, follow [ui.md](_docs/ui.md).` — so you read only what's relevant. A `_docs/` folder is **not a child plan**: the underscore marks it as a non-node, it never appears in the **Plans** index, and it is never covered as code. A supporting doc applies to its plan **and every plan beneath it** (see the session-start protocol below).

A plan `.md` file is looser — a working surface for whoever implements it. Keep a light frame: the concern it covers, what already exists, what's missing, its steps, and any open questions. Mid-implementation it's allowed to be messy.

**A plan states behavior; it never inventories its own files.** Which files realize the plan is coverage's job — `coverage.json` is the single, script-maintained home of the spec→file map (see the coverage step in **Ending a session**). So a plan never carries a list of the files it covers: that list is a hand-made copy of a generated artifact, and it goes stale the moment coverage changes. A plan _may_ name a specific file when the file is part of a **behavioral fact** — "the `SecretEntry` type lives in one shared file so a shape change flags every consumer through coverage" states a contract, not an inventory. The test is behavior vs. inventory: a fact a reimplementer must honor stays; a bare "this plan covers `a.ts`, `b.ts`" does not.

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

### The lifecycle of a plan: notepad → specification

A plan `.md` is not the same document at the start and the end of its life. It moves along one arc:

1. **Framed** — a feature or bug stated as a problem, Approach `TBD`. The next move is research, not building.
2. **Solutioned** — research and brainstorming shape the Approach into a solution direction, taking the rest of the plan into account, and lock in steps. **Design to production-ready, not minimum-viable:** the Approach you commit to before building should be the comprehensive design that reveals the concern's real structure, layers, and failure behavior — not the thinnest sketch that compiles. Designing fully here is the point: it surfaces the decomposition and the forks while they're still cheap to change, instead of mid-implementation when the shape is set. A solutioned plan that reads as a stub is under-designed — deepen the design (and, for a large concern, raise the forks that deepening exposes) before you start building. **The design's register tracks scope:** a **large** concern designs the _scope split_ and a scalable, robust shape, not the code; a **small** code-bottoming concern designs the _actual implementation_. Same bar, aimed at the concern's altitude.

    **Build each concern as a self-contained module.** Code that only one concern uses lives inside that concern's own files. Lift a piece out into a shared file **only when another concern actually depends on it** — sharing is forced by a real dependency, never the default. This keeps coverage clean for free: coverage is per-file, so a file its concern owns flags only that concern's plan when it changes, while a file holding several unrelated concerns flags every plan covering the others on any edit. A shared file is right only when its dependents **should** all re-review together (a shared seam type); otherwise keep the code local. You apply this on your own as you design, the same way you carve plans. (If you move already-covered code into a shared file, re-point coverage per [CODE_DRIFT.md](CODE_DRIFT.md).)

3. **In flight** — implementation begins; steps and Approach co-evolve as the work is tested and verified. This is where "messy" is allowed. A code-bottoming plan's in-flight steps follow a default arc, **flexed by scope**: **sanity-test the proposition** (a cheap, throwaway check of the chosen Approach against the real system _before_ implementing, to catch what would steer the design) → **implement** → **unit tests** → **test scripts** (exercise the real implementation — happy path, stress, edge cases, then deliberately try to break it; a distinct phase from unit tests, following the plan's per-area test-scripts supporting doc — see **Testing**, below). It's a recommended shape, not a rigid checklist — steps still map 1:1 to the concern, and you may collapse or reorder where the work calls for it. The sanity-test and the test-script phases are named because they're the two most often skipped. **A bug fix follows a different arc, and its first phase is not optional: reproduce → diagnose → fix → confirm the reproduction is gone.** Reproduce _before_ you fix — a concrete, re-runnable demonstration of the wrong behavior against the real system (a failing test, script, or driven scenario). Without it there is no way to know your change fixed anything: a fix on an unreproduced bug is unfalsifiable — it may have changed nothing, or masked the symptom while leaving the cause. The same reproduction, re-run after the fix and now passing, is the proof. Never jump straight to a plausible-looking fix; if a bug resists reproduction, narrowing it until it fails on demand _is_ the work (or raise the blocker) — don't fix what you couldn't first make fail.
4. **Finalized** — implementation is done, and the Approach now **defines exactly what was built**.

**Writing the code is the small part — usually one step.** The weight of a plan is in the work around it: framing, design and research to a production-ready bar, and the verification after (sanity-test, unit tests, test scripts). Treating the plan as a wrapper around the coding and rushing to implement is the common failure — a plan that is mostly an implementation step is almost always under-designed and under-tested. The hard parts are the thinking before the code and the breaking-it after, not the typing in between.

**A request with many parts is many tasks, and each is done to full depth or not started.** This is the failure the plan tree exists to prevent and the one it is easiest to commit anyway: a request arrives naming five things, the agent races to have all five *present*, and every one lands at the shallowest depth that can be called done. The result passes its tests, satisfies its journeys, and is visibly amateur — because breadth was bought with depth at every step.

The tree already makes this unnecessary. Plans persist, cursors record where work stopped, and another agent picks up exactly where the last one left off — so **there is no reward for reaching the end of a request in one session, and a large cost to arriving there thin.** Prefer finishing one part completely and leaving the rest clearly framed for the next session over touching everything. A cursor saying *"the grid is complete to production depth; the file surface is framed and untouched"* is a better outcome than five surfaces that each need redoing, and it is the outcome this system is built for.

Concretely, when a request contains several parts:

- **Work them one at a time**, each carried to the bar its own plan sets, before starting the next.
- **Judge each part on its own merits**, not on whether the overall request is progressing. "Good enough so I can get to the next thing" is the specific thought to distrust.
- **Say plainly what you did not do.** An unstarted part reported as unstarted is a working plan system; an unstarted part quietly implemented at 20% is drift that looks like completion.
- **Time or context pressure changes what you finish, never how well you finish it.** Cut scope by dropping whole parts, never by thinning every part.

For anything with a user-facing surface, "full depth" has a specific meaning that is easy to under-read: every state that surface can occupy is designed and built, not just the one where everything is present and working. The enumeration lives in [docs/UX_RESEARCH.md](../UX_RESEARCH.md) — empty, one, populated, excessive, loading, error, degraded, unavailable — and the empty state in particular is both the first thing a new user sees and the one most often reduced to a heading and a button in a visual language the rest of the product does not use.

The end of that arc is the point of the whole system: **a finished plan is the documentation.** Its Approach must be a complete enough specification that a developer or agent could **reimplement the concern from the Approach alone**, without reading the code. The code is _one valid realization_ of the spec, not the thing the plan is about. So a done plan is verified two ways: hand someone only its Approach and they could rebuild the behavior; hand someone the conversation-free plan tree and they know exactly where everything stands.

This cuts both ways at intake. You can **start a plan from a blank problem** (enter at step 1 and evolve it), or **drop in a complete plan** for already-built work (enter at step 4 directly). Either way the finished state is identical: a reimplementable spec.

**Specify behavior, do not catalog code.** The single most common failure — especially when a plan is written for finished code — is to write a _catalog_: "here are the files, here's roughly what each does," with one-line glosses that point at the code instead of stating its behavior. That is navigation, not documentation; a reader cannot rebuild from it. A finished plan's Approach must state the **contract the code satisfies**: the invariants it holds, the ordering of operations, the error/edge-case behavior, the concurrency and limit semantics — the durable behavioral layer, at a level a reimplementer needs. It does **not** transcribe the volatile layer (exact syntax, line-by-line logic); coverage ties the spec to the files that realize it. Stating the contract once, in the plan that owns it, is not duplication of the code — it is the plan's whole job.

This is also why behavior never belongs in `MEMORY.md`. `MEMORY.md` holds the **why** (mistake-preventing constraints); the Approach holds the **what** (the behavioral spec). If the load-bearing behavior is only findable in `MEMORY.md`, the Approach is hollow.

### Status markers

```
[ ] not started
[~] in progress
[x] done
[!] blocked — one-line note on what is blocking it; if a user decision is the blocker, the note points at the question channel (`awaiting answer in QUESTIONS.md`, see **Blocking on a user decision**)
[+] future improvement — optional extra, out of planned scope; a plan whose only open items are [+] is still done
```

### The cursor: how to find where work stands

There is no master status file. Each plan's **Cursor** section records only where _that_ plan stands — and a parent's cursor points down into whichever children are in progress, naming them and their status, without repeating their internal detail.

So to find the live work, **start at the top README and follow the cursor down**: it names the in-progress child, you open that child (its `README.md` if a folder, the file itself if a plan `.md`), its cursor names the next in-progress child, and so on until you reach the plan (or plans) whose cursor holds the actual next action. Several children can be active at once, in which case the path fans out — follow each.

This is how you resume cold with no prior context: walk the cursor path to the active plan, and its cursor tells you exactly what to do next.

## Before you start

If a `DRIFT.md` sits at the active plan's folder root, its code and docs are out of sync — reconcile it before anything else, see [CODE_DRIFT.md](CODE_DRIFT.md). You don't start new work on top of unreconciled drift.

## Starting a new plan

This is for a concern that has no plan yet and no existing code to bring in. (Reshaping a plan that already exists is **Splitting or merging**, below.)

**Gauge the scope first.** Before carving anything, judge how big the concern actually is — this one call drives the form you reach for, how many questions you raise, and how ambitious the design must be. Scope is a spectrum between two ends:

- **Small** — _"add a dialog for deleting a row."_ One self-contained sub-area that bottoms out in code. Frame **and** solution it in one pass, in a single plan `.md`, raising a question only if a real fork appears. No ceremony — just do the work.
- **Large** — _"create an AI chat."_ A sprawling concern that will run several plan folders deep (history, streaming, model selection, storage, auth, UI). **You are not expected to carve that whole structure in one pass** — the recursion exists so successive agents build it up over time. You _are_ expected to **recognize the scale**: frame it as a plan folder, and raise the major design crossroads you can see as blocking questions in `QUESTIONS.md` (**Blocking on a user decision**) rather than silently committing the design to a guess. A large concern raises design-fork questions the moment it lands, **even when its placement was never in doubt.**

Most concerns fall between these ends; slide your effort to match. The costly failure is **under-carving a large concern** — a thin node hides the structure and the forks, and a later agent inherits a shape that committed to decisions nobody made. Over-ceremonializing a small one only wastes motion. When unsure, lean toward treating it as larger: name the structure, raise the forks.

**Size a folder's children the moment you first name them, not once one grows too big.** A candidate child with its own independent state, its own design history, or its own reason to need a cursor gets its own plan `.md` immediately — don't bundle several such candidates into one child `.md` "for now." Plans overwhelmingly grow and rarely shrink, so the two mistakes aren't symmetric: a `.md` framed too finely costs almost nothing (an under-used sibling folds back in easily — **Splitting or merging**, below), while one framed too broadly costs real rework once its design decisions for what should have been separate children are already entangled in one document.

**A missing node is not a missing owner.** A concern can have a real owner — some existing plan whose Approach already states the design or contract it follows — without any plan yet holding its coverage. A file that mirrors another layer's shape (a frontend type mirroring a backend record, a generated client mirroring a schema) is owned by whichever plan states the contract it mirrors, even before anything covers its files. Fix a missing node like that by adding coverage under the plan that already owns the contract, as a sibling plan `.md` (e.g. a `frontend.md` beside a `backend.md`) — never by creating a new plan, which would fork a contract that already has a home. A concern with no owner anywhere — a cross-cutting registry, adapter, or dispatch mechanism with no governing contract elsewhere — does earn its own plan, the same as any other self-contained concern. A short recipe that only names a build order and points at the real contracts elsewhere is neither: it carries no coverage and specifies no behavior of its own, so it doesn't need a plan the way an implementation does. Two things that both currently lack an obvious home aren't automatically the same kind of gap — place each by what it actually is, and when a pass turns up more than one gap of the same kind, give them one consistent home rather than deciding each in isolation.

**Frame the problem, don't solve it.** A new plan's job is to structure the problem space so you and the user can reason about it freely — not to commit to a solution. State what's missing or broken and why it matters, map what already exists, surface the open questions, break the work into steps. Then stop: leave **Approach** at `TBD`. The solution direction is itself part of the plan, filled in later by researching or brainstorming with the user. **Do not propose a solution unless the user explicitly asks for one.** A fresh plan's first step is therefore typically `[ ] Research solution directions`. (Raising a large concern's design forks is _not_ a violation of this — asking "how should history persist?" frames the decision; answering it ("I'll use Postgres + SSE") solutions it, and that you still don't do unasked. See **Blocking on a user decision**.)

**Choose the form by scope.** A small concern is a single plan `.md` file — the lighter surface, which promotes to a folder later if it outgrows one cursor (**Splitting or merging**, below). A large concern is a plan folder up front, since you already know it decomposes into children worth tracking separately. Reach for a folder when the scope (or the user) calls for it; otherwise the `.md` is the default.

**Creating a new child** under an existing parent:

1. Add the child to the parent's **Plans** index as a step with a `[ ]` marker, under the no-bare-steps rule — every step is a child plan.
2. Create the child: a plan `.md` file, or a plan folder with its `README.md` and `MEMORY.md`. For the README's sections, see **What's inside a README**; for a plan `.md`, the light frame above.
3. Point the parent's **Cursor** at the new child if it's where work goes next.

**Creating a new root plan** (a brand-new top-level concern, e.g. `context/plans/app/`): make the folder with its `README.md` and `MEMORY.md`, framed as above. A root is always a folder — it's the entry point for everything beneath it. This stands up a new tree, so **confirm the concern and its boundary with the user** before creating it — and since there is no node to attach a question to yet, that confirmation goes in the existing root's `QUESTIONS.md` if one exists, or is a live decision if you are standing up the very first tree (**Blocking on a user decision**).

## Intake: placing an unplaced request

**Starting a new plan** above assumes you already know where the new plan goes. When you don't — the user hands you a raw request stated without saying which node it belongs to (_"add feature X to component Y"_, _"fix the bug in Z"_) — that is **intake**: find the request's slot in the tree and frame it there. Follow [INTAKE.md](INTAKE.md) for the procedure.

## Working a plan

**Starting a session on a plan:**

1. Don't read everything up front.
2. Read the plan's `README.md` — its **Cursor** and step list. If you're resuming cold from higher up, follow the cursor path down to the active plan first.
3. As you descend that path, collect each node's **Supporting docs** pointers (if any) — the active plan's and every ancestor's, since a supporting doc applies to its node and everything beneath it. Read the ones whose trigger matches the work you're about to do; skip the rest. This rides the cursor descent you're already doing — no separate walk.
4. Check the active plan's folder root for a `DRIFT.md`. If it's there, reconcile it ([CODE_DRIFT.md](CODE_DRIFT.md)) before continuing. If it's absent, the code and docs are in sync.
5. If the active step is `[!]` blocked on a question, read the plan group's `QUESTIONS.md` (see **Blocking on a user decision**): act on any answered question and remove it; if the blocking question is still unanswered, **reject the work** — the node is closed until the user answers. Do not start it or route around it.
6. Read the child plans relevant to the current step, and skim `MEMORY.md` for non-obvious constraints before you start.

**Flag friction with the system itself.** This system is new and still being hardened, so you will hit rough edges — and they matter most now, while early friction can still shape it. Don't quietly work around them: stop, name the friction to the user, and fix the underlying system (the script, the instruction, the convention) with them rather than patching around it this once. This covers:

- **Doc/code inconsistencies.** When the plan's docs and the actual code disagree, don't work past it. If it's clear which side is right, fix it: usually the code moved ahead and the docs lag, so realign the docs; occasionally the code regressed against the intended behavior, so fix the code. If it's ambiguous, don't guess — verify (read wider, check the code's behavior, or ask) before changing either side. This is the in-session counterpart to the formal `DRIFT.md` flow ([CODE_DRIFT.md](CODE_DRIFT.md)).
- **Implementation-exposed design forks.** When real code reveals that the plan's design cannot be applied without choosing a model, migration path, persistence boundary, consumer contract, or compatibility strategy, stop treating it as an implementation detail. If the choice is genuinely design-shaped, raise it in `QUESTIONS.md` and block that line of work even when you can imagine a plausible workaround that would let the code keep moving. A local workaround silently answers the design question; the question channel exists to prevent that.
- **Misbehaving tooling** — a script that fails on the first try, an error that doesn't print the fix it promises, a command needing an undocumented incantation. These are system bugs, not yours to absorb.
- **Unclear or contradictory instructions** — when this doc or [README.md](README.md) doesn't fit the situation, or two rules conflict, raise it instead of silently picking one.
- **Structure that fights the work** — a plan shape, naming rule, or convention that consistently creates friction is a signal the system needs adjusting.

**Existing code is a reference, not a template.** Work may point at existing code — an earlier implementation, an adjacent module, a reference project — to learn from. Treat it like code from another capable developer: assume **both** that it has flaws (it's rarely the best version of itself) **and** that it was written that way for a reason you may not see yet. Hold both — drop the first and you copy flaws forward; drop the second and you rewrite away a constraint you didn't understand. So:

- **Normal-looking code** — copy it, modifying where the new context needs it. Its choices are legible; the reasonable-author assumption holds.
- **Strange or complex-looking code** — don't decide on a glance. It's either poorly written (**rewrite** it — don't drag the mess into the new code) or subtly right for a non-obvious reason (**copy and modify** — the strangeness is load-bearing). Investigate until you know which; the two cases call for opposite actions. A non-obvious constraint you uncover this way, which a later agent would "optimize" back out, is a `MEMORY.md` entry (the memory bar, **Ending a session** step 4).
- **Always** — leave it better. Take the improvement the reuse makes available; never copy a flaw forward just because the source had it. A design that launders an old flaw into the codebase isn't production-ready, however faithfully it copies — this is the production-ready bar (the **Solutioned** state) turned toward reused code.

**Ending a session:**

1. Update the step markers in the README and any plan `.md` you worked.
2. Update the **Cursor**. If a step marker changed, update the parent's marker and cursor for this child in the same session — and keep walking up only as far as the change is still visible. Stop at the first parent whose own status doesn't change.
3. Clear any open thread you resolved; move its reasoning to `MEMORY.md` only if forgetting it would later cause a mistake (the memory bar). If you hit a crossroad only the user can settle, write it to `QUESTIONS.md` and set the step `[!]` (see **Blocking on a user decision**) rather than guessing.
4. Add a `MEMORY.md` entry only if its absence would make a future agent **do something wrong** — re-introduce a deliberately-removed behavior, "fix" something that is the way it is on purpose, retry an approach already ruled out, or violate a constraint invisible in the code. Apply the test before writing: _what does a future agent get wrong without this?_ If the answer is "nothing," there is no entry — being true and non-obvious is not enough. Not for completed steps; never for where a node sits or how the docs are organized (invisible to the code, so it prevents no mistake). Every entry explains the **current** design ("it is like this because X"), never narrates a change ("it used to be Y", "restructured into Z"). One short paragraph:

    ```markdown
    ## YYYY-MM-DD — Short title

    The constraint or fact, as it stands today. **Why:** the non-obvious reason. **Mistake it prevents:** the wrong thing a future agent would do without this.
    ```

5. **Commit your code and prose first.** Coverage stamps files at `HEAD`, so it only operates on git-tracked files: `add_to_coverage` refuses any path that is new and unstaged. Stage and commit everything you changed this session (`git add` the new files, then commit) before the coverage step below — otherwise it blocks on the untracked files. This is the same commit the **Landing your work** flow expects to precede the coverage stamp.
6. Update coverage by recording which files the plan `.md` touched by running, from `context/_scripts/`:

    ```
    uv run add_to_coverage <plan.md> <path...>        cover these files under this plan (re-run after edits to re-sync them)
    uv run remove_from_coverage <plan.md> <path...>   drop these files from this plan
    ```

    `<plan.md>` and `<path...>` are repo-relative (or absolute) — they resolve the same from any directory, so passing `src/foo.ts` while running from `context/_scripts/` just works; you never prefix paths to climb back out. `<path...>` is one or more files or folders (a folder covers all its files). Coverage is written to the `coverage.json` that sits in the same folder as the `<plan.md>` argument; if that file does not exist, the script creates it there. Boundary checking is separate: the script finds the plan tree's nearest boundary root, usually the root plan folder such as `context/plans/app/boundary.json`, and only uses that boundary to decide whether the files are allowed. Do not look for or create `boundary.json` next to the leaf plan unless the tree has explicitly been split that way. That's the whole surface — you never run a detector or manage anything else by hand. If `add_to_coverage` refuses because a file is outside the plan's allowed area, the error prints the exact command to widen it; run that, then retry. If it still refuses a file as untracked or as having uncommitted changes, you skipped step 5 — the stamp records `HEAD`, so it always comes after the commit; stage and commit that file, then retry.

    **Sandboxed shells:** `uv run` first tries to initialize its cache at `~/.cache/uv`, which a sandboxed shell may not have write access to (`Failed to initialize cache ... Operation not permitted`). This is a sandbox restriction, not a coverage problem — re-run the same `uv run` command with the sandbox disabled for that call rather than debugging the script or the repo state.

    **Track your own working directory.** These commands are written as repo-relative so they work from anywhere, but a shell tool's cwd persists across calls in the same session (a `cd` you ran three steps ago is still in effect). Before running `add_to_coverage`/`remove_from_coverage` — or any repo-relative command — confirm cwd first if you've changed directories earlier in the session, instead of assuming you're back at the repo root.

**Testing.** The layers and their order are the in-flight arc above; this only adds their handling. The sanity-test and test scripts are **throwaway and not recorded in the plan** — if either reveals a non-obvious constraint or changes a decision, that goes in `MEMORY.md` and feeds back into the Approach. _How_ to write test scripts is per-area, in the plan's **Supporting docs**: each code area gets a test-scripts doc under the root plan's `_docs/` (`context/plans/app/_docs/`), written when that area's tooling is first established.

**Landing your work (git).** A task is worked on its own branch and committed locally. **You stop at the local commit — you never push and never open a PR.** The user pushes the branch and opens the pull request themselves; the whole remote side of landing is theirs.

**Start a task branch only when you are on `main` and are picking up a task.** Anywhere other than `main`, you are already mid-task: skip the branch step and continue on the branch you are on. Check with `git branch --show-current` if unsure.

1. **On `main`: branch off it before you start,** then stay on that branch and commit freely. Already on a task branch: continue on it.
2. **Keep to a plan subtree no other in-flight task is touching.** If two tasks ever overlap on a `coverage.json`, tell the user; don't hand-edit it.
3. **Stamp coverage as your final commit** — commit the code and prose first (**Ending a session** step 5), then run `add_to_coverage` (step 6) once everything is settled, and don't edit those files again afterward.
4. **Stop there and report that the branch is committed and ready.** Do **not** `git push` and do **not** run `gh pr create` — pushing and opening the PR are the user's to do, even if they are present and the work looks finished. If you think the branch is ready to land, say so; don't act on it.
5. **The user pushes, opens the PR, and merges — never you.** Don't push, open a PR, merge, squash, or rebase. If the user requests changes, keep working the branch locally and they handle the remote again.

**Blocking on a user decision.** Some crossroads are not yours to settle — splitting or collapsing a plan, placing an ambiguous request, picking between genuinely diverging solution directions, resolving a non-obvious drift, choosing a model/migration/persistence/compatibility strategy discovered during implementation, and **the major design forks a large concern exposes the moment you frame it** (**Gauge the scope first**). That last one is not triggered by ambiguity or a reshape: a large concern with a perfectly obvious placement _still_ surfaces its design crossroads here, because carving it deep means committing decisions the user should make. A question is still blocking when one option looks easy to implement or locally compatible; ease is not permission to answer it. When the docs tell you to "confirm with the user," do not wait for a live reply and do not decide it yourself. **Write the question into `QUESTIONS.md` and stop that line of work.** `QUESTIONS.md` is the async channel between you and the user; it sits alongside the plan `.md` files (like `coverage.json`) and holds only the questions live right now.

**Never put a plan question to the user directly — always raise it in `QUESTIONS.md`.** This is the hard rule the whole channel exists to enforce. Whenever the docs say "confirm," "surface to the user," "ask," or "resolve with the user," that means _write it into `QUESTIONS.md` and stop_ — never message the user a question to answer in conversation, even if they happen to be present. A question asked live leaves no durable record: the next agent resuming cold has no way to see it was ever asked or answered, and the plan silently depends on a decision that lives nowhere in the tree. The file is the only sanctioned way to ask a plan question. The few live interactions that remain are **not plan questions**, so the rule does not reach them: (1) **open-ended Approach brainstorming** — shaping a `TBD` solution with the user is a collaborative activity, not a discrete blockable question (and you still do not propose a solution unless the user asks — see **Frame the problem, don't solve it**); (2) **friction with the system itself** — a broken script or contradictory instruction is worked out live because it is about fixing the tooling, not deciding the work (see **Flag friction with the system itself**); (3) **standing up the very first tree**, when no `QUESTIONS.md` exists anywhere yet (see **Creating a new root plan**). Anything that is a genuine question about the work goes in the file.

Raising a design fork _is_ a question for the file, and **raising it is not the same as answering it.** When a large concern surfaces its crossroads, you state the fork and its plausible directions neutrally — "How should chat history persist: server-side per user, client-only, or not at all?" — and stop. You do not pick a direction ("I'll store it in Postgres keyed by user with a 30-day TTL"); that is solutioning you were not asked to do. The question opens the decision for the user; it must not foreclose it. This is exactly what lets a large concern produce rich questions on first contact without ever designing the solution unbidden — surfacing the forks is framing, choosing among them is not.

- **To raise a question:** write it into the plan group's `QUESTIONS.md` with an empty `**Answer:**` slot, set the blocked step to `[!]` with a note pointing there (`[!] blocked — awaiting answer in QUESTIONS.md`), propagate that marker up the cursor path like any blocked step, and stop. State the crossroad and the options plainly — the user (possibly non-technical) writes the answer in prose under the slot.
- **When there is no node yet** (an intake request you cannot place, because deciding where it goes _is_ the question): put it in the **root plan folder's `QUESTIONS.md`** (e.g. `context/plans/app/QUESTIONS.md`) — the one node guaranteed to exist. Otherwise the question lives beside the node it blocks.
- **On resuming a `[!]` question-block:** read `QUESTIONS.md`. Per question — **answered** → act on it, **remove that question** from the file (leaving any still-open ones), and if it unblocks the step flip `[!]`→`[~]` and propagate; if the answer opens the next fork, replace the resolved question with the new one and stay `[!]`. **Unanswered** → reject the work and report that the plan hinges on it. Delete `QUESTIONS.md` once it is empty.
- It is a **whiteboard, not a log**: resolved questions are removed, never archived. Durable value from a resolved question goes to the Approach (the **what**) or `MEMORY.md` (the **why**), never back into `QUESTIONS.md`.

The full design — the two surfaces, the lifecycle, Open threads vs. `QUESTIONS.md` — is **The question channel** in [README.md](README.md).

**Splitting or merging a plan.** When a plan `.md` grows past one working surface — enough independent state to warrant its own cursor — promote it to a child folder: lift its high-level intent into the new folder's README and drop the working detail into fresh plan `.md` files beneath it. When a folder's scope shrinks durably, fold it back into a single plan `.md`, rescuing its README intent and any `MEMORY.md` entries before deleting it. These reshape the tree, so **raise the move as a question in `QUESTIONS.md` and wait for the user** before applying it (the mechanism is **Blocking on a user decision** above; the coverage consequences are in [CODE_DRIFT.md](CODE_DRIFT.md)).

## Rules that hold everywhere

- **The lowest plan is the source of truth.** Plans that describe code are written first; a parent only ever restates a child's status as one marker plus a cursor line, never its detail. The detail is stored in the child itself. High-level intent is allowed to exist in the parent plan, e.g. parent states "Files are stored in object storage" and child states "Files are uploaded to digital ocean like this: ...". That is not overlap, but rather abstraction — the parent states the child at a higher altitude.
- **Generated files are never hand-edited** — coverage, drift, and boundary files are written only by the scripts.
- **Confirm before you reshape.** Splitting or merging a plan goes through the user first — and "confirm" means raise it in `QUESTIONS.md` and stop, not wait for a live reply or decide it yourself (**Blocking on a user decision**). Ordinary work inside an agreed shape does not.
