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

**The harness is healthy and fast.** `first-run` drives 8/8 in about two seconds. `return-and-use` drives **all nine steps**, green across two consecutive runs. The five-second-per-command tax that used to make runs look frozen is gone (the client reads a page global, `window.__wdio_original_core__`, that it never assigns; the runner's `before` hook installs it).

**Journeys: two of six satisfied.**

- [first-run.md](context/journeys/first-run.md) — satisfied.
- [exposure.md](context/journeys/exposure.md) — satisfied. The alert that finds the user, the rotate instruction with its reason, the fix beside the problem, the recency warning, the file armored on disk.
- [change-the-password.md](context/journeys/change-the-password.md) — **clean run green, and non-vacuity proven.** Unsatisfied only because its own requirement, an **interrupted** run, has never been driven.
- [protect-a-repo.md](context/journeys/protect-a-repo.md) — 6 of 7. Step 7 (rescanning a known repository, and a second repository) is unstaged.
- [use-a-secret.md](context/journeys/use-a-secret.md) — 5 of 8. Steps 6–8 (a non-env file's no-editor treatment, the command-line resolve, plaintext expiry) are unstaged.
- [living-with-it.md](context/journeys/living-with-it.md) — **never driven.** Read it before assuming it resembles the others; it is about trust over time and may need staging nobody has built.

## What to pick up, in the order I would pick it

Runs now take seconds rather than minutes, so staging new scenarios is cheap in a way it has never been before.

1. **The interrupted password change.** [change-the-password.md](context/journeys/change-the-password.md) requires it in as many words: kill the application partway through the rotation, reopen it, and show that it resumes and reports honestly which files sit on which password. The durable manifest exists precisely for this and has never been driven. Satisfying it takes the journeys to three of six.
2. **`use-a-secret` steps 6–8 and `protect-a-repo` step 7.** Ordinary staging work against a harness that now behaves.
3. **`living-with-it`.** Read first, then decide what it needs.

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
- **Never run two drives at the same time.** They contend for the bridge port.
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

- **The interrupted password-change run** — not driven. It is the top item above.
- **No new staging** for `protect-a-repo` step 7, `use-a-secret` steps 6–8, or `living-with-it`.
- **The missing `__wdio_original_core__` global was not reported upstream.** It is a genuine defect in the published `@wdio/tauri-service`, and the `before` hook can be dropped once it is fixed.
- **The CI workflow still has no green run on a hosted runner**, and still gates on `first-run` only. Now that `return-and-use` is green, widening the gate is worth considering.
- **The manage surface's findings** are untouched.

## Before you finish

Run the close-out in [AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md). Briefly: targeted checks pass, commit code and prose, **then** stamp coverage (the order is enforced — the stamp records `HEAD`), then confirm `uv run run_coverage --all --verbose` reports no drift and no `DRIFT.md` exists.

Then update the journey documents. A journey's **Demonstration** records exactly what was witnessed and what was not, and its **Findings** stay open until every finding is closed. *"Driven through step 6 of 7"* is useful; *"mostly working"* is not.

Update the cursor at [context/plans/app/README.md](context/plans/app/README.md) and at [context/journeys/README.md](context/journeys/README.md) so the next agent inherits the truth rather than an impression.
