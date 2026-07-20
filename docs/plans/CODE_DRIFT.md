# Code drift

A `DRIFT.md` at a plan root means the code and docs are out of sync — start here before any other work on that plan, since you don't build on top of unreconciled drift.

If `DRIFT.md` is large (dozens of nodes, spanning many unrelated concerns, backend and frontend both) rather than a handful of files, read [LARGE_DRIFT.md](LARGE_DRIFT.md) first — reconciling it file-by-file risks missing a cross-cutting change that only shows itself once the whole ledger is classified.

It lists files whose code has moved since the docs were last reconciled to them (or files no plan covers). Reconcile it by reading both the docs and the code, then realigning them:

- **Docs and code already agree** → the coverage is just stale. Re-record it: `add_to_coverage` the changed file, drop a deleted file (`remove_from_coverage`), and for a renamed file drop the old path and add the new one — checking the old path's history for edits made before the rename.
- **Docs and code disagree** → decide which is wrong (usually the code moved ahead and the docs lag; occasionally the code regressed), fix both sides, then bring coverage back in line. If it's unclear which side is right, raise it in the plan's `QUESTIONS.md` and stop until the user answers (the mechanism is **Blocking on a user decision** in [INSTRUCTIONS.md](INSTRUCTIONS.md)) rather than guessing.

A file `DRIFT.md` lists as **uncovered** belongs to no plan. It can't be left alone — it resurfaces every time. Either it earns a place in a plan, or it's genuinely outside the plan's scope. Giving it a home, dropping a plan, or moving a file between plans **reshapes the tree, so raise it in `QUESTIONS.md` and wait for the user** before applying — then fix coverage to match (drop from the old plan, add to the new).

The coverage scripts, run from `context/_scripts/`:

```
uv run add_to_coverage <plan.md> <path...>        cover these files under this plan (re-run after edits to re-sync them)
uv run remove_from_coverage <plan.md> <path...>   drop these files from this plan
```

`<path...>` is one or more files or folders (a folder covers all its files). Coverage stamps at `HEAD`, so commit any files you created or changed while reconciling before you stamp them. If `add_to_coverage` refuses because a file is outside the plan's allowed area, the error prints the exact command to widen it; run that, then retry. If it refuses a file as untracked or as having uncommitted changes, stage and commit that file, then retry — the stamp always follows the commit.

## Confirm the drift is resolved

After reconciling, re-run the detector as a full sweep to check your work:

```
uv run run_coverage --all --verbose
```

It rewrites each root's `DRIFT.md` from the current state: **if drift remains, the file is rewritten with what's left and the command exits non-zero; if the drift is gone, the file is deleted and it exits zero.** So the drift is resolved exactly when **`DRIFT.md` is gone**. `--verbose` also prints the remaining findings to stdout, so you see what's still flagged without opening the file.

Loop until it exits clean: reconcile → re-stamp with `add_to_coverage` → `run_coverage --all --verbose` → repeat until `run_coverage` outputs no drift and `DRIFT.md` is gone.

Never hand-edit `DRIFT.md`, `coverage.json`, or the area-boundary file — they're generated and your edits get overwritten.
