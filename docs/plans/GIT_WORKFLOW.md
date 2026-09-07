# Git workflow

> **This document is the full design of how work moves through git** — how an agent takes a plan from a branch to a merged change, and the one guarantee that keeps the coverage machinery ([SYNC.md](SYNC.md)) intact across a merge. It is system description (home is [README.md](README.md)); the distilled agent-facing steps live in [INSTRUCTIONS.md](INSTRUCTIONS.md).

## The shape

An **agent** works one plan on a branch off `main` and **commits its work locally**. When the branch is ready, the **human** pushes it and opens a **pull request into `main`**, then reviews and merges it on GitHub. `main` is the integration trunk — nothing deploys from it automatically, so it tolerates a brief out-of-sync state without consequence.

The division of labour is fixed:

- **The implementing agent** writes the code, updates the plan prose to match, and **stamps its own coverage** — it has the authority, because it just did the work and knows whether the prose describes the code. It commits everything locally on the branch and **stops there**: it never pushes and never opens a PR.
- **The human** owns the whole remote side: push the branch, open the PR, review the diff, then merge — or request changes and let the agent keep working the branch locally. Coverage and drift are never the human's job.

So an agent's branch holds a change that is already complete: code, prose, and coverage all reconciled in local commits, ready for the human to push and land. Nothing is left to do on `main` after the merge.

**The workflow runs in one clone.** Concurrent tasks are branches in that clone, each its own PR. A clone has one working tree, which holds one checked-out branch at a time, so a second clone buys a second working tree when enough tasks run at once that they need to be edited in parallel. The rules below govern branches and PRs, so they apply per branch wherever its tree lives — a second clone adds working trees and nothing else.

## The one guarantee: merge commits, never squash or rebase

Coverage stamps a git SHA per file ([SYNC.md](SYNC.md)) — the commit a plan was last reconciled against. The implementing agent stamps those SHAs **on its branch**, against branch commits. For the stamp to stay valid after the branch reaches `main`, that commit must still exist on `main` — `git log <stamp>..HEAD` is only meaningful if both ends share a line of history.

**A merge commit preserves every branch SHA; squash and rebase rewrite them.** Squash collapses the branch to one new commit and rebase replays commits under new SHAs — either way the branch SHAs the agent stamped no longer exist on `main`, so every stamp points at a dead commit and the detector flags the whole change as drift on `main`. A merge commit introduces no rewrite: the agent's commits become reachable from `main` unchanged, and every stamp resolves.

A repo setting holds this: configure the GitHub repo to allow `main` PRs to merge **only** as a merge commit — the squash and rebase buttons disabled — so the merge button always preserves SHAs and the guarantee survives without anyone choosing it per merge.

### Why a merge commit produces no drift on its own

The detector reads a file's window as `git log --name-only <sha>..HEAD` ([SYNC.md](SYNC.md), and `git_window_changes` in `coverage_lib.py`). `git log --name-only` attributes **no files to a merge commit** — git only diffs a merge when explicitly asked (`-m`/`-c`/`--cc`), which the detector never does. So the merge commit itself is invisible: it changes no file's window, and a PR that merges as a merge commit adds no drift by merging. Only the agent's real branch commits carry file attributions, and those are already covered by the stamp the agent made — provided it stamped last (below).

## Stamp last

The merge-commit guarantee secures the **mechanism** (no SHA is rewritten); the agent secures the **content** by reconciling before it hands the branch off. The rule that makes a branch land drift-free: **stamp coverage as the agent's final commit**, after the code and prose are settled — so the branch the human later pushes is already fully in sync.

The reason is exact. A stamp's window is `git log <stamp>..HEAD`. If a file is stamped and then edited again on the branch, that later edit sits inside the window and the file reads as `changed` once merged — correctly, because the prose was reconciled against an older version of the file. Stamping last makes the stamp the newest commit touching each covered file, so the window holds only the merge commit (which attributes nothing) and the file is in sync on `main`. This is the same per-file reconcile `add_to_coverage` always performs ([SYNC.md](SYNC.md)); the workflow only fixes _when_ it runs — at the end, against the branch's final state.

## Partition: one task per plan subtree

Coverage lives in `coverage.json` files, one per leaf folder ([SYNC.md](SYNC.md)). When two branches both stamp coverage for plans in the **same** leaf folder, both edit that one `coverage.json`, and the second PR conflicts on it — whether the branches share a clone or sit in separate ones.

The rule that prevents this: **each concurrent task owns a disjoint plan subtree.** The plan tree is already a decomposition into independent concerns (README **section 1**), so a subtree per task is the natural assignment, and disjoint subtrees touch disjoint leaf folders — their coverage never overlaps. So a `coverage.json` conflict on a PR is a **signal that two tasks were assigned overlapping territory** — `coverage.json` is generated ([SYNC.md](SYNC.md)), so the fix is to re-partition the tasks and let the scripts rewrite it. GitHub surfacing the conflict and blocking the merge is the alarm working.

## Per-clone setup

Two things are local git state, established once per clone before work happens in it — once for the single default clone, and once more for each additional clone if the workflow is scaled out:

- **`install_hook`** — installs the pre-commit format hook (a placeholder until the repo has formatters) and the post-commit drift detector ([SYNC.md](SYNC.md)). Hooks are per-clone and not committed, so a clone has neither until this runs; without it, drift is never detected there.
- **`gh`, installed and authenticated** — the **human** pushes the branch and opens the PR (with `gh pr create` or the GitHub UI), so the GitHub CLI must be present and logged in for that step. The agent never invokes it.

## End to end

1. **Set up the clone, once:** pull latest `main`, run `install_hook`, ensure `gh` is authenticated.
2. **Assign** the task a plan subtree, disjoint from any other in-flight task's.
3. **Branch** off `main` and work the plan: write code, update the plan prose, commit freely.
4. **Reconcile last:** stamp coverage for the touched files (`add_to_coverage`) as the final commit, so the branch is fully in sync. **The agent stops here** — the branch is committed locally and ready to hand off; it does not push or open a PR.
5. **The human lands it:** push the branch and open a PR into `main`, then review the diff and either merge (as a merge commit) or request changes — in which case the agent keeps working the branch locally and the human pushes again, until it is accepted.
