# Handoff — the depth pass is done; what is left is one reproduction and the things only the owner can settle

> **You are picking this up cold.** Read this, then read what it points you at, then go and drive the real application. Do not start writing code on the strength of this document alone — it tells you where things stand and what is binding, not what to build.

## Read this first: the lesson these axes keep re-teaching

A session once recorded, in six places across the tree, that **a master-password change left the vault openable by neither password** — framed as the most serious defect the journeys axis had ever found. **It was not a product defect.** The harness had been typing passwords with `browser.keys([...text])`, which silently drops the spaces. Walking that back cost a whole session.

- **A driven failure is evidence about the whole system, harness included.** It is not proof of a product defect.
- **Diagnose to a mechanism before writing a finding down.** A finding you can state as *"X is written only at Y, so Z"* is real; *"the screen looked wrong"* is not yet.

The last session hit the mirror image of this repeatedly, and it is the more useful half: **a guard that passes is not proof the code works.** Three of its own new guards passed while proving nothing, each caught only by deliberately breaking the code underneath them. One measured a row's height to prove text truncated, which `min-height` holds constant while the text overflows. One used a long name that turned out to *fit* its column. One tested Escape-dismissal by clicking away first, which dismisses by a different rule and leaves nothing for Escape to close. All three would have shipped as green coverage of nothing.

**Break every load-bearing guard you write and watch it fail.** It is the cheapest step in this repository and it caught three defects-in-the-tests in one session.

## Git: work on `main`, and do not create a branch

**This repository has no origin and has never been published.** `main` is the only branch and it holds everything.

**Work directly on `main` and commit there.** A branch exists to become a pull request, and with no remote there is no push, no PR and no merge — so a branch only hides your work from the next session. [GIT_WORKFLOW.md](docs/plans/GIT_WORKFLOW.md) owns the rule under **While this repository has no remote**. **If you find any instruction telling you to branch off `main`, it is superseded — ignore it.**

Landing is unchanged: code and prose commit first, **coverage stamps last as its own final commit**, and the detector must report no drift before you stop. **Never push.**

**Run one task at a time.** On `main` there is no merge, so nothing flags two sessions interleaving on a shared `coverage.json`.

## Where things stand

Everything is committed on **`main`**. Working tree clean, no drift, no `DRIFT.md`, no stashes, **no `QUESTIONS.md` anywhere**.

### All six journeys are satisfied, and the depth pass is done

**Thirteen scenario runs, all green — 81 driven checks across 13 specs:**

| Command | Checks | Time |
|---|---|---|
| `bun run e2e` (`first-run`) | 9 | ~2s |
| `bun run e2e:extended` (+ `return-and-use`) | 9 + 9 | ~9s |
| `bun run e2e:interrupted` | 5 | ~15s |
| `bun run e2e:living` | 6 | ~18s |
| `bun run e2e:frame` | 4 | ~1s |
| `bun run e2e:expiry` | 6 | ~13s |
| `bun run e2e:settling` | 8 | ~9s |
| `bun run e2e:deploy` | 7 | ~3s |
| `bun run e2e:badday` | 9 | ~3s |
| `bun run e2e:filter` | 5 | ~1s |
| `bun run e2e:freshness` | 5 | ~17s |
| `bun run e2e:largefile` | 4 | ~3s |
| `bun run e2e:density` | 4 | ~2s |

**Four of those are not journeys.** `window-frame` drives the window *as a window*; `manage-filter` drives the filter against a file no journey's fixture buries deeply enough; `large-file` drives a four-hundred-variable env file; `manage-density` measures the manage surface's geometry. Each exists because its defect class is invisible to a journey asking whether a *task* completes.

**192 interface unit tests**, and the Rust workspace is green.

### Two coverage limits, stated rather than glossed

- **The folder picker's second use is not covered.** The seam returns a folder fixed in the application's environment at launch, so a second repository can only be added across the boundary. `desktop/MEMORY.md` records why driving the picker twice cannot work.
- **The title bar's drag has no automated coverage at all.** The harness's synthesized press carries no click count, so the framework's listener refuses it. A person confirms it; the check in place fails whether the drag is broken *or* merely undrivable, so **it must never be read as a pass**.

## What the last session did

It took the four remaining items on `ui/navigation/` and finished all of them. **Every child of that node is now `[x]` except `manage-surface.md`, whose one open item is a reproduction rather than a build.**

**The file surface got every state it was missing, and two of them were broken rather than unfinished.** All established by measuring the running application, not by reading the code:

- **A large file could not be saved.** At 400 variables the surface rendered **26,756px inside a 673px content region** and the save control sat at 26,776px in a 720px window — past every row. It now carries the three-band frame the manage surface already had.
- **A failed open was a dead end.** The route is set before the open resolves, so a rejection left the altitude current with no contents and only the dismissible global banner; dismissing it left a blank window under a trail claiming the user was inside a file.
- **An open in flight rendered nothing at all** — the content region measured zero bytes for its whole duration.
- The surface **states its variable count**, as both sibling altitudes do.

**One defect found there belonged to no surface, and it is the one most likely to recur.** With the frame correct and every element in the chain measuring at the window's height or less, the document still scrolled to 26,695px. `.visually-hidden` is absolutely positioned with no offsets, so it resolves against the initial containing block rather than any scrolling region — one span per masked value, 394 of them, each at its own flow offset. Fixed on the utility; `ui/MEMORY.md` holds why the offsets must stay.

**The manage surface's last two findings are built.** Its two channels are real columns: annotations sit at the row's trailing edge and line up within a pixel, where they previously spanned **361px** wherever each name happened to end, and names truncate rather than wrapping. The 1px offset between directory and file rows **was not the two fonts the audit blamed** — it was the checkbox placeholder, declared a pixel wider than the checkbox it stands in for. Its degraded state is stated: the scan deliberately skips build output and dependencies, which is correct and was silent, and the surface now says so with the toggletip naming every skipped folder.

**The `Repositories` root segment has its switcher**, closing the audit's last reference deviation. The withdrawn reasoning read the popover as a list; it is a list *plus an action*, and on a fresh install the list is empty while the action is the only thing a user can do. With nothing to switch between it drops the search field, states that there are no repositories yet, and focuses the add action. Driven in `first-run` on exactly that screen.

**The four disclosures share one contract**, as a **hook** rather than a wrapper component — what they share is the open state and the rules for leaving it, while their markup shares nothing. The switcher's drift is closed: it handled Escape only within its own subtree, so a user who opened it, moved focus behind it and pressed Escape found it still open.

**The CI journeys workflow now gates on all thirteen scenarios** rather than `first-run` alone, driving each in turn with a kill between them. It still has no green run on a hosted runner, there being no remote.

## Three decisions worth carrying forward

1. **No positive assurance is drawn anywhere.** Asked whether the product should state that everything is protected, the owner answered *nothing — absence is the answer*. `living-with-it` step 3 asks for a one-glance answer the product deliberately does not give. It is recorded there as **closed-as-decided**. **Do not re-raise it.**
2. **A filesystem watch was refused**, on a measurement rather than a preference: reconciliation is **6ms for 500 managed files, under 1ms for a realistic vault**, while a watch's failure modes all end with the product silently ceasing to notice.
3. **The re-observation timer must not guard on `document.hidden`.** A Tauri window behind another window reports itself **hidden**, so that guard disables the feature in exactly the case it exists for. `desktop/MEMORY.md` owns this.

## What to do next

In rough order of value:

1. **Reproduce the relock that discards a live manage selection**, the single open item on [manage-surface.md](context/plans/app/desktop/ui/navigation/manage-surface.md). Its stated cause was **corrected** — the audit blamed a 15-minute session lifetime, but the session has no expiry; that deadline is per held file. The remaining triggers are an explicit lock and a poisoned mutex, so it is far rarer than recorded and **has never been reproduced**. A fix on an unreproduced trigger would be unfalsifiable, so reproducing it *is* the work.
2. **`publishing/`** — reopened; a hosted documentation site is framed. [FOR-JORIS.md](FOR-JORIS.md) has items waiting on the owner about it. **Do not duplicate them.**
3. **A sweep of the remaining prose against the interface's own rule.** `ui/README.md`'s open threads name this: the rule was stated after most screens were built, so only the surfaces two nodes touched have been judged against it. It wants a deliberate pass, not a blanket deletion — the acknowledgement's copy may well be legitimate, being a destructive-act confirmation stating a consequence.
4. **The excessive state is contained but not reduced.** Nothing virtualizes anywhere — 400 variables is 2,850 DOM nodes, 1,097 tree rows is more. Every surface states its count so the size is knowable, and the frames now hold, but the DOM cost is untouched. This is a real thread on three plans and nobody has decided whether it matters at this product's scale.

## Read these, in this order

1. **[AGENTS.md](AGENTS.md)** then **[docs/plans/AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md)** — the entry manual and the close-out you must run.
2. **[context/plans/app/desktop/ui/MEMORY.md](context/plans/app/desktop/ui/MEMORY.md)** and **[context/plans/app/desktop/MEMORY.md](context/plans/app/desktop/MEMORY.md)** — the entries you will otherwise fall into. Several are new, and two are about tests that pass while proving nothing.
3. **[docs/RUNNING.md](docs/RUNNING.md)** — before you build or launch anything.
4. **[docs/plans/SURFACE_AUDIT.md](docs/plans/SURFACE_AUDIT.md)** — the axis the finished work sat on.
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
- **Every load-bearing guard is confirmed non-vacuous** — break it, watch the matching test fail, restore it. Three of the last session's own guards were vacuous; assume yours are too until you have proved otherwise.
- **Never put a plan question to the user directly.** It goes in `QUESTIONS.md` and that line of work stops. Delete the file once empty.
- **Code carries no comments and no docstrings.**
- **You commit on `main` and stop.** No branch, no push.

## Traps this repository has actually fallen into

- **A stale `dist/`.** The frontend is embedded at compile time; `bun run e2e:build` rebuilds both in order.
- **A blank window.** A hand-built binary without `--features custom-protocol` loads a dev-server URL.
- **A bridge-less harness binary.** Any plain `cargo build --release` overwrites it — and so does **`cargo test --workspace`**. Check `strings target/release/seal-desktop | grep -ci webdriver`; zero means no bridge, then `bun run e2e:build`. **Run the Rust suite before the scenarios, not between them.**
- **`cargo build --release --bin seal` also strips the bridge**, because it shares the target directory. Rebuild after touching the CLI.
- **A deliberate break that does not compile proves nothing.** When breaking a guard to test it, check the build actually succeeded — a failed `e2e:build` leaves the *old* binary in place and the scenario passes against code you did not change. This happened once and read as a vacuous guard.
- **A wait that a loading state satisfies.** A scenario waiting for `.env-editor__row` matched the *skeleton* and proceeded before the file opened. Wait for `aria-busy` to be gone as well.
- **Back-to-back scenario runs contend.** Pause and `pkill` between scenarios before believing a failure.
- **Casing across the boundary.** A serde casing mismatch once made every field arrive `undefined`. Both unit suites passed throughout. `rename_all` on an **enum** renames variants, not their fields.
- **A correct library with a consumer that discards its answer.** Both sides' tests pass; only the driven application sees it.
- **A guard that passes with its code deleted.** Four instances so far, three of them in one session. The shapes: measuring a container that holds its size while its content overflows; a fixture that does not actually reach the state; and a setup step that already satisfies the thing being asserted.
- **A timing-dependent unit test.** One that polled a file from a thread passed alone and failed under parallel load. Deleted rather than stabilised. Do not re-add that shape. **But do not read that as licence to delete a flaky test:** of the two intermittent failures fixed since, one was a genuine product defect in the lock.
- **Two lockfiles.** `bun.lock` is the only lockfile for the application. (The site under `site/` has its own, deliberately.)

## Still open

- **The missing `__wdio_original_core__` global was not reported upstream.** A genuine defect in the published `@wdio/tauri-service`; the runner's `before` hook can be dropped once fixed.
- **The CI workflow has no green run on a hosted runner.** It now gates on all thirteen scenarios, but with no remote there is nothing running it.
- **No per-file progress display** during a long rekey run. Recorded on `password-change.md`.
- **Nothing virtualizes anywhere.** Contained by the frames, made knowable by the counts, and untouched as a DOM cost.
- **The freshness interval is 5 seconds, chosen not measured.** Nobody has asked whether it *feels* immediate.

## Before you finish

Run the close-out in [AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md): targeted checks pass, commit code and prose, **then** stamp coverage (the order is enforced — the stamp records `HEAD`), then confirm `uv run run_coverage --all --verbose` reports no drift and no `DRIFT.md` exists.

Two coverage notes that will otherwise cost you time. `package.json` is covered by **two** plans (`desktop/ui/shell.md` and `publishing/tooling.md`), so adding an npm script drifts both. And `ui/App.tsx`, `ui/styles.css` and `ui/ipc.ts` are each covered by **many** plans — the fastest route is `uv run run_coverage --all --verbose`, then stamp exactly the pairs it names rather than guessing.

**Watch your shell's working directory.** The coverage commands are repo-relative and work from anywhere, but a `cd` earlier in a session persists — confirm where you are before running them.

Then update the journey documents if you touched anything they cross, and the cursors at [context/plans/app/README.md](context/plans/app/README.md) and [context/journeys/README.md](context/journeys/README.md).

**And update this file.**
