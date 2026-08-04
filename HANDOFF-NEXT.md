# Handoff — the journeys axis is satisfied; the depth pass is under way

> **You are picking this up cold.** Read this, then read what it points you at, then go and drive the real application. Do not start writing code on the strength of this document alone — it tells you where things stand and what is binding, not what to build.

## Read this first: the lesson this axis keeps re-teaching

A session once recorded, in six places across the tree, that **a master-password change left the vault openable by neither password** — framed as the most serious defect the journeys axis had ever found. **It was not a product defect.** The harness had been typing passwords with `browser.keys([...text])`, which silently drops the spaces. Walking that back cost a whole session.

- **A driven failure is evidence about the whole system, harness included.** It is not proof of a product defect.
- **Diagnose to a mechanism before writing a finding down.** A finding you can state as *"X is written only at Y, so Z"* is real; *"the screen looked wrong"* is not yet.

The last session hit this three times and it paid off every time. The freshness build failed four driven checks; a probe found the cause was **my own guard**, not the product. A rescan check failed because I asserted `"Readable"` against a row that correctly reads `"Readable — should be sealed"`. And a filter test **passed with the code deleted** — a vacuous guard I only caught by breaking it deliberately. All three would have been misfiled as product defects by a session in a hurry.

## Git: work on `main`, and do not create a branch

**This repository has no origin and has never been published.** `main` is the only branch and it holds everything.

**Work directly on `main` and commit there.** A branch exists to become a pull request, and with no remote there is no push, no PR and no merge — so a branch only hides your work from the next session. [GIT_WORKFLOW.md](docs/plans/GIT_WORKFLOW.md) owns the rule under **While this repository has no remote**. **If you find any instruction telling you to branch off `main`, it is superseded — ignore it.**

Landing is unchanged: code and prose commit first, **coverage stamps last as its own final commit**, and the detector must report no drift before you stop. **Never push.**

**Run one task at a time.** On `main` there is no merge, so nothing flags two sessions interleaving on a shared `coverage.json`.

## Where things stand

Everything is committed on **`main`**. Working tree clean, no drift, no `DRIFT.md`, no stashes. **One `QUESTIONS.md` is live**, under `ui/navigation/` — see above.

### All six journeys are satisfied

This is the axis's own bar for production-ready, and it is the first time the product has met it. Every step of every journey is driven against a release build and every finding is closed.

**Eleven scenario runs, all green — 72 driven checks across 11 specs:**

| Command | Checks | Time |
|---|---|---|
| `bun run e2e` (`first-run`) | 8 | ~2s |
| `bun run e2e:extended` (+ `return-and-use`) | 8 + 9 | ~9s |
| `bun run e2e:interrupted` | 5 | ~16s |
| `bun run e2e:living` | 6 | ~18s |
| `bun run e2e:frame` | 4 | ~1s |
| `bun run e2e:expiry` | 6 | ~13s |
| `bun run e2e:settling` | 8 | ~9s |
| `bun run e2e:deploy` | 7 | ~4s |
| `bun run e2e:badday` | 9 | ~3s |
| `bun run e2e:filter` | 5 | ~1s |
| `bun run e2e:freshness` | 5 | ~17s |

**Two of those are not journeys.** `window-frame` drives the window *as a window*; `manage-filter` drives the filter against a file no journey's fixture buries deeply enough to need. Both exist because their defect class is invisible to a journey asking whether a *task* completes — every journey passed while three surfaces had no title bar at all.

### Two coverage limits, stated rather than glossed

- **The folder picker's second use is not covered.** The seam returns a folder fixed in the application's environment at launch, so a second repository can only be added across the boundary. `desktop/MEMORY.md` records why driving the picker twice cannot work.
- **The title bar's drag has no automated coverage at all.** The harness's synthesized press carries no click count, so the framework's listener refuses it. A person confirms it; the check in place fails whether the drag is broken *or* merely undrivable, so **it must never be read as a pass**.

## There is now an unanswered question waiting on the owner

`context/plans/app/desktop/ui/navigation/QUESTIONS.md` holds **one** question: whether the files list's empty state should be made reachable. **Read it before touching `files.md`** — its step 5 is `[!]` and that line of work is closed until the owner answers. If it is still unanswered when you arrive, do not start it and do not route around it.

## What the last session did

**Carried the files list through the depth pass** — item 1 below, for the middle altitude. Three defects fixed, driven and guarded:

- **The silent disable is gone.** A `missing` file's open control was disabled with nothing said about why. It now states that Seal cannot open it because it is no longer at that path, tied to the control by `aria-describedby`. Measured against a file genuinely deleted from disk while the window sat open — not a fixture.
- **The surface states its managed-file count**, the fact the tile already carried an altitude up.
- **A failed re-read is stated rather than hidden.** This was the one nothing caught. Every operation here re-reads the overview when it finishes, and `refresh()` rethrows on failure *before* `reconcile` runs — so `repos` keeps its previous value and the surface keeps rendering rows it already had, silently, right after the user acted. A notice above the list now says what is below is what Seal last saw and that the files are untouched and still sealed, with a retry. The rows stay visible.

**Two of that surface's states resolved to something other than "build it",** and both are recorded rather than skipped quietly:

- **The empty repository is unreachable.** A repository is dropped when its last file is released (`lifecycle::release`), the manage flow refuses an empty selection, and a rescan only adds. The markup exists and nothing reaches it. That is the question now waiting on the owner.
- **The files list needs no loading state.** Every launch lands on the grid, and both paths that could leave the route at this altitude with nothing loaded navigate back up instead. A skeleton there would guard a state that cannot occur.

Both are in `navigation/MEMORY.md`, because either one costs a session to rediscover.

## What the session before it did

**Answered all five `QUESTIONS.md` items** (the owner answered; I acted) and deleted the file.

**Drove the last three journey steps.** `use-a-secret` step 7 needed the only genuinely different scenario shape: it drives **both binaries**, sealing through the app's interface then running a real shell script against that file with the built `seal`. That seam was structurally unreachable from either side's suite, since every CLI test seals through the engine library.

**Found and fixed a real defect in `living-with-it` step 8.** The same just-modified file **warned** when sealed from its row and was sealed **silently** from the batch control — `seal_warning` was only ever consulted by the single-file path. That warning is the only thing in front of a hazard this tree has reproduced end to end (an editor's unsaved buffer overwriting the sealed file). Fixed as a property of sealing rather than of one control.

**Built `freshness.md`** — the largest open concern. The interface now re-observes on focus and every five seconds while unlocked, re-reading the **registry from disk** rather than the in-memory mirror, and a revealed value re-masks itself when Seal drops the plaintext behind it.

**Built the manage surface's filter**, plus three audit findings (the rescan now says it is a rescan; inert rows stopped lighting up on hover).

**Tidied `titlebar.rs`.** Clippy now passes across the workspace for the first time and the build carries zero warnings.

### Three decisions worth carrying forward

1. **No positive assurance is drawn anywhere.** Asked whether the product should state that everything is protected, the owner answered *nothing — absence is the answer*. `living-with-it` step 3 asks for a one-glance answer the product deliberately does not give. It is recorded there as **closed-as-decided**, not as an outstanding defect. **Do not re-raise it.** If it is ever revisited, the mechanism it would need now exists.
2. **A filesystem watch was refused**, on a measurement rather than a preference: reconciliation is **6ms for 500 managed files, under 1ms for a realistic vault**, while a watch's failure modes (descriptor limits, save-by-rename, network volumes) all end with the product silently ceasing to notice.
3. **The re-observation timer must not guard on `document.hidden`.** A Tauri window behind another window reports itself **hidden**, so that guard — ordinary practice for a poller — disables the feature in exactly the case it exists for. `desktop/MEMORY.md` owns this.

## What to do next

The journeys axis is done. **What remains is the depth pass on `ui/navigation/`**, which is the honest gap between "every journey passes" and "this looks finished". Read [SURFACE_AUDIT.md](docs/plans/SURFACE_AUDIT.md) before starting — this is that axis, not the journeys axis.

In rough order of value:

1. **The states beyond populated**, [states.md](context/plans/app/desktop/ui/navigation/states.md). Done for the repositories grid and now for the files list; **the file surface is still populated-only** — no loading, no surface-level failure, and no treatment for a file with hundreds of variables. `file.md` carries the note. The files list's one remaining item is blocked on the owner's answer above.
2. **The manage surface's last two findings**, [manage-surface.md](context/plans/app/desktop/ui/navigation/manage-surface.md) — the **degraded state** (a partially-walked repository is drawn exactly like a fully-walked one) and the **alignment findings** (names misalign by 1px; the annotation channel has no column, measured starting anywhere between x=190 and x=303).
3. **`breadcrumbs.md`** — the root segment has no switcher, and the chevron is not the referenced icon.
4. **[disclosure-primitive.md](context/plans/app/desktop/ui/navigation/disclosure-primitive.md)** — unstarted. Four collapsed controls each carry the disclosure contract separately.
5. **`publishing/`** — reopened; a hosted documentation site is framed. [FOR-JORIS.md](FOR-JORIS.md) has two items waiting on the owner about it. **Do not duplicate them.**

### One thing that is not mine to decide

**A pre-existing flaky test**, `the_lock_is_released_when_dropped` (`crates/seal-engine/tests/lock.rs:37`). Fails intermittently under full-workspace parallel load; passes 5/5 in isolation. It predates the last several sessions and no session has touched `crates/seal-engine`. This is the exact shape the traps section warns about. **Ask the user** whether to take it on before spending time — it is unrelated drift.

## Read these, in this order

1. **[AGENTS.md](AGENTS.md)** then **[docs/plans/AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md)** — the entry manual and the close-out you must run.
2. **[docs/plans/SURFACE_AUDIT.md](docs/plans/SURFACE_AUDIT.md)** — the axis the remaining work sits on.
3. **[context/plans/app/desktop/MEMORY.md](context/plans/app/desktop/MEMORY.md)** — the entries you will otherwise fall into. Several are new.
4. **[docs/RUNNING.md](docs/RUNNING.md)** — before you build or launch anything.
5. **[docs/plans/JOURNEYS.md](docs/plans/JOURNEYS.md)** — only if you touch a journey. They are all satisfied; **a change that breaks one un-satisfies the product.**
6. **[FOR-JORIS.md](FOR-JORIS.md)** — questions waiting on the owner.

## Binding constraints — do not design around these

- **A journey is satisfied only by driving the real application.** Unit tests are not accepted as a substitute. **All six are satisfied now — re-drive the affected ones before you finish** if you touch anything they cross.
- **Type through the helper.** `e2e/journeys/typing.ts` — `typeInto` and `enterPassphrase`. Never `browser.keys` for text; it drops spaces.
- **Restarting the app means killing the process.** `reloadSession()` reconnects to the *same* process — measured, same PID, still unlocked.
- **`pgrep`/`pkill` need the sandbox disabled**, so e2e runs need `dangerouslyDisableSandbox`.
- **Never run two drives at once**, and **check for a leftover process before believing a failure**: `pgrep -f 'target/release/seal-desktop'`.
- **Assert what the surface shows at that altitude.** `Repositories` is an `<h1>` only on the top-level screen.
- **The bridge must never reach a distributable build.**
- **A real window opens and operates itself.** Do not touch it, and do not assume a failure is real until you have re-run it once cleanly.
- **A bug fix reproduces before it fixes** — and the reproduction must reach a *mechanism*.
- **Every load-bearing guard is confirmed non-vacuous** — break it, watch the matching test fail, restore it. The last session caught one of its own guards passing with the code deleted; assume yours might too.
- **Never put a plan question to the user directly.** It goes in `QUESTIONS.md` and that line of work stops. Delete the file once empty.
- **Code carries no comments and no docstrings.**
- **You commit on `main` and stop.** No branch, no push.

## Traps this repository has actually fallen into

- **A stale `dist/`.** The frontend is embedded at compile time; `bun run e2e:build` rebuilds both in order.
- **A blank window.** A hand-built binary without `--features custom-protocol` loads a dev-server URL.
- **A bridge-less harness binary.** Any plain `cargo build --release` overwrites it — and so does **`cargo test --workspace`**. Check `strings target/release/seal-desktop | grep -ci webdriver`; zero means no bridge, then `bun run e2e:build`. **Run the Rust suite before the scenarios, not between them.** This bit again last session.
- **`cargo build --release --bin seal` also strips the bridge**, because it shares the target directory. Rebuild after touching the CLI.
- **Back-to-back scenario runs contend.** Pause and `pkill` between scenarios before believing a failure.
- **Casing across the boundary.** A serde casing mismatch once made every field arrive `undefined`. Both unit suites passed throughout. `rename_all` on an **enum** renames variants, not their fields.
- **A correct library with a consumer that discards its answer.** Both sides' tests pass; only the driven application sees it.
- **A guard that passes with its code deleted.** The filter's expansion-restore test did exactly this, because it never expanded anything while filtering and so had nothing to restore.
- **A timing-dependent unit test.** One that polled a file from a thread passed alone and failed under parallel load. Deleted rather than stabilised. Do not re-add that shape.
- **Two lockfiles.** `bun.lock` is the only lockfile for the application. (The site under `site/` has its own, deliberately.)

## Still open

- **The missing `__wdio_original_core__` global was not reported upstream.** A genuine defect in the published `@wdio/tauri-service`; the runner's `before` hook can be dropped once fixed.
- **The CI workflow has no green run on a hosted runner**, and still gates on `first-run` only. Eleven runs are stable now, so widening it is worth doing — though with no remote there is nothing running CI.
- **No per-file progress display** during a long rekey run. Recorded on `password-change.md`.
- **A relock discards a live manage selection.** Left open deliberately, and its stated cause **corrected**: the audit blamed a 15-minute session lifetime, but the session has no expiry — that deadline is per held file. The remaining triggers are an explicit lock and a poisoned mutex, so it is far rarer than recorded and **has not been reproduced**. Reproducing it is the next move; a fix on an unreproduced trigger would be unfalsifiable.
- **The freshness interval is 5 seconds, chosen not measured.** Fast enough that an exposure surfaces before a user could act on stale information, cheap enough not to matter, but nobody has asked whether it *feels* immediate.

## Before you finish

Run the close-out in [AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md): targeted checks pass, commit code and prose, **then** stamp coverage (the order is enforced — the stamp records `HEAD`), then confirm `uv run run_coverage --all --verbose` reports no drift and no `DRIFT.md` exists.

Two coverage notes that will otherwise cost you time. `package.json` is covered by **two** plans (`desktop/ui/shell.md` and `publishing/tooling.md`), so adding an npm script drifts both. And `ui/App.tsx`, `ui/styles.css` and `ui/ipc.ts` are each covered by **many** plans — the fastest route is `uv run run_coverage --all --verbose`, then stamp exactly the pairs it names rather than guessing.

Then update the journey documents if you touched anything they cross, and the cursors at [context/plans/app/README.md](context/plans/app/README.md) and [context/journeys/README.md](context/journeys/README.md).

**And update this file.** The last session did not, and the next one would have started from a document claiming three of six journeys were satisfied and pointing at a `QUESTIONS.md` that no longer exists.
