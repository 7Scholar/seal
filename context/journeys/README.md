# Journeys

The product seen from outside, by someone who does not know how it is built. Operated per [docs/plans/JOURNEYS.md](../../docs/plans/JOURNEYS.md), which is the manual for this axis and should be read before working any journey here.

This folder is **not** part of the implementation tree. It carries no coverage, owns no code, and its files are not plans. It exists because the implementation tree folds the product as code, and a person's path through the product crosses many concerns and therefore belongs to none of them.

## The bar

**The product is production-ready when every journey below is satisfied** — driven end to end in the real application, with no open findings, against a build anyone could install. Every plan being `[x]` is a prerequisite for that, never a substitute. A journey being broken makes the product not done, whatever the plan tree says.

## Before any journey can be satisfied

[HARNESS.md](HARNESS.md) — the harness that drives the real application. Every journey is blocked on it, and it is the first thing to build. It is framed in the implementation tree as [journey-harness](../plans/app/desktop/journey-harness.md); the first-run shape this axis surfaced is framed there too, as [first-open](../plans/app/desktop/first-open.md).

## The journeys

Ordered as a person meets them.

- [first-run.md](first-run.md) — someone has just installed Seal and opens it for the first time
- [protect-a-repo.md](protect-a-repo.md) — bringing a repository's secret files under protection
- [use-a-secret.md](use-a-secret.md) — reading and editing a protected secret, and using one from a script
- [exposure.md](exposure.md) — discovering a secret is sitting in the clear, and fixing it
- [change-the-password.md](change-the-password.md) — rotating the master password across everything
- [living-with-it.md](living-with-it.md) — the second week: returning, locking, and trusting it over time

## Status

**Three of six are satisfied on macOS**, each driven end to end by the automated harness against a release build from a scratch profile, with no open findings: [first-run.md](first-run.md), green across three consecutive runs; [exposure.md](exposure.md) — the alert, the rotate instruction and its reason, the fix beside the problem, the recency warning, and the file armored on disk afterwards; and [change-the-password.md](change-the-password.md), whose interrupted run is now driven by force-killing the application partway through a rotation and relaunching it.

**Six scenarios now run:** `first-run` (8 steps), `return-and-use` (9), `interrupted-rekey` (5), `living-with-it` (6), `plaintext-expiry` (6) and `settling-in` (7).

A sixth driven spec, `window-frame` (4), is **not a journey** and does not appear above: it drives the window as a window — that each surface carries the title bar's drag region, sits below the platform's window controls, and that the manage surface scrolls its tree rather than the document. It exists because that defect class is invisible to every journey here. All four journeys' scenarios passed while three surfaces had no title bar at all and the manage surface's fixed chrome scrolled off the screen, since each journey asks whether a *task* can be completed and the tasks all completed.

[protect-a-repo.md](protect-a-repo.md) is **driven at all seven steps**, and is not satisfied: step 7 opened one finding, and its second-repository half carries a stated limit. A repository registered while the window was open did not appear until the session was locked and unlocked — the registry on disk held it throughout — which is the freshness gap seen at the cross-repo altitude and is routed to the node that owns it. The limit is the harness's: the folder-pick seam returns a folder fixed in the application's environment at launch, so the second repository was added across the boundary and the picker's second use is not covered.

[use-a-secret.md](use-a-secret.md) is driven at steps 1–5, **6**, and 8, leaving only step 7. It is not blocked — it drives the **CLI binary** rather than the desktop app, so it needs a different harness shape. Step 6 was driven by sealing a `terraform.tfvars` beside an env file and requiring the opened surface to carry no editable row, no value input and no save control, with the reason stated; the name gate that prevents it was confirmed non-vacuous by removal.

[change-the-password.md](change-the-password.md) is **satisfied**: the clean run and the interrupted run are both green. The interrupted run found a real product defect — an interrupted rotation's manifest under-reported which files had already moved, so the resume screen asked for the old password on a file that no longer needed it. Recovery itself was never broken; the report was. It is fixed, re-driven, and confirmed non-vacuous.

[living-with-it.md](living-with-it.md) is **driven for the first time and not satisfied**. Its scenario is green at six of six, and it found three things. One is a fixed defect of the axis's signature shape: a managed file deleted outside Seal still read as `Sealed` with a live open control, because the overview computed a reconciliation, used it only for the exposure flag, and served the recorded state for everything else — the registry library was correct throughout and every suite on both sides passed. Two are open and framed as [freshness.md](../plans/app/desktop/ui/navigation/freshness.md), blocked on the product owner: the interface re-reads disk only when the session unlocks, and nothing anywhere states that everything *is* protected, so the journey's central question is answerable only by reading every tile and inferring safety from silence.

**Its step 5, plaintext expiry, is now driven** — as is the identical behaviour in `use-a-secret` step 8, since one scenario serves both. It needed a seam rather than a scenario: the held-plaintext lifetime was fixed at fifteen minutes, so nothing a run finishing in seconds could observe. [commands.md](../plans/app/desktop/commands.md) now provides one, honoured only in harness builds and clamped so it can only ever *shorten* a lifetime. The scenario asserts the mechanism rather than the screen — it invokes `reveal` across the boundary and requires the refusal to be `notOpen` specifically, because a reveal can fail for several reasons and only that one means the deadline did it — and it was confirmed non-vacuous by compiling the seam out and watching exactly the two deadline-measuring checks fail.

It produced a third open finding, routed to the same node: **a revealed value stays on screen after Rust has expired it.** The guarantee the product actually makes is intact and was verified in the same run — the plaintext is gone from memory and the file stayed sealed on disk — but the interface has no notion of a held secret's lifetime, so the screen keeps showing a secret the product no longer holds. Worth recording how it was reached: the first version of that check asserted the value would disappear, and *that assertion was wrong about the product as designed*, since the interface is specified to hold a revealed value in component state and nothing says it clears. Diagnosing it rather than filing it turned a would-be false defect into a real missing concern.

A note worth keeping, because it cost a session: an earlier record here reported that a password change left the vault openable by neither password. It did not. The harness was typing passwords a character at a time and the spaces were being dropped, so the vault was established under a password nobody intended; every unlock typed the same way, which hid it until one correctly-typed field was rightly refused. The lesson is the axis's own — **a driven failure is evidence about the whole system, harness included, not proof of a product defect** — and it is why the scenarios now assert what actually landed in each field.

Each Demonstration section records exactly what was witnessed and what was not, and a journey with undriven steps or open findings stays unsatisfied.

This folder exists because the desktop application was once marked complete with every plan `[x]`, and the first person to open it could not get past the first screen — they were asked to unlock a vault that did not exist yet, then met a screen whose only button did nothing at all. Both defects sat between plans that were each individually correct and individually tested. Both are now fixed and their fixes are what the automated demonstration drives.
