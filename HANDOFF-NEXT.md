# Handoff — drive the journeys that have never been driven

> **You are picking this up cold.** Read this, then read what it points you at, then go and drive the real application. Do not start writing code on the strength of this document alone — it tells you where things stand and what is binding, not what to build.

## Read this first: a correction that is the whole lesson

A previous session recorded, in six places across the tree, that **a master-password change left the vault openable by neither password** — framed as the most serious defect the journeys axis had ever found, and flagged to the product owner as "do not change your password."

**It was not a product defect.** The master-password change works correctly and is now driven end to end.

What had actually happened: the harness typed passwords with `browser.keys([...text])`, which **silently drops the spaces**. The vault was established under `correcthorsebatterystaple` while the scenario believed it had typed `correct horse battery staple`. Every later unlock typed the same wrong way, so it kept working and the mismatch stayed invisible — until one field was typed a different way, arrived correct, and was rightly refused. That looked exactly like the rotation destroying the vault.

Two things follow, and they are worth more than any code in this repository:

- **A driven failure is evidence about the whole system, harness included.** It is not proof of a product defect. The harness is as capable of lying as the product.
- **Diagnose to a mechanism before writing a finding down.** A wrong finding in the tree is worse than an unwritten one: it gets propagated to parents, journeys, and the owner, and every one of those has to be walked back. The measurement that settled this — reading the sentinel from disk before and after a failed run, finding it byte-identical and *already* refusing the password — took minutes, and would have prevented all of it had it come first.

## Where things stand

**The harness is healthy and fast.** `first-run` drives 8/8 in about two seconds, `return-and-use` all nine steps, and `interrupted-rekey` five steps in about fifteen. All three were green on the last run.

**Journeys: three of six satisfied.**

- [first-run.md](context/journeys/first-run.md) — satisfied.
- [exposure.md](context/journeys/exposure.md) — satisfied. The alert that finds the user, the rotate instruction with its reason, the fix beside the problem, the recency warning, the file armored on disk.
- [change-the-password.md](context/journeys/change-the-password.md) — **satisfied.** Both the clean run and the interrupted run are driven, and the interrupted one found a real product defect (below), now fixed and re-driven.
- [protect-a-repo.md](context/journeys/protect-a-repo.md) — 6 of 7. Step 7 (rescanning a known repository, and a second repository) is unstaged.
- [use-a-secret.md](context/journeys/use-a-secret.md) — 5 of 8. Steps 6–8 (a non-env file's no-editor treatment, the command-line resolve, plaintext expiry) are unstaged.
- [living-with-it.md](context/journeys/living-with-it.md) — **never driven.** Read it before assuming it resembles the others; it is about trust over time and may need staging nobody has built.

**What the interrupted run found.** The rotation's durable manifest was written only from the engine's final report, so for the whole time a run was working it still read all-pending. A force-quit left it recording *0 of 7 converted* while a file on disk had already moved to the new password, and the resume screen then asked for the old password on a file that no longer needed it. It now persists as each file settles, and the same interruption records *2 of 7*. **Recovery was never broken** — the engine tries the new passphrase before the old, so a resumed run always finished correctly; what was wrong was the report the user reads. That is also why the Rust suite never caught it: its interruption tests hand-write the manifest rather than interrupting a real run.

## What to pick up, in the order I would pick it

Runs take seconds rather than minutes, so staging new scenarios is cheap.

1. **`use-a-secret` steps 6–8 and `protect-a-repo` step 7.** Ordinary staging work against a harness that behaves. This is the shortest path to a fourth and fifth satisfied journey.
2. **`living-with-it`.** Read it first, then decide what it needs — it is about trust over time and may want staging nobody has built.
3. **Widen the CI gate.** It still gates on `first-run` alone, and has never had a green run on a hosted runner. Two more scenarios are stable now.

The [manage surface's remaining findings](context/plans/app/desktop/ui/navigation/manage-surface.md) — a filter over the tree, a degraded state, alignment findings, an idle lock that discards a live selection — are audited, framed, and ready if the journey work stalls.

## Read these, in this order

1. **[AGENTS.md](AGENTS.md)** then **[docs/plans/AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md)** — the entry manual. Not optional; it routes you to everything else and to the close-out you must run.
2. **[docs/plans/JOURNEYS.md](docs/plans/JOURNEYS.md)** — the manual for this axis, before touching a journey document.
3. **[context/plans/app/desktop/MEMORY.md](context/plans/app/desktop/MEMORY.md)** — four entries you will otherwise fall into, two of them from this session: why the harness installs that page global, why all typing goes through one helper that asserts what landed, and why `Repositories` is a heading only at the top altitude.
4. **[docs/RUNNING.md](docs/RUNNING.md)** — before you build or launch anything. Its traps produce failures that look like app defects and are not.
5. **[context/plans/app/desktop/journey-harness.md](context/plans/app/desktop/journey-harness.md)** — the harness's design and what remains undriven.
6. **[FOR-JORIS.md](FOR-JORIS.md)** — questions waiting on the product owner. Do not duplicate them.

## Binding constraints — do not design around these

- **A journey is satisfied only by driving the real application.** Unit tests are not accepted as a substitute.
- **Type through the helper.** `e2e/journeys/typing.ts` — `typeInto` and `enterPassphrase`. Never `browser.keys` for text; it drops spaces. Every field asserts what landed, and those assertions are load-bearing, not decoration.
- **Assert what the surface shows at that altitude.** `Repositories` is an `<h1>` only on the top-level screen; elsewhere it is a breadcrumb button.
- **The bridge must never reach a distributable build.** It rides an `e2e` cargo feature whose capability grant lives in a separate directory the build script includes only with that feature, and CI proves the shipped binary free of it by scanning. That property survives whatever you do.
- **Never run two drives at the same time.** They contend for the bridge port. A scenario that relaunches the application can also leave a process behind: if a run fails at the very first wait, check `pgrep -f 'target/release/seal-desktop'` before believing the failure is real.\n- **Restarting the app in a scenario means killing the process.** `browser.reloadSession()` reconnects the driver to the *same* process — measured, same PID, still unlocked — so it demonstrates nothing about surviving a crash.
- **A real window opens and operates itself.** Do not touch it, and do not assume a failure is real until you have re-run it once cleanly.
- **A bug fix reproduces before it fixes** — and the reproduction must reach a *mechanism*, not just a red run. See the correction above.
- **Every load-bearing guard is confirmed non-vacuous** — break it deliberately, watch the matching test fail, restore it. The password-change step was proven this way: drop the sentinel from the rotation's manifest and it fails.
- **Code carries no comments and no docstrings.** Explanation lives in the plans.

## Traps this repository has actually fallen into

- **A stale `dist/`.** The frontend is embedded at compile time; a change reaches a real build only by rebuilding both, in order. `bun run e2e:build` does it correctly.
- **A blank window.** A hand-built binary without `--features custom-protocol` loads a dev-server URL and shows nothing.
- **A bridge-less harness binary.** Any plain `cargo build --release` overwrites the harness binary with one that has no bridge. Check: `strings target/release/seal-desktop | grep -ci webdriver` — zero means no bridge.
- **Casing across the boundary.** A serde casing mismatch once made every field arrive `undefined` in the webview. Both unit suites passed throughout; only the driven application caught it.
- **Two lockfiles.** `bun.lock` is the only lockfile for the application. (The site under `site/` has its own, deliberately.)

## What this session did not do

- **No new staging** for `protect-a-repo` step 7, `use-a-secret` steps 6–8, or `living-with-it`.
- **The missing `__wdio_original_core__` global was not reported upstream.** It is a genuine defect in the published `@wdio/tauri-service`, and the `before` hook can be dropped once it is fixed.
- **The CI workflow still has no green run on a hosted runner**, and still gates on `first-run` only. Two more scenarios are stable now, so widening it is worth doing.
- **The manage surface's findings** are untouched.
- **A per-file progress display was not built.** The manifest is now per-file accurate on disk, so an unfinished run reports correctly on the next launch; what is missing is a live view *during* a long run, which only matters once a user has many files. Recorded as the open thread on `password-change.md`.
- **`titlebar.rs` has two pre-existing clippy failures** (`expect()` on an `Option`, in the test module) that predate this session and are unrelated to it. Left alone deliberately — see the note at the end.

## Before you finish

Run the close-out in [AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md). Briefly: targeted checks pass, commit code and prose, **then** stamp coverage (the order is enforced — the stamp records `HEAD`), then confirm `uv run run_coverage --all --verbose` reports no drift and no `DRIFT.md` exists.

Then update the journey documents. A journey's **Demonstration** records exactly what was witnessed and what was not, and its **Findings** stay open until every finding is closed. *"Driven through step 6 of 7"* is useful; *"mostly working"* is not.

Update the cursor at [context/plans/app/README.md](context/plans/app/README.md) and at [context/journeys/README.md](context/journeys/README.md) so the next agent inherits the truth rather than an impression.

## One loose end, waiting on the product owner

A working-tree change to `src-tauri/src/titlebar.rs` was found at the start of this session and **stashed, not committed** — `git stash list` shows it as *"stray unsafe-removal in titlebar.rs"*. It removes seven `unsafe` blocks that the current `objc2` version no longer requires; it compiles, and it clears seven build warnings. It was set aside rather than folded in because it is unrelated to the journey work and nobody in this session wrote it.

`titlebar.rs` also carries two pre-existing clippy failures (`expect()` on an `Option`, in its test module) that are present at `HEAD` independently of that stash.

Neither is urgent. Both want a decision rather than a guess: apply the stash and fix clippy as one small tidy-up, or drop it.
