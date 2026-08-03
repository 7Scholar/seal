# Handoff — make the product actually finishable: unblock the journeys

> **You are picking this up cold.** Read this, then read what it points you at, then go and drive the real application. Do not start writing code on the strength of this document alone — it tells you what is wrong and what is binding, not what to build.

## Why this task and not another

There is no shortage of work in this repository. This one is chosen because **it is the bottleneck** — a single defect is blocking four of the six things that define whether this product is done, and everything else downstream of it is currently being verified more shallowly than the project's own standard demands.

The project states its own bar plainly, in [context/journeys/README.md](context/journeys/README.md):

> **The product is production-ready when every journey is satisfied** — driven end to end in the real application, with no open findings, against a build anyone could install. Every plan being `[x]` is a prerequisite for that, never a substitute.

Right now: **one journey of six is satisfied.** Two more are partly driven. Three have never been witnessed at all. And the reason is not that the features are missing — most of them are built and unit-tested. It is that **the harness that drives the application freezes partway through**, so nobody has ever watched the product do these things.

That folder exists because this exact failure already happened once: the desktop application was marked complete with every plan `[x]`, and the first person who opened it could not get past the first screen. Both defects sat between plans that were individually correct and individually tested.

## The situation

The harness is WebdriverIO driving a real release build through an embedded WebDriver server compiled into the app. It works. The `first-run` journey passes end to end, reliably, and is gated in continuous integration.

**The `return-and-use` scenario wedges partway through.** Its early path is green — returning, unlock, masked open, sealed-on-disk proof, reveal, edit, save. Then, at a wandering point around the acknowledgement-and-seal interactions, the driver stops receiving responses.

What has already been established about it, so you do not repeat the work ([context/plans/app/desktop/journey-harness.md](context/plans/app/desktop/journey-harness.md) is the source):

- The application's main thread is **provably idle in its event loop** when it hangs. Its tokio workers are parked. The app is not busy; it is waiting.
- The bridge's own status endpoint **stops answering**, so the fault is in the embedded server or its client under rapid command traffic — **not in the application's logic**.
- Disabling the service's mock machinery did not cure it. Pausing after heavy operations did not cure it. Granting the companion plugin did not cure it — though it did remove a five-second-per-command polling tax, which is why it stays.
- The plan already names the most promising untried lead: **move the key-derivation-heavy command bodies onto blocking threads.** That is correct on its own merits regardless of whether it fixes this, because key derivation is deliberately slow and holding an async executor thread on it is wrong.

**Suspected but unconfirmed, from the session that wrote this handoff:** the freeze may be aggravated by concurrency rather than being purely time-based. Three consecutive `first-run` drives failed at *different* steps (step 8, then step 2, then step 1) while a second agent was driving its own harness instance; once that stopped, the same build passed cleanly twice in a row. If two instances contend for the bridge port, that is worth knowing — and it also means **you must not run two drives at once**, or you will chase a ghost.

## What "done" looks like for this task

Not "the bug is closed." **Journeys satisfied.** Concretely, in priority order:

1. **The bridge freeze is resolved or worked around**, with a re-runnable demonstration that it is gone — the same scenario, run several times, green.
2. **[exposure.md](context/journeys/exposure.md) is satisfied.** The scenario already stages it correctly: a protected file overwritten externally with readable text, a return to the product, the insistent alert, the rotate instruction, the recency warning on re-sealing, the file back to armored on disk. It has never been witnessed. This is the highest-value journey in the set, because it is the one where the product tells a user their secret is exposed right now.
3. **[change-the-password.md](context/journeys/change-the-password.md) is satisfied.** Note its own instruction: driving it **must include an interrupted run** — kill the application partway through the rotation and reopen it — because resumability is the property that matters most and a clean run cannot demonstrate it.
4. **[protect-a-repo.md](context/journeys/protect-a-repo.md) and [use-a-secret.md](context/journeys/use-a-secret.md)** are driven past their current stopping points (step 6 of 7 and step 5 of 8).
5. **[living-with-it.md](context/journeys/living-with-it.md)** — the second-week journey. Read it before assuming it is like the others; it is about trust over time and may need staging you have not built.

**You are not expected to finish all five.** [INSTRUCTIONS.md](docs/plans/INSTRUCTIONS.md) is explicit and it is the rule this repository most wants honoured: *a request with many parts is many tasks, and each is done to full depth or not started.* One journey genuinely satisfied — witnessed, with its findings recorded and closed — beats five journeys half-driven. A cursor saying *"exposure is satisfied; the rest are unblocked and untouched"* is a good outcome.

## Read these, in this order

1. **[AGENTS.md](AGENTS.md)** then **[docs/plans/AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md)** — the entry manual. Not optional; it routes you to everything else and to the close-out you must run.
2. **[docs/plans/JOURNEYS.md](docs/plans/JOURNEYS.md)** — the manual for this axis. Read it before touching a journey document. It defines what "satisfied" means and what a finding is.
3. **[context/journeys/README.md](context/journeys/README.md)** — the bar, and the status of each journey.
4. **[context/plans/app/desktop/journey-harness.md](context/plans/app/desktop/journey-harness.md)** — the harness's design, everything already tried against this defect, and its open steps. **Start here for the technical problem.**
5. **[docs/RUNNING.md](docs/RUNNING.md)** — before you build or launch anything. Non-negotiable; the traps in it produce failures that look like app defects and are not.
6. **[FOR-JORIS.md](FOR-JORIS.md)** — questions already waiting on the product owner. Do not duplicate them. If you need something only he can do, add it there in the same question-and-answer format rather than blocking.

## Binding constraints — do not design around these

- **A journey is satisfied only by driving the real application.** Unit tests are explicitly not accepted as a substitute, and several journey documents say so in as many words. If you find yourself writing a test to prove a journey, you have left the axis.
- **The bridge must never reach a distributable build.** It rides an `e2e` cargo feature whose capability grant lives in a separate directory the build script includes only when that feature is on. Continuous integration proves the shipped binary is free of it by scanning. Whatever you do to fix the freeze, this property survives, and the check stays non-vacuous.
- **Never run two drives at the same time.** See the concurrency note above.
- **A real window opens and operates itself for eight to ten minutes.** Do not touch it, do not close it, and do not assume a failure is real until you have re-run it once cleanly.
- **Code carries no comments and no docstrings.** Explanation lives in the plans. This is enforced by convention throughout the repository.
- **Every load-bearing guard is confirmed non-vacuous** — break it deliberately, watch the matching test fail, restore it. This is stated in [CONTRIBUTING.md](CONTRIBUTING.md) with its reason: tests in this repository have passed with the code they guarded entirely removed.
- **A bug fix reproduces before it fixes.** [INSTRUCTIONS.md](docs/plans/INSTRUCTIONS.md) is emphatic: a fix on an unreproduced bug is unfalsifiable. For this task that means you need the freeze to happen **on demand** before you claim to have fixed it. If it resists reproduction, narrowing it until it fails reliably *is* the work.

## Traps this repository has actually fallen into

Each of these has cost a real session. They are not hypothetical.

- **A stale `dist/`.** The frontend is embedded into the binary at compile time. A frontend change reaches a real build only by rebuilding both, in order. An app that "looks unchanged" after a rebuild is almost always this. `bun run e2e:build` does it correctly.
- **A blank window.** A hand-built binary without `--features custom-protocol` loads a dev-server URL and shows nothing, with empty stderr. It looks like a catastrophic app defect and is a missing build flag.
- **A bridge-less harness binary.** Any plain `cargo build --release` silently overwrites the harness binary with one that has no bridge, and the next drive fails at startup with a confusing message. Re-run `bun run e2e:build`. Sanity check: `strings target/release/seal-desktop | grep -ci webdriver` — zero means no bridge.
- **Casing across the boundary.** A serde casing mismatch on a tagged union once made every field arrive `undefined` in the webview, which selected every file in a tree including the template that was meant to stay readable. **Both sides' unit suites passed the whole time** — each asserting against its own shape. Only the driven application revealed it. This is the single best argument for the axis you are working on.
- **Two lockfiles.** `bun.lock` is the only lockfile for the application. Do not introduce `package-lock.json`. (The documentation site under `site/` has its own `bun.lock`, which is deliberate and read by its own workflow.)

## Decisions that are yours, and decisions that are not

**Yours** — make them, record them in the plan, and move on:

- How to fix or work around the freeze. Upstream report, blocking-thread migration, command pacing, a different bridge strategy — whatever the reproduction actually points at.
- Whether a journey needs new staging in the harness to be drivable, and what that staging looks like.
- Whether a finding you turn up is a defect to fix now or a framed plan for later.

**Not yours** — these go in [FOR-JORIS.md](FOR-JORIS.md) as a question, or in the relevant plan's `QUESTIONS.md`, and you keep working on something else:

- Anything that changes what the product *promises* a user, rather than whether it delivers it.
- Anything requiring an account, a payment, a repository setting, or a signing identity.
- A design fork where two directions are both defensible. State the fork neutrally and let him choose; do not pick one because it is easier to build.

**The distinction that matters:** if the product does not do what a journey says it does, that is a defect and fixing it is your job. If the product does something coherent that the journey did not anticipate, that is a question about intent and it is not.

## Where the work stands right now

The three most recent pieces of work, so you know what is fresh and what is settled:

- **The palette is chosen and applied** — fourteen semantic tokens, `--primary` split from `--accent`, every contrast pair verified against the accessibility floor in both themes. Settled; do not repaint it.
- **The manage surface (the import tree) was rebuilt** — a fixed header and footer, the tree as the only scrolling region, and a folder row that responds to being clicked. **Part-built:** its audit found fifteen things and this pass took the frame plus two defects. The rest are listed in [context/plans/app/desktop/ui/navigation/manage-surface.md](context/plans/app/desktop/ui/navigation/manage-surface.md) under *What is missing* — a filter over the tree, a degraded state, alignment findings, and an idle lock that discards a live selection.
- **A documentation site exists** under `site/`, built and checked, not yet published.

If the journey work stalls for a reason you cannot move, **the manage surface's remaining findings are the best fallback** — they are audited, framed, and ready to build, and they are UX work of exactly the kind the owner has been asking for.

## Before you finish

Run the close-out in [AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md). Briefly: targeted checks pass, commit code and prose, **then** stamp coverage (the order is enforced — the stamp records `HEAD`), then confirm `uv run run_coverage --all --verbose` reports no drift and no `DRIFT.md` exists.

Then update the journey documents themselves. A journey's **Demonstration** section records exactly what was witnessed and what was not, and its **Findings** section stays open until every finding is closed. Be precise about what you actually saw — *"driven through step 6 of 7"* is a useful statement and *"mostly working"* is not.

Update the cursor at [context/plans/app/README.md](context/plans/app/README.md) and at [context/journeys/README.md](context/journeys/README.md) so the next agent inherits the truth rather than an impression.

**Say plainly what you did not do.** An unstarted journey reported as unstarted is a working plan system. An unstarted journey quietly reported as fine is the exact failure this axis was created to catch.
