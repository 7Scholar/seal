# Handoff — fix the password change before anything else

> **You are picking this up cold.** Read this, then read what it points you at, then go and drive the real application. Do not start writing code on the strength of this document alone — it tells you what is wrong and what is binding, not what to build.

## Why this task and not another

Because the product can currently lock a user out of every file they own, and that outranks everything else in the repository.

The harness that drives the application used to stop partway through, which is why nobody had ever watched the master-password change happen. That blockage is gone. The first drive that reached the rotation found this:

**A master-password change leaves the vault openable by neither the old password nor the new one.**

Not a cosmetic failure, not a flaky assertion. After the change, unlocking with the old password is refused and unlocking with the new password is refused — verified afterwards by relaunching the application against the run's home directory and trying both. On a real installation that is permanent loss of every protected file, which is precisely the catastrophe the whole product exists to prevent.

It is framed at [context/plans/app/desktop/ui/password-change.md](context/plans/app/desktop/ui/password-change.md), under **What is missing**, with everything already established about it. That plan is no longer `[x]`.

## What is already known about it, so you do not repeat the work

- **The commands are not straightforwardly broken.** Driving `rekey_begin` then `rekey_run` directly, over the same staged state the scenario builds — establish, manage, seal, open, save, lock, unlock, re-seal from the exposure alert — converts every entry, sentinel included. Twice.
- **The flow works through the interface when driven on its own.** Reaching the change screen manually, filling the four fields, and submitting completes: *"Re-encrypting. Do not quit."* then the repositories view, with the ledger cleared.
- **The fields are not mistyped.** The scenario asserts each field's value after typing, and those assertions pass. The text reaching `#current` is exactly the current password.
- **The failure is total, not partial.** Every manifest entry fails `WrongPassphrase`, the sentinel first — and the same session unlocked with that same password moments earlier in the same run. That contradiction is the thing to chase.
- **What separates the failing path from the passing one is not isolated.** That is the open question, and it is the work.

Start by reproducing it — `bun run e2e:extended`, watch the ninth step. [INSTRUCTIONS.md](docs/plans/INSTRUCTIONS.md) is emphatic that a fix on an unreproduced bug is unfalsifiable, and this is not a bug to guess at.

## What is no longer in your way

**The harness freeze is resolved, and it was never in the application.** The client (`@wdio/tauri-service`) runs a focus check before every `$`, `$$`, `findElement`, `findElements` and `elementClick`. That check reads `window.__wdio_original_core__` — a page global the package reads in three places and **assigns nowhere**. Absent it, the wrapper polls for five seconds and throws, so every element command cost five seconds and scenario waits expired against a page that had been ready the whole time. Because *where* a run ran out of time moved with timing, it looked like a wandering freeze in the app; the main thread was idle because there was genuinely nothing wrong with it.

The runner's `before` hook now binds that global to the webview's own IPC invoke. `first-run` went from minutes and a mid-run wedge to **eight of eight in 2.2 seconds, green three consecutive times**. `return-and-use` drives **eight of its nine steps**.

Report the missing global upstream if you have the appetite — it is a genuine defect in the published package, and the hook can be dropped once it is fixed. That is listed as a step in [the harness plan](context/plans/app/desktop/journey-harness.md).

## Where the journeys stand

**Two of six satisfied.** [first-run.md](context/journeys/first-run.md) as before, and now [exposure.md](context/journeys/exposure.md) — the highest-value journey in the set, witnessed for the first time: the alert that finds the user without being sought, the rotate instruction *with its reason*, the fix sitting on the exposure itself, the recency warning, and the file armored on disk afterwards. No open findings.

[change-the-password.md](context/journeys/change-the-password.md) is **reached and failing** on the defect above. Note its own requirement: satisfying it needs an **interrupted run** — kill the application partway through the rotation and reopen it — because resumability is the property that matters most. That is blocked behind the clean run working at all.

[protect-a-repo.md](context/journeys/protect-a-repo.md) (6 of 7) and [use-a-secret.md](context/journeys/use-a-secret.md) (5 of 8) stop where they do because **no scenario stages their remaining steps**, not because anything blocks them. Writing that staging is now cheap — runs take seconds rather than minutes. [living-with-it.md](context/journeys/living-with-it.md) has never been driven; read it before assuming it resembles the others.

## Read these, in this order

1. **[AGENTS.md](AGENTS.md)** then **[docs/plans/AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md)** — the entry manual. Not optional; it routes you to everything else and to the close-out you must run.
2. **[context/plans/app/desktop/ui/password-change.md](context/plans/app/desktop/ui/password-change.md)** — the defect. **Start here.**
3. **[docs/plans/JOURNEYS.md](docs/plans/JOURNEYS.md)** — the manual for this axis, before touching a journey document.
4. **[docs/RUNNING.md](docs/RUNNING.md)** — before you build or launch anything. The traps in it produce failures that look like app defects and are not.
5. **[context/plans/app/desktop/MEMORY.md](context/plans/app/desktop/MEMORY.md)** — two new entries you will otherwise fall into: why the harness installs that global, and why every field assertion is there.
6. **[FOR-JORIS.md](FOR-JORIS.md)** — questions already waiting on the product owner. Do not duplicate them. Item 9 tells him not to change his password until this is fixed.

## Binding constraints — do not design around these

- **A journey is satisfied only by driving the real application.** Unit tests are explicitly not accepted as a substitute. This defect is the argument: every test at both layers passed straight through it.
- **The bridge must never reach a distributable build.** It rides an `e2e` cargo feature whose capability grant lives in a separate directory the build script includes only when that feature is on, and continuous integration proves the shipped binary free of it by scanning. Whatever you do, that property survives and the check stays non-vacuous.
- **Never run two drives at the same time.** They contend for the bridge port and you will chase a ghost.
- **A real window opens and operates itself.** Do not touch it, do not close it, and do not assume a failure is real until you have re-run it once cleanly.
- **Typing into a field is asserted, always.** Three different mechanisms fail three different ways — see the `MEMORY.md` entry. Without the assertions, a typing failure surfaces several steps later as a wrong password or a dead button and gets diagnosed as a product defect.
- **Code carries no comments and no docstrings.** Explanation lives in the plans.
- **Every load-bearing guard is confirmed non-vacuous** — break it deliberately, watch the matching test fail, restore it. [CONTRIBUTING.md](CONTRIBUTING.md) states the reason: tests here have passed with the code they guarded entirely removed.

## Traps this repository has actually fallen into

- **A stale `dist/`.** The frontend is embedded at compile time; a frontend change reaches a real build only by rebuilding both, in order. `bun run e2e:build` does it correctly.
- **A blank window.** A hand-built binary without `--features custom-protocol` loads a dev-server URL and shows nothing, with empty stderr.
- **A bridge-less harness binary.** Any plain `cargo build --release` silently overwrites the harness binary with one that has no bridge. Sanity check: `strings target/release/seal-desktop | grep -ci webdriver` — zero means no bridge.
- **Casing across the boundary.** A serde casing mismatch once made every field arrive `undefined` in the webview. Both sides' unit suites passed the whole time. Only the driven application revealed it.
- **Two lockfiles.** `bun.lock` is the only lockfile for the application. (The site under `site/` has its own, deliberately.)

## Decisions that are yours, and decisions that are not

**Yours** — make them, record them in the plan, and move on: how to fix the password-change defect; whether a journey needs new staging and what it looks like; whether a finding is a defect to fix now or a framed plan for later.

**Not yours** — these go in [FOR-JORIS.md](FOR-JORIS.md) or the relevant `QUESTIONS.md`, and you keep working on something else: anything that changes what the product *promises*; anything needing an account, a payment, a repository setting, or a signing identity; a design fork where two directions are both defensible.

**The distinction that matters:** if the product does not do what a journey says it does, that is a defect and fixing it is your job. If the product does something coherent the journey did not anticipate, that is a question about intent and it is not.

## What this session did not do

Said plainly, because an unstarted thing reported as unstarted is a working plan system:

- **The password-change defect is found and framed, not fixed.** No attempt was made to fix it — it was found late, and a fix on a bug this severe without a reproduction and a diagnosis would be exactly the unfalsifiable change the manual forbids.
- **The interrupted password-change run was never driven.**
- **No new staging was written** for `protect-a-repo` step 7, `use-a-secret` steps 6–8, or `living-with-it` at all.
- **The missing global was not reported upstream.**
- **The manage surface's remaining findings** — a filter over the tree, a degraded state, alignment findings, an idle lock that discards a live selection — are untouched, listed under *What is missing* in [manage-surface.md](context/plans/app/desktop/ui/navigation/manage-surface.md). They remain the best fallback if the journey work stalls.

## Before you finish

Run the close-out in [AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md). Briefly: targeted checks pass, commit code and prose, **then** stamp coverage (the order is enforced — the stamp records `HEAD`), then confirm `uv run run_coverage --all --verbose` reports no drift and no `DRIFT.md` exists.

Then update the journey documents. A journey's **Demonstration** records exactly what was witnessed and what was not, and its **Findings** stay open until every finding is closed. *"Driven through step 8 of 9"* is a useful statement; *"mostly working"* is not.

Update the cursor at [context/plans/app/README.md](context/plans/app/README.md) and at [context/journeys/README.md](context/journeys/README.md) so the next agent inherits the truth rather than an impression.
