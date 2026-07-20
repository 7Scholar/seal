# Merging child branches into their parent

This is the operating manual for the **merge agent** — an independent agent that runs when several child branches, each holding a finished slice of one concern, need to come back together. It knows nothing about the work on those branches and does not review it. Its job is to bring the family of branches into one consistent state and leave every branch — parent and children alike — up to date.

The system design this serves is [GIT_WORKFLOW.md](GIT_WORKFLOW.md) — how work moves through git, and the coverage guarantees a merge must not break. This file assumes that design and only tells you how to run the merge.

**The work spans several clones, and `origin` is the bus between them.** Each child branch is checked out in its own clone of the repo (`repo/`, `repo_2/`, `repo_3/`, …) — one working tree per running agent. A clone's copy of any branch is only as fresh as its last fetch, so **you never trust a branch pointer in one clone to reflect work done in another.** Everything synchronizes through `origin`: a child pushes its branch up, the parent is pulled down fresh before every merge, and the merged parent is pushed back. You go _to_ each child's clone and merge it up from there, so each merge and its conflicts are handled in the clone that owns that child. Never merge one clone's local branch into another clone's tree directly — that reintroduces the staleness `origin` exists to remove.

## What this merge actually is

Several agents worked disjoint concerns on branches off one parent. **Their code does not overlap** — that partition is the user's to hold, and it holds (a code file in any conflict set means it broke — see **When to stop and ask**, below). What conflicts is the **plan tree**.

It conflicts by design. Every child plan rolls its status up into its parent's **Plans** index and **Cursor** ([INSTRUCTIONS.md](INSTRUCTIONS.md)), so three agents working three disjoint concerns under one parent all write to that parent's `README.md`. Nothing was carved wrong; the roll-up is the system working, and git reads it as a conflict.

So these are not conflicts in the sense of _one side is wrong_. **Both sides are almost always true at once** — two children each finished and each recorded it. The default resolution is therefore **union**: keep both. You are reconciling a roll-up, not refereeing a dispute.

**Union is correct only because the code is disjoint.** Two children that touched no common code cannot have designed the same thing twice, so their plan records can only both be true. This is not background reasoning — it is a live check on every conflict set: a code file among the conflicts means the precondition broke, and you stop (**When to stop and ask**). Everywhere else, the pass is mechanical and you run it without asking.

## Step 1 — Find the family across the clones, and confirm it with the user

You are given a parent branch, or you infer one. Either way you **establish the topology and put it to the user before touching anything.** This is the one confirmation gate in the pass; everything after it runs unattended.

The topology is spread across clones, so **discover it clone by clone.** List the clones (siblings of the working directory: `repo/`, `repo_2/`, …). For each, read the branch it has checked out and whether its tree is clean — that branch is a child, and its clone holds the child's **real tip**. Do not read a child's tip from any other clone: a sibling's copy of that branch is as stale as its last fetch, so the only trustworthy tip is in the clone that owns it. (A primary clone can easily be missing children's commits entirely if it never fetched them — reading their state from there would merge a stale branch silently.)

Then, for each child, analyze it **in its own clone** against the parent:

```
git -C <clone> branch --show-current                              the child this clone owns
git -C <clone> status --porcelain                                 clean tree?
git -C <clone> merge-base --is-ancestor <parent> <child>          is the child cut from the parent's history
git -C <clone> rev-list --left-right --count <parent>...<child>   behind / ahead
git -C <clone> log --oneline <parent>..<child>                    what the child carries
git -C <clone> rev-parse <parent>                                 this clone's parent SHA — compare across clones
```

The topology is often not what anyone remembers. Branches get renamed, a child gets merged and left behind, two names sit on the same SHA, a child was cut from a different parent than the one assumed, or two clones disagree on where the parent points. **Report what git says, not what the branch names suggest**, and flag anything that contradicts the expected shape: a child already merged, a child not descended from the parent, a child with no unique commits, or clones whose parent SHAs differ (some clone has unpushed parent work, or one is behind).

Then present the plan and **wait**:

> Parent: `feature/vault` — same SHA `ee120a9f0` in all three clones ✓
> Children to merge up:
> · `unlock-flow` (`repo/`) — 1 ahead
> · `key-rotation` (`repo_2/`) — 7 ahead
> · `export` (`repo_3/`) — 4 ahead
> All three descend cleanly from the parent, 0 behind, trees clean.
> Skipping: `audit-log` — not checked out in any clone.
>
> Plan: in each child's clone, merge that child up into the parent through `origin` (smallest first: unlock-flow → export → key-rotation); then clean the parent once and push; then merge the parent back down into each child. Proceed?

This is **friction-with-the-system territory, not a plan question** ([INSTRUCTIONS.md](INSTRUCTIONS.md)) — it is about which branches to operate on, not a crossroad in the work. So it is asked live, here in the chat, not in `QUESTIONS.md`.

## Step 2 — The go/no-go gate: confirm before mutating the remote

Everything up to here has been read-only. The moment step 3 begins it **pushes to `origin` and merges branches** — side effects visible to every clone and every other agent pulling from the remote, and the one place this agent deliberately breaks the "agents never push" rule in [INSTRUCTIONS.md](INSTRUCTIONS.md). That crossing gets its own explicit, blocking confirmation — separate from the step 1 topology report, because "the family is correct" is not the same question as "go ahead and mutate the remote now."

**Ask with the `AskUserQuestion` tool** (not a prose question in the chat), so the user makes one deliberate choice. Present at least:

- **the exact side effects** — which child branches get pushed, that the parent gets pushed after each merge, and that no rewrite (squash/rebase) will happen;
- **the standing assumption to confirm** — that every child is a **finished** slice, not work in progress. A clean tree is not proof of this; an agent could be paused mid-task. Only the user knows, so make them affirm it.

Offer, at minimum, these choices:

- **Full run** — proceed through all children with pushes, per steps 3–4.
- **Rehearse one child, no push** — run the first child's merge and conflict-resolution locally and **stop before the push**, so the real machinery is exercised with a one-command undo (`git merge --abort`) and zero remote effect, for the user to inspect before authorizing the rest.
- **Cancel** — touch nothing.

**Block on the answer.** Do not push, merge, or otherwise mutate anything until the user picks. On **Full run**, proceed through the rest of the pass without further check-ins, stopping only on a genuine escalation trigger. On **Rehearse**, do exactly the one child and come back. On **Cancel**, stop.

## Step 3 — Merge each child up into the parent, through `origin`

One child at a time, in the confirmed order. Work **in that child's own clone**, and route everything through `origin` so each merge lands on the freshest parent:

1. **Push the child** to `origin` so it exists as an independent ref (`git push origin <child>`).
2. **Check out the parent and pull it fresh** (`git checkout <parent> && git pull origin <parent>`) — this is what pulls in the previous child's merge, making the sequence serial.
3. **Merge the child into the parent** (`git merge <child>` — **a merge commit, never squash or rebase**, per the guarantee in [GIT_WORKFLOW.md](GIT_WORKFLOW.md); rewriting SHAs kills every coverage stamp on the branch).
4. **Resolve conflicts** per **The resolution rules**, below. Commit the resolution.
5. **Push the parent** (`git push origin <parent>`).

Finish each child completely before starting the next. Serial is the point, and the pull in sub-step 2 enforces it: the second child pulls a parent that already carries the first child's merge, so a conflict is always a two-way reconcile against a settled parent — never a three-way argument nobody can read. **Cleanup (format, typecheck, drift, coverage) is not done here** — it happens once, on the assembled parent, in step 4. This step is merge and conflict-resolution only.

## Step 4 — Clean the parent once, then merge it back down into every child

Once every child is up, the parent on `origin` holds the union. Now settle it, in **one** clone, and only then push the cleaned result down to each child.

**Clean the assembled parent (once):**

1. In one clone, check out the parent and pull it fresh (`git checkout <parent> && git pull origin <parent>`).
2. **Format and typecheck the touched areas** with the repo's targeted checks (typecheck, unit tests), once those exist. Do not run a full build unless asked.
3. **Confirm coverage is clean:** from `context/_scripts/`, `uv run run_coverage --all --verbose` reports no drift, and `context/plans/app/DRIFT.md` is absent.
4. **Stamp after any prose edit.** The ordering rule from [GIT_WORKFLOW.md](GIT_WORKFLOW.md) reasserts itself here. A merge commit on its own attributes no files, so it creates no drift — but if you **edited** a covered file while resolving (re-deriving a cursor, unioning an index), that edit lands after the stamp and reads as drift. Commit the resolution, then `add_to_coverage` the touched plans as the final commit. Stamp last, exactly as an implementing agent does.
5. **Push the cleaned parent** (`git push origin <parent>`).

Drift in files you never touched is **unrelated drift** — handle it per [AGENT_ENTRY.md](AGENT_ENTRY.md) (ask the user; don't blind-stamp or silently clear it).

**Merge the parent back down into each child that is still being worked.** In each such child's clone: `git checkout <child> && git merge origin/<parent>` (after a `git fetch`), then `git push origin <child>`.

This merge-down is the step most often skipped, and skipping it is what makes the _next_ merge painful. A child left behind keeps building on a parent that has moved, and re-derives conflicts already resolved once. The merge-down is what makes the pass idempotent: run it, and every branch in the family sits at the same plan-tree state. It is normally clean — the parent's new content came from the siblings, which this child never touched — but where it conflicts, the same resolution rules apply. A finished child that will not be worked again does not need it; which children are live was settled at the step 1 gate.

## The resolution rules

Per artifact, because the right resolution differs by what the file _is_.

### The `Plans` index and step markers — union the steps

Each child recorded its own step's marker. **Take both.** Two children flipping two different steps `[ ]`→`[x]` in the same list is the archetypal conflict here, and both are right.

The one case that is not mechanical: both sides changed the marker on the **same** step. That is not a union — it is two accounts of one child's status. The child's own plan is ground truth ([DOC_TO_DOC_DRIFT.md](DOC_TO_DOC_DRIFT.md): the edges are ground truth, and repair runs upward). Read the child, take its status, and set the parent's marker from it.

### `MEMORY.md` — union the entries

Genuinely append-only. Each entry is a standalone landmine warning ([INSTRUCTIONS.md](INSTRUCTIONS.md)), so entries never compete. **Keep every entry from both sides**, ordered by date.

Drop an exact duplicate — two children can record the same constraint they both hit. Do not merge two _similar_ entries into one; they were written about different concerns and each states its own mistake. Do not add an entry about the merge — a merge pass leaves no trace of itself in `MEMORY.md`, the same rule the cleanup pass holds ([CLEANUP.md](CLEANUP.md)).

### `coverage.json` — never hand-edit; union the keys, then let the script rewrite it

Coverage is generated and **never hand-edited** ([INSTRUCTIONS.md](INSTRUCTIONS.md)). It is also the one artifact where the conflict is not textual at all.

The file is a map of plan `.md` → file → reconciled-at SHA ([SYNC.md](SYNC.md)). Two children stamping two different plans in one leaf folder conflict on the file while contradicting nothing. **Resolve by taking the union of the keys** — each plan's own map is whole and untouched by the other side — then re-run the script to let it rewrite the SHAs against the merged history:

```
cd context/_scripts
uv run add_to_coverage <plan.md> <path...>
```

Two children stamping **the same plan `.md`** is different. That is the partition rule in [GIT_WORKFLOW.md](GIT_WORKFLOW.md) failing — two tasks were assigned overlapping territory — and the conflict is the alarm working. Do not resolve it; it is an escalation (**When to stop and ask**).

### `Cursor` — re-derive it, never concatenate

The one rule here that is not union, and the easiest to get wrong.

A cursor is a **summary**, not a record. A parent's cursor names the children that are in progress and rolls each to a status, at the parent's own altitude ([CLEANUP.md](CLEANUP.md), concern 5). Three cursor lines concatenated is not a merged cursor — it is three children's cursors stacked in a file that should hold one parent-altitude view.

So: read the merged **Plans** index and each child's own cursor, then **write the parent's cursor fresh** from what is now true. Which children are live now? Which just landed? Is there one line of seam reasoning worth keeping? That is the cursor. It may look nothing like either conflicting side, and that is correct.

Do not touch the children's own cursors. Each child owns its own, and the merge-down carries the parent's cursor down without disturbing them.

### Code — you do not resolve it

Code in the conflict set means the precondition broke. Stop (**When to stop and ask**).

## When to stop and ask

These triggers are **structural, not intuitive**. You do not stop because a merge feels uncertain; you stop because one of these facts is true — each is a case where continuing would fabricate an answer rather than reconcile a roll-up.

- **The conflict set includes a code file.** The children were supposed to be disjoint in code and are not. Their plans may now hold two competing designs, and union would merge them into a document describing neither.
- **Two children stamped the same plan `.md` in `coverage.json`.** Overlapping territory — the partition failed ([GIT_WORKFLOW.md](GIT_WORKFLOW.md)). Re-partitioning the tasks is the fix, and it is not yours.
- **Two children's Approaches disagree on substance.** Not two facets of one design — two accounts of the same behavior that cannot both hold. Union produces a contradiction.
- **A child's step markers contradict what its code actually does.** That is code-to-doc drift arriving through a merge. Route it to [CODE_DRIFT.md](CODE_DRIFT.md); do not settle it inside a resolution.
- **The topology contradicts what was confirmed.** A child turns out not to be descended from the parent, or carries commits nobody expected. Go back to the user rather than proceeding on a shape that was not agreed.

**How to stop:** leave the merge unresolved (`git merge --abort` if nothing else has landed, otherwise leave the conflict in the working tree and say so plainly), report which trigger fired and on which files, and stop that line of work. Do not resolve the rest of the family around it — a half-merged family is harder to reason about than a stopped one.

These are questions about the work, not friction with the tooling, so where one lands in `QUESTIONS.md` versus the chat follows the rule in [INSTRUCTIONS.md](INSTRUCTIONS.md): a crossroad in the plans goes in `QUESTIONS.md` beside the node it blocks; a broken partition or an unexpected topology is worked out live.

## When you are done

Every child is reachable from the parent through a merge commit, and every live child has the parent merged back down into it — so the whole family sits at one plan-tree state, and every branch is pushed to `origin`. The parent holds the union of its children's records, its cursor is one freshly written parent-altitude view, it typechecks, and `run_coverage --all` is clean on it. Because everything moved through `origin`, every clone is one `git pull` from current on the branch it holds — no clone is stranded on a stale copy.

The next agent to pick up any child branches from a parent that already knows everything its siblings did.
