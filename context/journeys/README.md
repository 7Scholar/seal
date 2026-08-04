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

[protect-a-repo.md](protect-a-repo.md) is driven through step 6 of 7, and [use-a-secret.md](use-a-secret.md) through step 5 of 8, inside the same runs; their remaining steps are undriven because no scenario stages them.

[change-the-password.md](change-the-password.md) is **satisfied**: the clean run and the interrupted run are both green. The interrupted run found the only product defect this axis has caught since the harness was built — an interrupted rotation's manifest under-reported which files had already moved, so the resume screen asked for the old password on a file that no longer needed it. Recovery itself was never broken; the report was. It is fixed, re-driven, and confirmed non-vacuous. [living-with-it.md](living-with-it.md) has never been driven.

A note worth keeping, because it cost a session: an earlier record here reported that a password change left the vault openable by neither password. It did not. The harness was typing passwords a character at a time and the spaces were being dropped, so the vault was established under a password nobody intended; every unlock typed the same way, which hid it until one correctly-typed field was rightly refused. The lesson is the axis's own — **a driven failure is evidence about the whole system, harness included, not proof of a product defect** — and it is why the scenarios now assert what actually landed in each field.

Each Demonstration section records exactly what was witnessed and what was not, and a journey with undriven steps or open findings stays unsatisfied.

This folder exists because the desktop application was once marked complete with every plan `[x]`, and the first person to open it could not get past the first screen — they were asked to unlock a vault that did not exist yet, then met a screen whose only button did nothing at all. Both defects sat between plans that were each individually correct and individually tested. Both are now fixed and their fixes are what the automated demonstration drives.
