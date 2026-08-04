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

**All six journeys are satisfied.** Every step of every journey is driven against a release build, and every finding is closed.

The last three to close were the freshness findings, built as [freshness.md](../plans/app/desktop/ui/navigation/freshness.md): the interface re-observes on window focus and every five seconds while unlocked, re-reading the registry from disk, so a secret exposed while the window sits open is now noticed with no user action; and a revealed value re-masks itself when Seal drops the plaintext behind it. One finding closed **as decided rather than fixed** — asked whether the product should state that everything is protected, the product owner answered *nothing; absence is the answer* — so [living-with-it](living-with-it.md) step 3's request for a one-glance answer is deliberately not met, recorded there as a decision so nobody re-raises it.

Two limits are stated rather than glossed. [protect-a-repo](protect-a-repo.md) does not cover the folder picker being used a **second** time, because the harness's seam returns a folder fixed at launch. And the title bar's **drag** has no automated coverage at all, because the harness's synthesized press carries no click count — a person confirms it, and the check in place fails whether the drag is broken or merely undrivable.

**Nine scenarios run**, all green: `first-run` (9 checks), `return-and-use` (9), `interrupted-rekey` (5), `living-with-it` (6), `plaintext-expiry` (6), `settling-in` (8), `deploy-script` (7), `bad-day` (9) and `freshness` (5). Four further specs are **not journeys** and do not appear above: `window-frame` (4), which drives the window *as a window*; `manage-filter` (5), which drives the manage surface's filter against a file no journey's fixture buries deeply enough to need it; `large-file` (4), which drives an env file of four hundred variables; and `manage-density` (4), which measures the manage surface's geometry rather than its markup. Each exists because its defect class is invisible to a journey that asks whether a *task* completes — every journey passed while three surfaces had no title bar at all, and every journey passed again while a four-hundred-variable file put its own save control 26,000px below the fold.

What the axis found, in the order the journeys met it: a first-time user who could not get past the first screen; a sealed file that the interface reported from memory rather than from disk; an interrupted password change whose manifest under-reported its own progress; a `.tfvars` that would have been corrupted by an editor it should never have been offered; a recency warning that applied only to one of the two controls that seal; and a product that never looked at the disk again once it had unlocked. Each sat between plans that were individually correct and individually tested, which is the whole reason this axis exists.

Each Demonstration section records exactly what was witnessed and what was not, and a journey with undriven steps or open findings stays unsatisfied.

This folder exists because the desktop application was once marked complete with every plan `[x]`, and the first person to open it could not get past the first screen — they were asked to unlock a vault that did not exist yet, then met a screen whose only button did nothing at all. Both defects sat between plans that were each individually correct and individually tested. Both are now fixed and their fixes are what the automated demonstration drives.
