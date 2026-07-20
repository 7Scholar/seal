# Keeping everything in sync

> **This document describes how the drift machinery works** and the contracts it guarantees. It is part of the system description (the home is [README.md](README.md)).

The system handles three kinds of drift:

- **Doc-to-doc** — a parent's rolled-up status disagrees with its child (cursors/step markers out of sync within the tree). Its repair is covered in [DOC_TO_DOC_DRIFT.md](DOC_TO_DOC_DRIFT.md).
- **Doc-to-code** and **code-to-doc** — the docs no longer describe the code. The rest of this document is about these two, which share one machinery.

### Contract (what the system actually guarantees)

> The system does **not** guarantee docs are correct. It guarantees that out-of-sync docs and code are flagged as drifted. Correctness is delegated to an AI agent (cheap, good at it). The hard, un-delegatable part — **detecting staleness** — is made airtight and deterministic.

### The boundary: what a plan owns

Everything starts at the **root-plan folder** (`context/plans/<root>/`) and the slice of the repo it owns. That slice is its **boundary**, stored in a single `boundary.json` at the root as two lists of repo-relative paths: an `include` list (what the plan owns) minus an `exclude` list (what is carved back out). The boundary is everything matched by an `include` and not by an `exclude`. There is exactly **one boundary per root** — the nested plan folders and `.md` files below it have none; they all live inside the root's one boundary.

Entries in either list are **files or directories** — a directory matches everything under it. So a boundary like

```json
{
    "include": ["src-tauri/src/vault", "src-tauri/src/config.rs"],
    "exclude": ["src-tauri/src/vault/legacy"]
}
```

owns the whole `vault` directory and one specific file, except for the `legacy` subtree inside it. Code outside the boundary is invisible to the system — drift is never detected there.

A root **defaults to an empty boundary** — `include` and `exclude` both empty, owning nothing — and the `boundary.json` is created on demand the first time coverage is declared, so a plan never has to be initialized by hand. Seeding it up front is **optional**: a user may set it when the plan starts, but is not required to. An empty boundary means nothing is in scope, so a not-yet-started plan simply has no drift — the correct default. Either way the boundary grows as the plan grows. Widening a boundary is cheap and expected, but **deliberate**: coverage that would land outside the current boundary fails rather than silently widening it (see **Scripts**), so the boundary always reflects a decision someone made.

### Coverage: which plans describe which files

Inside the boundary, plan `.md` files describe the code. A folder's `README.md` is pure coordination — it indexes child plans and rolls up their status — so it never covers code and needs no coverage of its own. **Only plan `.md` files cover code.**

Each plan `.md` carries **coverage**: the set of code files it describes. Because only `.md` files cover code, coverage lives in a single `coverage.json` in each **leaf** folder (the one form that holds `.md` plans), keyed by `.md` filename; a branch folder has none. So a plan tree looks like:

```
context/plans/app/
  README.md
  plan-a/
    README.md
    plan-a-i.md
    plan-a-ii.md
    coverage.json
```

Each `.md` key maps to that plan's own coverage: a flat map of **concrete file → `reconciled-at` SHA** — the git SHA that `.md` was last reconciled against for that file. So the `coverage.json` looks like:

```json
{
    "plan-a-i.md": {
        "src-tauri/src/vault/store.rs": "a0ac9112d3f4e7b1c2a9f08e6d5b4c3a2f1e0d9c",
        "src-tauri/src/vault/commands.rs": "cc93b1fb8e2d1a0f9c8b7a6d5e4f3c2b1a0d9e8f"
    },
    "plan-a-ii.md": {
        "src-tauri/src/vault/settings.rs": "a0ac9112d3f4e7b1c2a9f08e6d5b4c3a2f1e0d9c"
    }
}
```

The SHA is what makes "described by the doc" a checkable fact. It records the commit at which `plan-a-i.md` and `store.rs` were last in agreement, so freshness is a single git question — _have there been commits to this file since that SHA?_ Walking the lifecycle of one file:

1. The plan covers `store.rs`. HEAD is `a0ac9112`, so that commit is stamped: `"src-tauri/src/vault/store.rs": "a0ac9112…"`. The doc and the file agree as of `a0ac9112`.
2. Someone later commits an edit to `store.rs` (in commit `7f3e…`). Now `git log a0ac9112..HEAD -- src-tauri/src/vault/store.rs` returns `7f3e…` — non-empty, so the file is **stale**: the code moved past the point the doc was reconciled to. The detector reports it as `changed` and hands the agent exactly that commit.
3. The agent reviews `7f3e…` against the prose, updates `plan-a-i.md` if the change is significant, and re-covers the file. That re-stamps the SHA to the current HEAD, `git log` goes empty again, and `store.rs` is back in sync.

`commands.rs` in the same plan is untouched through all of this — its SHA still names its own last-reconciled commit, so it is judged independently. Coverage is per-file precisely so one file going stale never drags another in with it.

The same file may appear under more than one `.md`, even across different `coverage.json` files. **Overlap is allowed** so that a change made under plan A's intent that also invalidates plan B's docs flags both.

- **A file is covered or it isn't** — there is no partial state.
- **Coverage is git-tracked files only.** A folder named to a verb is expanded to its files via `git ls-files`; the stored map is always concrete files, never directories. Covering an untracked file is refused (see **Scripts**), so code is committed before it is covered.
- Paths are stored repo-relative and POSIX-style, so a `coverage.json` is identical across machines.

`coverage.json` and `boundary.json` are **generated artifacts** — read through script output, never edited or read by eye. `coverage.json` is verbose (one entry and SHA per file, per `.md` key); that is accepted.

### The detector: what is in sync, what isn't

The detector is read-only — it reports, never edits. It applies the boundary's `include`/`exclude` **live at run time** (never a filter frozen into `coverage.json`), looks only inside the boundary, and because coverage is keyed by `.md`, every finding names the plan `.md` to act on.

It classifies **files**, not commits. For each file it asks two mechanical questions — does the file exist at HEAD, and is it stale (the `git log` check above) — and emits one of three findings. It never reads a diff, judges how big a change is, or asserts that one file became another; that judgment is the agent's. However tangled the history between the SHA and HEAD — many commits, renames, splits, a file deleted and restored — the output stays a flat list of these three findings:

- **changed** — a covered file still exists at its path and has commits after its SHA. Carries those commits, each annotated with how many files it touched (so a one-line surgical edit reads differently from one slice of a 50-file sweep), and the covering `.md`(s).
- **removed** — a covered file is **gone at HEAD** (deleted or renamed away). Existence at HEAD is checked first, so a vanished file is `removed`, never also `changed`. It carries `git log <sha>..HEAD -- <oldpath>` — the path's history up to its disappearance — so a content edit made _before_ the file was renamed away is visible, not swallowed by the move. Where the log's last entries are renames, the trail is shown verbatim from the commit subjects (a deterministic fact in that path's own log, not a similarity guess) and stops at the last known name; the detector does not claim where the code now lives.
- **uncovered** — a file inside the boundary that no `.md` covers, with the commit that first introduced it in the window. The candidate destination for a `removed` rename shows up here.

The detector reports **severed endpoints**: a renamed file is a `removed` at the old path and an `uncovered` at the new one, never a single "renamed" finding. Rejoining them is the agent's one inference, and the report gives it what it needs to make it without leaving the page — the dead path's history on one side, the new path's birth commit on the other. A file that was both **born and died inside the window** (created after the SHA, gone before HEAD) touches neither endpoint and produces **no finding** — only the endpoints matter.

A covered file that an `exclude` now carves out is simply **out of scope**: the detector skips it, reporting neither `changed` nor `removed`. Its SHA stays in `coverage.json` untouched, so removing the `exclude` later flags it again from where it left off.

### Scripts: managing boundary, coverage, and the detector

The three concepts above — boundary, coverage, detector — are each managed by a stdlib-only Python script under `context/_scripts/`, run with `uv run <verb> …` from that directory. The `boundary.json` and `coverage.json` are touched **only through these scripts**, so their format stays an implementation detail and SHAs are never hand-typed; a plan `.md` or plan root is always the argument, since it is the key. **This section is the full reference for the scripts** — usage, flags, and the failures each one refuses.

The scripts that write are deliberately **dumb to call and loud on ambiguity**: the agent names a `.md` (or root) and some paths, and **every failure is self-diagnosing** — it names the exact offending paths or files and states the corrective action, so the agent recovers from the message alone and never reads the raw JSON. (This is why there is no read verb: the detector's report and these errors are the only ways coverage is read.) Every failed write is **atomic** — neither `coverage.json` nor `boundary.json` is ever half-written, nothing changes, and it exits non-zero.

#### What the agent is exposed to

The agent's whole surface is **two verbs**, run with `uv run <verb> …` from `context/_scripts/`:

```
uv run add_to_coverage <plan.md> <path...>        cover these paths under <plan.md>, stamped at HEAD (re-run on reviewed files to reconcile them)
uv run remove_from_coverage <plan.md> <path...>   drop these paths from <plan.md>'s coverage (omit <path...> on a deleted .md to drop its whole orphaned key)
```

That is enough to call them directly — the agent does not need to probe first. `<plan.md>` is the plan file; `<path...>` is one or more files or folders, folders expanding to their tracked files. A folder path should only be passed if all the files in that folder are covered. **All path arguments — `<plan.md>`, `<path...>`, and the `<plan-root>` the detector and `set_boundary` take — are interpreted relative to the repo root** (an absolute path works too), so the verbs behave the same no matter which directory they run from; running from `context/_scripts/` is convention, not a requirement. A relative path that happens to resolve under both the current directory and the repo root, as two different files, is refused as ambiguous rather than picked silently — pass an absolute path to disambiguate. Each verb also implements `--help`, which prints this same usage; it is the fallback when an invocation is malformed, not the way the agent learns the command. Declaring coverage is the only coverage operation an agent ever performs — running the detector is the hook's job, not the agent's.

`set_boundary` is **not** part of that surface. The agent does not widen the boundary as a routine step; it works inside whatever boundary the plan already has. The one time the boundary enters the picture is **reactively**: when `add_to_coverage` names a path outside the boundary, the refusal itself carries the exact `set_boundary` invocation that would widen it. So the agent only ever touches the boundary in response to that error, prompted with the precise command — never by reaching for `set_boundary` on its own. Seeding a boundary up front is an optional human/setup step, not part of working a plan.

#### Boundary

`set_boundary <plan-root>` is the only writer of `boundary.json`, adding or dropping `include`/`exclude` paths:

```
set_boundary <plan-root> [flags]
  --include <path>          add a file/dir to the boundary (repeatable)
  --exclude <path>          carve a subtree back out (repeatable)
  --remove-include <path>   drop an include by its stored path
  --remove-exclude <path>   drop an exclude by its stored path
```

It refuses:

- _An `--exclude` that falls under no `--include`_ → names it; an exclude outside every include carves nothing.
- _A `--remove-include` / `--remove-exclude` for a path not currently stored_ → names it.

#### Coverage

Two verbs declare coverage; both name a `.md` and some paths and nothing else.

- **Adding is an upsert.** `add_to_coverage <plan.md> <path...>` merges the named paths' files into the `.md`'s map and stamps each at HEAD, leaving files it didn't name alone — the agent never passes the full set and never needs to know whether a path was already covered. Re-running it after working a plan re-stamps exactly the files just brought into sync, so **adding is also the reconcile** — there is no separate command, and it is per-file: re-stamp one reviewed file and leave the rest flagged.
- **Removing is explicit.** Naming a path to `remove_from_coverage <plan.md> <path...>` is the **only** way a file leaves a `.md`, so no call ever silently drops coverage. When a plan `.md` has itself been **deleted**, its coverage key is orphaned — no live path can name it — so `remove_from_coverage <plan.md>` **with no `<path...>`** drops that whole key. Still deliberate: the agent names the deleted `.md` by hand; nothing prunes a key on its own (the detector never touches `coverage.json`, and a re-cover never drops). This whole-key form is allowed **only** for a `.md` that is gone from disk; a still-present `.md` always drops per-path.

`add_to_coverage` refuses:

- _An untracked file under a named path_ → names every untracked file; commit them first.
- _A file with uncommitted changes (staged or unstaged)_ → names them; the stamp records HEAD, which predates the working tree, so stamping now would read as instant drift once the changes land. Commit first, then stamp — this refusal is what makes "stamp last" mechanical rather than a convention.
- _A named path expanding to any file outside the boundary_ (whether the whole path or only part of it) → names those files **and prints the exact `set_boundary --include …` command that would widen the boundary to cover them**, so the agent can widen deliberately and retry without ever reaching for `set_boundary` unprompted. The add is all-or-nothing — it never covers the in-boundary remainder, since a partial write is itself a silent outcome.
- _A path inside the plan tree (`context/plans/`)_ → refused; coverage points at code, not at the doc system.
- _A path that resolves to nothing on disk_ → names the path.

`remove_from_coverage` refuses:

- _A path that covers nothing under that `.md`_ → names it; the agent likely named the wrong `.md` or a path never added.
- _A deleted `.md` named **with** paths_ → a deleted `.md` has no live paths, so the key drops whole or not at all; re-run with no paths.
- _A still-present `.md` named **without** paths_ → a live `.md` drops per-path; name the files or folders to drop.
- _A `.md` that is gone **and** has no coverage key_ → nothing to drop; reported as covering nothing.

`add_to_coverage` refuses a missing `.md`; both verbs refuse a missing root, or a `.md` that is not a plan `.md` (e.g. a `README.md`, which covers no code) → named, and nothing changes. (`remove_from_coverage` accepts a deleted `.md`, per the whole-key form above.)

#### Detector

`run_coverage` runs the detector defined above and writes the affected roots' `DRIFT.md` — every root with `--all`, or the one enclosing the `<folder>` named:

```
run_coverage [--all | <folder>] [--verbose]
  --all         refresh every root's DRIFT.md
  <folder>      a plan root, or any folder beneath one; refresh that root's DRIFT.md and report the folder's drift
  --verbose     also print the full findings to stdout (the one-line summary always prints)
```

For each root it touches, it **writes `DRIFT.md` if there is drift and deletes any stale one if there is none** — so the file exists exactly when a root has drift. It exits non-zero if any drift is found. It touches **only** `DRIFT.md` — never `coverage.json` or `boundary.json` — so it has no refusals; it only reports. **It always prints a one-line result per scope** (clean → `no drift`; drift → how many plans drifted and the `DRIFT.md` path), so a silent run never leaves the result ambiguous; `--verbose` adds the full findings. `<folder>` need not be a root: pass any folder under one (e.g. a single child concern) and the detector runs against the **enclosing** root — the `DRIFT.md` write is still root-wide — while the printed result is **narrowed to that subtree**, so "is this concern clean?" gets a direct answer. This is the single detector script; the hook calls it, and a human can run it by hand to check a root or a subtree on demand.

#### The two hooks

`install_hook` installs **two git hooks** into the current clone — a `pre-commit` format hook and a `post-commit` drift detector (run once per clone — hooks are local git state, not committed). It refuses to overwrite a hook a user placed there by hand, recognizing its own by a marker string.

The **`pre-commit` hook** is the format slot. Its job, once the repo has formatters, is to format the staged files in place and re-stage them **before** the commit captures their content, dispatching each staged path to the repo's configured formatters, but only over the files in that commit. This exists for coverage's sake: coverage is keyed on committed file content, so a manual bulk format followed by a commit would change every reformatted file and make the detector flag pure formatting churn as drift. Formatting at commit time means the committed content is always already formatted, and the `post-commit` detector only ever sees formatted content — no formatting ever registers as drift. Unlike the detector hook, this one **blocks the commit** if a formatter fails, so unformatted or broken content never lands. **Until the repo's formatters exist, the shipped hook is a deliberate no-op placeholder** — wire them in when the first code area establishes its tooling.

The **`post-commit` hook** runs the detector. Running it is then **not** left to the agent to remember: the hook runs `run_coverage --all` after every commit, so detection is taken off the agent entirely while writing boundary and coverage stays agent-driven.

The detector hook's behavior:

- **Trigger = a commit.** After every commit the hook runs `run_coverage --all`, refreshing every root: a drifted root's `DRIFT.md` is written, an in-sync root's is removed. The hook catches **user-made** commits too, not just the agent's.
- **It never blocks.** The hook swallows all output and any detector error, so drift detection can never wedge committing. It surfaces drift; it does not gate the commit.
- **The output is a `DRIFT.md`** at `context/plans/<root>/DRIFT.md`. **Its existence is the signal**: a root with drift gets a `DRIFT.md` (format below); a clean root has **no** `DRIFT.md` — each run rewrites the file when there is drift and deletes it when there is none.
- **The agent consumes it on cold-resume** as part of the session-handoff protocol (README section 6): if the active leaf's plan-root `DRIFT.md` exists, its findings are reconciled per **Resolving drift** below; if the file is absent, the root is in sync and there is nothing to do.

The hook reports drift from _the commit that just happened_, while the reconcile (re-stamping coverage) lands in a _later_ commit. So a `DRIFT.md` is **expected** to be present in the window between a code commit and the reconcile that clears it; the next commit removes it once the root is back in sync.

##### The `DRIFT.md` format

`DRIFT.md` is **grouped by plan `.md`**: one `## <.md>` block per flagged plan, and each block is a **self-contained reconcile unit** — everything flagged against that one plan, so reconciling it means reading its block top to bottom and updating that `.md`. Files that no plan covers collect in a final `## Uncovered` block.

Within a block, findings are a **flat, type-tagged** list — one line per file, prefixed `changed` or `removed`, followed by the commits behind it (each annotated with how many files it touched, so a surgical edit reads differently from one slice of a sweep) and, for a `removed` file, the path's history to its disappearance with any rename trail shown verbatim:

```markdown
## plan-a/plan-a-i.md

- changed src-tauri/src/vault/store.rs
  7f3e1a2 (1 file) "fix entry ordering"
  9c4d8b0 (12 files) "vault sweep: rename Entry to Secret"
- removed src-tauri/src/vault/old_commands.rs
  e1f2a3b (3 files) "edit routing table"
  b4c5d6e rename -> src-tauri/src/vault/commands.rs

## plan-b/plan-b-i.md

- changed src-tauri/src/vault/settings.rs
  a0091c2 (1 file) "add settings flag"

## Uncovered

- src-tauri/src/vault/commands.rs
  b4c5d6e (born) "vault sweep: rename Entry to Secret"
```

A file can be covered by multiple `.md` files (overlap) and if that file changes it affects all those `.md` files. Therefore, a file covered by more than one `.md` appears under **each** covering `.md`. A severed rename endpoint is visible across blocks by its shared commit: `old_commands.rs` (a `removed` under `plan-a-i.md`) and `commands.rs` (in `## Uncovered`) both carry `b4c5d6e`, which is how the agent rejoins them without leaving the page.

#### Gotchas

- **Never hand-edit `boundary.json`, `coverage.json`, or `DRIFT.md`.** They are generated; the scripts are the only writers, and a hand-edit is silently overwritten on the next run.
- **Editing a boundary's `exclude` takes effect on the next detector run** — the detector applies `include`/`exclude` live, so a newly excluded file is simply skipped from then on; there is nothing to re-cover. Removing the exclude later flags it again from its stored SHA.
- **Tests run against a throwaway git repo.** Each test builds its own disposable repo so the scripts exercise real `git` calls without touching the working tree; run them with `uv run pytest` from `context/_scripts/`.

### Resolving drift

Resolving drift is reading a root's `DRIFT.md` and realigning the docs, code, and coverage. To make a judgement, the docs and code must be read first. After that, there remain only two cases:

- **Docs and code are aligned** → means the coverage is stale. Coverage must be brought back in line with what the docs already describe. Often that is just re-stamping the file at HEAD (`add_to_coverage`), but it can be more: a renamed file is dropped at its old path and added at the new one (`remove_from_coverage` + `add_to_coverage`) — review the old path's history for edits made _before_ the move, which a re-cover would otherwise stamp unseen — and a deleted file is dropped. Any combination should be used to make the coverage true again.
- **Docs and code are NOT aligned** → which side is wrong? It goes both ways, but most often the code is newer and the docs follow it; occasionally the docs are right and the code regressed. Clear misalignments should be fixed in both the docs and the code, and finally bring the coverage back in line. Unclear cases are raised in the plan's `QUESTIONS.md` and left to the user (the mechanism is **Blocking on a user decision** in [README.md](README.md)) rather than guessed.

The detector never judges **significance** — it hands deterministic facts (the finding type, the commits behind it, the covering `.md`) to the agent.

#### When to restructure plans

Most drift is reconciled in place — a prose edit, a code fix, a re-stamp. Sometimes the right resolution is instead to change the **plan structure**: a file's purpose has grown or shifted enough that it no longer fits where it sits, or a file has appeared that fits nowhere. The triggers:

- **A file no plan covers.** The `## Uncovered` block lists files inside the boundary that no plan `.md` describes (a rename endpoint from a `removed` finding lands here too). Such a file is **never left as-is** — it has no SHA, so it cannot be silenced and re-appears every run. It either earns a home in a plan or leaves the boundary.
- **A file whose purpose outgrew its plan.** A covered file can drift so far from the concern its plan `.md` describes that updating that plan's prose no longer makes sense — the file now belongs in its own plan, or under a different one.
- **A file flagging many plans on a one-concern change.** When a single file recurs across _many_ plans' blocks but the change behind it touched only one of their concerns, that file is holding several concerns that should each be self-contained. The fix is not a plan reshape but a **code change** — make each concern its own module: move its code into files that concern owns (README **Build each concern as a self-contained module**), then re-point coverage. A file that genuinely many concerns _depend_ on (a shared seam type) is correct to flag them all and stays put.

The structural moves these triggers lead to — **modularize a multi-concern file** (a code change; cover the new files, drop or re-stamp the old paths), **create a plan `.md`**, **drop a plan `.md`**, **move a file between plans**, or **exclude a path from the boundary** (`set_boundary --exclude`, a viable option for code that should never be planned, e.g. generated or vendored) — are case-by-case judgement, and which one fits is the agent's read. Modularizing a file is ordinary code work the agent owns — it reshapes neither the plan tree nor what is tracked, so it needs no `QUESTIONS.md` gate, only the coverage re-point. Creating and dropping plan `.md` files are the promotion/collapse moves described in README **How a plan grows**; here they carry a coverage consequence — a dropped plan's coverage leaves with `remove_from_coverage` (naming the deleted `.md` with no paths drops its whole orphaned key, the form for a `.md` already gone from disk), and a file moved between plans is removed from the old `.md` and added to the new. But every one of these plan-shape moves changes the shape of the plan or what the system tracks, so the agent **raises the move in the plan's `QUESTIONS.md` and waits for the user** before applying it (the mechanism is **Blocking on a user decision** in [README.md](README.md)). Modularizing a file is the exception noted above: it touches only code and coverage, so it is the agent's to make.

The throughline: every file in the boundary ends up either described by some plan or deliberately excluded from it. An in-boundary file that fits no plan is an unresolved decision, never a resting state.
