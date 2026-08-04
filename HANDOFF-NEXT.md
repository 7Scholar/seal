# Handoff — finish the journeys axis, starting with `living-with-it`

> **You are picking this up cold.** Read this, then read what it points you at, then go and drive the real application. Do not start writing code on the strength of this document alone — it tells you where things stand and what is binding, not what to build.

## Read this first: the lesson this axis keeps re-teaching

A previous session recorded, in six places across the tree, that **a master-password change left the vault openable by neither password** — framed as the most serious defect the journeys axis had ever found, and flagged to the product owner as "do not change your password."

**It was not a product defect.** The harness had been typing passwords with `browser.keys([...text])`, which silently drops the spaces, so the vault was established under a password nobody intended. Walking that back cost a whole session.

The session after it drove the *interrupted* password change and found a defect that **was** real — but only after measuring the manifest on disk before and after the kill, rather than trusting what the screen implied.

Both point the same way:

- **A driven failure is evidence about the whole system, harness included.** It is not proof of a product defect.
- **Diagnose to a mechanism before writing a finding down.** A wrong finding in the tree gets propagated to parents, journeys and the owner, and every one has to be walked back. A finding you can state as *"X is written only at Y, so Z"* is real; *"the screen looked wrong"* is not yet.

## Where things stand

`main` carries everything below; there is no remote, so nothing has been pushed anywhere. The three most recent commits are this handoff, the deletion of a consumed question sheet, and the interrupted-rotation work described below.

**The harness is healthy and fast.** Three scenarios, all green on the last run: `first-run` 8/8 in about two seconds, `return-and-use` 9/9, `interrupted-rekey` 5/5 in about fifteen seconds.

**Journeys: three of six satisfied.**

- [first-run.md](context/journeys/first-run.md) — satisfied.
- [exposure.md](context/journeys/exposure.md) — satisfied.
- [change-the-password.md](context/journeys/change-the-password.md) — **satisfied**, clean run and interrupted run both driven.
- [protect-a-repo.md](context/journeys/protect-a-repo.md) — 6 of 7. Step 7 (rescanning a known repository, and adding a second repository) is unstaged.
- [use-a-secret.md](context/journeys/use-a-secret.md) — 5 of 8. Steps 6–8 (a non-env file's no-editor treatment, the command-line resolve, plaintext expiry) are unstaged.
- [living-with-it.md](context/journeys/living-with-it.md) — **never driven.** Fragments of its skeleton are exercised by other scenarios; the texture it is actually about is untouched.

**What the last session found.** Driving the interrupted rotation showed the durable manifest was written only from the engine's final report, so it read all-pending for the whole time a run was working: a force-quit left it recording *0 of 7 converted* while a file on disk had already moved to the new password, and the resume screen then asked for the old password on a file that no longer needed it. It now persists per file. **Recovery was never broken** — the engine tries the new passphrase before the old — so what was wrong was the report, not the data. That is also why the Rust suite missed it: its interruption tests hand-write the manifest instead of interrupting a real run.

## What to do: carve and implement `living-with-it`

**This is your task.** It is the largest genuinely-unstarted concern left, and it is the one the product's finish is actually decided by.

### Why this one

The other two unsatisfied journeys are *staging* work — the surfaces exist and nobody has driven them. `living-with-it` is different in kind: read it and you will see it is **not a feature list**. It is about the second week, when the novelty is gone. Its own words: *"it is all the accumulated texture of using something repeatedly — and it is where 'feels like an unfinished side project' is actually decided."*

That means it will almost certainly surface **missing concerns rather than defects**, which [JOURNEYS.md](docs/plans/JOURNEYS.md) calls the most valuable output of the axis and tells you to expect. A missing concern is large by definition, so intake's rules apply in full — frame it as a folder, raise its design forks in `QUESTIONS.md`, and **do not answer them yourself**.

### How to approach it, in order

1. **Read the journey whole before touching anything.** All eight steps, then the "What good looks like" bar. Reading it a step at a time reproduces exactly the blind spot the axis exists to close.

2. **Drive what can be driven today, and write down what you meet.** Not only what breaks — what is *confusing*, what is slow, what makes you unsure whether something worked. The bar is "feels like a finished product," not "does not crash." Several steps have no staging yet; say so plainly rather than skipping them quietly.

3. **Expect the hard ones to be steps 3, 5, 7 and 8**, and treat them as the real work:
   - **Step 3, the glance.** *"Is everything that should be protected actually protected?"* — answerable in a second, without reading. The product has an exposure alert for when something is wrong; whether it has an at-a-glance answer for the ordinary case where everything is fine is exactly the kind of gap this axis exists to find.
   - **Step 5, stepping away.** Plaintext expires after fifteen minutes (`DEFAULT_LIFETIME` in `crates/seal-session/src/lib.rs`), by a two-clock deadline checked on access. **Nobody has ever driven what the user actually sees when that fires.** Does an open file change under them? Is it explained? This is also `use-a-secret` step 8, so driving it once serves two journeys.
   - **Step 7, something goes wrong.** A file moved, a repository deleted, a disk full — *"explains in their language and suggests what to do, rather than surfacing a fault."* Go and actually delete a managed file, actually remove a repository directory, and see what appears. The error type is deliberately incapable of carrying secret material, which is right, but it may also mean the messages are thin.
   - **Step 8, the bad day.** Irreversible things must be hard; routine reversible things must not be ceremonious. Both failure directions are real, and the second is the one products usually get wrong.

4. **Route every finding through intake**, per [INTAKE.md](docs/plans/INTAKE.md). The journey never fixes code itself. A defect goes to the plan that owns the code; a missing capability becomes a framed plan.

5. **Then build.** Carry one part to full depth before starting the next — [INSTRUCTIONS.md](docs/plans/INSTRUCTIONS.md) is explicit that a request with many parts is many tasks, and that five surfaces each at 20% is the failure mode the tree exists to prevent. A cursor saying *"step 5 is complete to production depth; steps 7 and 8 are framed and untouched"* is a **better** outcome than all of it thin. You have long autonomous runs; spend them on depth, not on breadth.

### If it stalls

Fall back to the staging work, in this order — it is ordinary and the harness behaves:

1. **`use-a-secret` step 8 (plaintext expiry)** — overlaps `living-with-it` step 5, so it is not really a detour.
2. **`use-a-secret` step 7, the command-line resolve.** Note this drives the **CLI binary**, not the desktop app, so it needs a different harness shape than the three existing scenarios. That is design work, not just staging.
3. **`use-a-secret` step 6 and `protect-a-repo` step 7.** Straightforward.
4. **[The manage surface's remaining findings](context/plans/app/desktop/ui/navigation/manage-surface.md)** — the filter over the tree, plus the remaining audit findings. Audited, framed, ready.

## Read these, in this order

1. **[AGENTS.md](AGENTS.md)** then **[docs/plans/AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md)** — the entry manual. Not optional; it routes you to everything else and to the close-out you must run.
2. **[docs/plans/JOURNEYS.md](docs/plans/JOURNEYS.md)** — the manual for this axis, before touching a journey document.
3. **[docs/plans/INTAKE.md](docs/plans/INTAKE.md)** — you will need it, because this journey is expected to surface unplaced concerns.
4. **[context/plans/app/desktop/MEMORY.md](context/plans/app/desktop/MEMORY.md)** — the entries you will otherwise fall into, two of them new: why restarting the app means killing the process, and why the rekey manifest is written per file.
5. **[docs/RUNNING.md](docs/RUNNING.md)** — before you build or launch anything. Its traps produce failures that look like app defects and are not.
6. **[context/plans/app/desktop/journey-harness.md](context/plans/app/desktop/journey-harness.md)** — the harness's design and what remains undriven.
7. **[FOR-JORIS.md](FOR-JORIS.md)** — questions waiting on the product owner. Do not duplicate them.

## Binding constraints — do not design around these

- **A journey is satisfied only by driving the real application.** Unit tests are not accepted as a substitute.
- **Type through the helper.** `e2e/journeys/typing.ts` — `typeInto` and `enterPassphrase`. Never `browser.keys` for text; it drops spaces. Every field asserts what landed, and those assertions are load-bearing.
- **Restarting the app means killing the process.** `browser.reloadSession()` reconnects the driver to the *same* process — measured, same PID, still unlocked. `interrupted-rekey.e2e.ts` shows the working shape.
- **Assert what the surface shows at that altitude.** `Repositories` is an `<h1>` only on the top-level screen; elsewhere it is a breadcrumb button.
- **The bridge must never reach a distributable build.** It rides an `e2e` cargo feature whose capability grant lives in a separate directory the build script includes only with that feature, and CI proves the shipped binary free of it by scanning. That property survives whatever you do.
- **Never run two drives at the same time.** They contend for the bridge port. A scenario that relaunches the app can also leave a process behind: if a run fails at the very first wait, check `pgrep -f 'target/release/seal-desktop'` before believing the failure is real.
- **A real window opens and operates itself.** Do not touch it, and do not assume a failure is real until you have re-run it once cleanly.
- **A bug fix reproduces before it fixes** — and the reproduction must reach a *mechanism*, not just a red run.
- **Every load-bearing guard is confirmed non-vacuous** — break it deliberately, watch the matching test fail, restore it.
- **Never put a plan question to the user directly.** It goes in `QUESTIONS.md` and that line of work stops. Delete the file once it is empty — a fully answered, already-consumed sheet was found and removed this session.
- **Code carries no comments and no docstrings.** Explanation lives in the plans.
- **You commit locally and stop.** You do not push and do not open a PR. A previous session merged to `main` only because the owner directed it explicitly and there is no remote; that is not standing permission.

## Traps this repository has actually fallen into

- **A stale `dist/`.** The frontend is embedded at compile time; a change reaches a real build only by rebuilding both, in order. `bun run e2e:build` does it correctly.
- **A blank window.** A hand-built binary without `--features custom-protocol` loads a dev-server URL and shows nothing.
- **A bridge-less harness binary.** Any plain `cargo build --release` overwrites the harness binary with one that has no bridge. Check: `strings target/release/seal-desktop | grep -ci webdriver` — zero means no bridge.
- **Casing across the boundary.** A serde casing mismatch once made every field arrive `undefined` in the webview. Both unit suites passed throughout; only the driven application caught it.
- **A timing-dependent unit test.** A test that polled a file from a thread to catch a mid-run state passed alone and failed under parallel load. It was deleted rather than stabilised, because the driven scenario already proved the same property non-vacuously. Do not re-add that shape.
- **Two lockfiles.** `bun.lock` is the only lockfile for the application. (The site under `site/` has its own, deliberately.)

## What the last session did not do

- **No new staging** for `protect-a-repo` step 7, `use-a-secret` steps 6–8, or `living-with-it`.
- **The missing `__wdio_original_core__` global was not reported upstream.** It is a genuine defect in the published `@wdio/tauri-service`, and the runner's `before` hook can be dropped once it is fixed.
- **The CI workflow still has no green run on a hosted runner**, and still gates on `first-run` only. Three scenarios are stable now, so widening it is worth doing.
- **The manage surface's findings** are untouched.
- **No per-file progress display.** The manifest is per-file accurate on disk, so an unfinished run reports correctly on next launch; a live view *during* a long run is still missing. Recorded as the open thread on `password-change.md`.

## Two loose ends waiting on the product owner

- **A stashed `titlebar.rs` change.** `git stash list` shows *"stray unsafe-removal in titlebar.rs"* — it removes seven `unsafe` blocks the current `objc2` no longer requires, compiles, and clears seven build warnings. It was found in the working tree at the start of a session and set aside because nobody in that session wrote it.
- **Two pre-existing clippy failures in that same file** (`expect()` on an `Option`, in its test module), present at `HEAD` independently of the stash.

Neither is urgent, and neither is yours to decide unilaterally. If you are touching `titlebar.rs` anyway, raise them together.

## Before you finish

Run the close-out in [AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md). Briefly: targeted checks pass, commit code and prose, **then** stamp coverage (the order is enforced — the stamp records `HEAD`), then confirm `uv run run_coverage --all --verbose` reports no drift and no `DRIFT.md` exists.

Then update the journey documents. A journey's **Demonstration** records exactly what was witnessed and what was not, and its **Findings** stay open until every finding is closed. *"Driven through step 6 of 7"* is useful; *"mostly working"* is not.

Update the cursor at [context/plans/app/README.md](context/plans/app/README.md) and at [context/journeys/README.md](context/journeys/README.md) so the next agent inherits the truth rather than an impression.
