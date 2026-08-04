# Handoff — the repo import (manage) surface, then the journeys axis

> **You are picking this up cold.** Read this, then read what it points you at, then go and drive the real application. Do not start writing code on the strength of this document alone — it tells you where things stand and what is binding, not what to build.

## Read this first: the lesson this axis keeps re-teaching

A previous session recorded, in six places across the tree, that **a master-password change left the vault openable by neither password** — framed as the most serious defect the journeys axis had ever found. **It was not a product defect.** The harness had been typing passwords with `browser.keys([...text])`, which silently drops the spaces. Walking that back cost a whole session.

Both sessions since have found defects that **were** real, and both only after measuring a mechanism rather than trusting what the screen implied.

- **A driven failure is evidence about the whole system, harness included.** It is not proof of a product defect.
- **Diagnose to a mechanism before writing a finding down.** A finding you can state as *"X is written only at Y, so Z"* is real; *"the screen looked wrong"* is not yet.

This session's own instance: the `living-with-it` run failed five of nine checks on its first drive. Two of those were the product, one was a harness selector, and two were **my own test asserting a surface that does not exist** — which turned out to be the most valuable finding of the session, but only after being diagnosed rather than filed as a bug.

## Git: work on `main`, and do not create a branch

**This repository has no origin and has never been published.** Every branch has been merged into `main` and deleted; `main` is the only branch and it holds everything.

**Work directly on `main` and commit there.** Do not branch. A branch exists to become a pull request, and with no remote there is no push, no PR and no merge — so a branch only hides your work from the next session, which reads `main`. The manuals have been updated to say so ([GIT_WORKFLOW.md](docs/plans/GIT_WORKFLOW.md) owns the rule under **While this repository has no remote**; [INSTRUCTIONS.md](docs/plans/INSTRUCTIONS.md) and [UI_IMPROVEMENTS.md](docs/plans/UI_IMPROVEMENTS.md) defer to it). **If you find any remaining instruction telling you to branch off `main` or hand a branch off, it is superseded — ignore it.**

Everything else about landing is unchanged and matters more, not less: code and prose commit first, **coverage stamps last as its own final commit**, and the detector must report no drift before you stop. **Still never push** — there is nowhere to push to, and adding a remote is the product owner's call, not a step you take to satisfy an instruction.

One caution the branchless workflow trades for: **run one task at a time.** Concurrent tasks used to collide loudly on a shared `coverage.json` at merge time. On `main` there is no merge, so nothing flags it — two sessions just interleave.

## Where things stand

Everything is committed on **`main`**. The working tree is clean and there is no remote.

**The harness is healthy and fast. Five specs, all green:** `first-run` 8/8 (~2s), `return-and-use` 9/9 (~13s), `interrupted-rekey` 5/5 (~16s), `living-with-it` 6/6 (~18s), and `window-frame` 4/4 (~1s). `bun run e2e:living` and `bun run e2e:frame` run the last two.

**`window-frame` is not a journey** — it drives the window *as a window* (drag region present, surfaces below the traffic lights, the manage tree scrolling rather than the document). It exists because all four journeys passed while three surfaces had no title bar at all: a journey asks whether a task completes, and the tasks completed.

**Journeys: three of six satisfied.**

- [first-run.md](context/journeys/first-run.md) — satisfied.
- [exposure.md](context/journeys/exposure.md) — satisfied.
- [change-the-password.md](context/journeys/change-the-password.md) — satisfied, clean and interrupted runs both driven.
- [protect-a-repo.md](context/journeys/protect-a-repo.md) — 6 of 7. Step 7 unstaged.
- [use-a-secret.md](context/journeys/use-a-secret.md) — 5 of 8. Steps 6 and 7 unstaged; **step 8 is blocked, not unstaged** (see below).
- [living-with-it.md](context/journeys/living-with-it.md) — **driven, not satisfied.** Findings below.

## What the last session did

**Drove `living-with-it` for the first time.** It behaved exactly as [JOURNEYS.md](docs/plans/JOURNEYS.md) predicts a journey about accumulated texture would: it produced one defect and **two missing concerns**, which that manual calls the most valuable output of the axis.

**The defect, fixed.** `app::overview` computed a reconciliation, used it **only** to derive the exposure flag, and then served `file.last_known` for the state itself. So a managed file deleted outside Seal read as `Sealed` with a **live open control**, and any file sealed or unsealed outside Seal reported whatever it had last been. The registry library was correct throughout — its own suite proves a missing file is reported without alarm — and every Rust and interface suite passed while the driven application showed the wrong state. The overview now serves the observed state, falling back to the recorded one only where reconciliation said nothing. Non-vacuity confirmed both ways. `commands.md` owns it; `desktop/MEMORY.md` records why it must not be "simplified" back.

**The two missing concerns, framed and blocked.** Both are in [freshness.md](context/plans/app/desktop/ui/navigation/freshness.md), with forks in its [QUESTIONS.md](context/plans/app/desktop/ui/navigation/QUESTIONS.md). **Do not answer them yourself.**

1. **The interface re-reads disk only when the session unlocks.** No timer, no refetch on window focus. A file deleted or exposed while the window sits open goes unnoticed indefinitely. This delays the exposure alert too, since it comes from the same fetch — and it is why the fixed defect above needed a lock/unlock to become visible.
2. **Nothing states that everything is protected.** The product only ever draws attention to what is *wrong*; the healthy answer exists solely as the absence of warnings spread across every tile. `living-with-it` step 3 asks for an answer in a second without reading, and today that means reading every tile and inferring safety from silence.

They are one node because an assurance computed from a stale read is worse than no assurance.

## The repo import surface — done, and what it taught

**All four of the product owner's items are fixed and driven.** They were: the missing always-present header, the title/subtitle pinned at top, Cancel/Manage files pinned at bottom, and *"Remove 'an environment file', that's so useless."* Recorded in [manage-surface.md](context/plans/app/desktop/ui/navigation/manage-surface.md) and [the navigation README](context/plans/app/desktop/ui/navigation/README.md), which own the measurements.

Items 1–3 were one defect: `App.tsx` had three early returns rendering outside `.shell` — the only element drawing the title bar **and** the only one setting `100vh`. The shell is now unconditional and every surface renders as its content; the locked screen and the two overlays get a **bare** strip (transparent, no divider, drag region intact), with the unlock shield's gradient moved onto the shell so it reaches behind it.

**The measurement worth carrying forward, because the earlier handoff got it half right.** The previous session recorded `.manage` at 2630px in a shorter viewport and framed the fault as "the surface is too tall". It is not. `height: 100%` against an auto-height ancestor resolves to **the content's own height**, so the same defect measured **322px in a 720px viewport** against a small repository. Two opposite symptoms, one cause — and a fix validated only against a tall tree would have looked correct while the frame was still broken. If you ever re-measure a height chain, do it at two content sizes.

Item 4 was narrower than "remove the string". Every *other* scan reason names a category the filename does not — `id_ed25519` → "a private key". Only `an environment file` restated its own row. The classifier now returns no reason where the name is the reason; the boundary and tree already accepted a null one. **Nothing had ever asserted a scan reason** — the classification test discarded it and matched only confidence — which is why the most repeated string on the surface was uncovered. It is guarded in both directions now.

`manage-surface.md`'s "What exists" is honest again, and its two frame steps are `[x]`.

## What to do next

**If the product owner has answered [QUESTIONS.md](context/plans/app/desktop/ui/navigation/QUESTIONS.md), build `freshness.md`** — the largest open concern, and the one the product's finish is most visibly decided by. It was still unanswered as of this session, so it stayed blocked.

**Otherwise, the journeys work, in this order:**

1. **`use-a-secret` step 8 / `living-with-it` step 5 — plaintext expiry.** Driving it once serves both journeys. **It is blocked on a seam, not on a scenario:** the fifteen-minute lifetime is hard-coded through `Session::new` (`crates/seal-session/src/lib.rs`), so nothing a run finishing in seconds can set makes a held secret expire. It needs a lifetime override honoured **only** in `e2e`-feature builds, of the same shape as the existing folder-pick override — which is a change to the command surface, so frame it on [commands.md](context/plans/app/desktop/commands.md) first. Recorded on [journey-harness.md](context/plans/app/desktop/journey-harness.md). Note what is *already known* about the mechanism: expiry is checked on access, and a background sweep runs every 30s, so nothing pushes anything to the interface — the user learns a secret expired only from a `notOpen` error on their next action. Whether that is acceptable is exactly what step 5 asks.
2. **`use-a-secret` step 7, the command-line resolve.** Drives the **CLI binary**, not the desktop app, so it needs a different harness shape. Design work, not just staging.
3. **`use-a-secret` step 6 and `protect-a-repo` step 7.** Straightforward.
4. **`living-with-it` step 8, the bad day.** Only partly walked. The irreversible acts are correctly ceremonious and Rust-enforced; nobody has systematically checked the *other* direction — that routine reversible actions are free of ceremony.
5. **[The manage surface's remaining findings](context/plans/app/desktop/ui/navigation/manage-surface.md)** — the filter over the tree, plus the remaining audit findings.

## Read these, in this order

1. **[AGENTS.md](AGENTS.md)** then **[docs/plans/AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md)** — the entry manual and the close-out you must run.
2. **[docs/plans/JOURNEYS.md](docs/plans/JOURNEYS.md)** — before touching a journey document.
3. **[docs/plans/INTAKE.md](docs/plans/INTAKE.md)** — this journey surfaces unplaced concerns; expect to need it.
4. **[context/plans/app/desktop/MEMORY.md](context/plans/app/desktop/MEMORY.md)** — the entries you will otherwise fall into, one of them new: why the overview serves reconciled state.
5. **[docs/RUNNING.md](docs/RUNNING.md)** — before you build or launch anything.
6. **[context/plans/app/desktop/journey-harness.md](context/plans/app/desktop/journey-harness.md)** — the harness's design and what remains undriven.
7. **[FOR-JORIS.md](FOR-JORIS.md)** — questions waiting on the product owner. Do not duplicate them.

## Binding constraints — do not design around these

- **A journey is satisfied only by driving the real application.** Unit tests are not accepted as a substitute.
- **Type through the helper.** `e2e/journeys/typing.ts` — `typeInto` and `enterPassphrase`. Never `browser.keys` for text; it drops spaces. Every field asserts what landed.
- **Restarting the app means killing the process.** `browser.reloadSession()` reconnects the driver to the *same* process — measured, same PID, still unlocked.
- **`pgrep`/`pkill` need the sandbox disabled.** Every scenario that kills or relaunches uses them, so e2e runs need `dangerouslyDisableSandbox`. A sandboxed `pgrep` fails with "Cannot get process list", which looks like nothing is running when something is.
- **Never run two drives at the same time**, and **check for a leftover process before believing a failure**: `pgrep -f 'target/release/seal-desktop'`. A scenario that relaunches the app leaves one behind on failure — this bit twice this session, once presenting as a `before`-hook failure that had nothing to do with the code.
- **Assert what the surface shows at that altitude.** `Repositories` is an `<h1>` only on the top-level screen.
- **The bridge must never reach a distributable build.** It rides an `e2e` cargo feature whose capability grant lives in a separate directory the build script includes only with that feature.
- **A real window opens and operates itself.** Do not touch it, and do not assume a failure is real until you have re-run it once cleanly.
- **A bug fix reproduces before it fixes** — and the reproduction must reach a *mechanism*, not just a red run.
- **Every load-bearing guard is confirmed non-vacuous** — break it deliberately, watch the matching test fail, restore it.
- **Never put a plan question to the user directly.** It goes in `QUESTIONS.md` and that line of work stops. Delete the file once it is empty.
- **Code carries no comments and no docstrings.** Explanation lives in the plans.
- **You commit on `main` and stop.** No branch, no push — see the git section at the top.

## Traps this repository has actually fallen into

- **A stale `dist/`.** The frontend is embedded at compile time; `bun run e2e:build` rebuilds both in order.
- **A blank window.** A hand-built binary without `--features custom-protocol` loads a dev-server URL.
- **A bridge-less harness binary.** Any plain `cargo build --release` overwrites it — and so does **`cargo test --workspace`**, which bit this session: the close-out's own test run silently replaced the harness binary, and the next drive failed with "Embedded WebDriver server did not become ready", which reads like a hang in the app. Check: `strings target/release/seal-desktop | grep -ci webdriver` — zero means no bridge, then `bun run e2e:build`. **Order matters: run the Rust suite before the scenarios, not between them.**
- **Back-to-back scenario runs contend.** Running all four in one shell without a pause failed `interrupted-rekey` once; it passed 5/5 immediately on a clean re-run. Pause and `pkill` between scenarios before believing a failure.
- **Casing across the boundary.** A serde casing mismatch once made every field arrive `undefined`. Both unit suites passed throughout.
- **A correct library with a consumer that discards its answer.** This session's defect. Both sides' tests pass because each is right about its own contract; only the driven application sees it.
- **A timing-dependent unit test.** One that polled a file from a thread passed alone and failed under parallel load. It was deleted rather than stabilised. Do not re-add that shape.
- **Two lockfiles.** `bun.lock` is the only lockfile for the application. (The site under `site/` has its own, deliberately.)

## Still open, unchanged from the last handoff

- **The missing `__wdio_original_core__` global was not reported upstream.** A genuine defect in the published `@wdio/tauri-service`; the runner's `before` hook can be dropped once fixed.
- **The CI workflow still has no green run on a hosted runner**, and still gates on `first-run` only. Five specs are stable now, so widening it is worth doing — though with no remote there is nothing running CI, which makes this lower value until the repo lands somewhere.
- **No per-file progress display** during a long rekey run. The manifest is per-file accurate on disk; a live view is missing. Recorded on `password-change.md`.
- **A stashed `titlebar.rs` change.** `git stash list` shows *"stray unsafe-removal in titlebar.rs"* — removes seven `unsafe` blocks the current `objc2` no longer requires, compiles, clears seven build warnings. Found in the working tree by an earlier session that had not written it.
- **Two pre-existing clippy failures in that same file** (`expect()` on an `Option`, in its test module), present at `HEAD` independently of the stash.

Neither of the last two is yours to decide unilaterally. If you are touching `titlebar.rs` anyway, raise them together.

## Before you finish

Run the close-out in [AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md): targeted checks pass, commit code and prose, **then** stamp coverage (the order is enforced — the stamp records `HEAD`), then confirm `uv run run_coverage --all --verbose` reports no drift and no `DRIFT.md` exists. Note that `package.json` is covered by two plans (`desktop/ui/shell.md` and `publishing/tooling.md`), so adding an npm script drifts both.

Then update the journey documents. A journey's **Demonstration** records exactly what was witnessed and what was not, and its **Findings** stay open until every finding is closed. Update the cursor at [context/plans/app/README.md](context/plans/app/README.md) and at [context/journeys/README.md](context/journeys/README.md).
