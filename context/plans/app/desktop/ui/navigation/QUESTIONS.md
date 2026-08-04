# Questions

Raised by [freshness.md](freshness.md), which is blocked until these are answered. Both come from driving [living-with-it](../../../../../journeys/living-with-it.md).

## 1. When should Seal look at the disk again?

Today the interface re-reads what is on disk **only when the session unlocks**, and after operations Seal itself performed. If a managed file is deleted, exposed, or sealed by something else while the Seal window is open, the product does not notice — measured, it kept reporting a deleted file as sealed until the session was locked and unlocked again. This also delays the exposure alert, which is computed from the same read.

Directions, and what each costs:

- **Only when the user acts** — as today, plus a visible "last checked" statement and a manual refresh control, so the product never implies more currency than it has. Cheapest, and honest, but a file exposed while the window sits open stays unreported until the user does something.
- **When the window regains focus** — re-read each time the user comes back to Seal. Matches how a person actually uses a desktop app, and costs a disk read per file only at moments they are already waiting. Does nothing while the window is focused and idle.
- **On a timer as well** — re-read every N seconds regardless. Catches an exposure while the user watches, at the cost of continuous disk reads across every managed file in every repository, forever.
- **Watch the filesystem** — subscribe to changes on the managed paths. Most responsive and most work; brings its own failure modes (watch limits, editors that replace rather than write, network volumes) that would need designing for.

A related sub-question, whichever is chosen: when a re-read finds something changed underneath the user, should the surface update silently, or say that it did?

**Answer:**

## 2. Should the product state that everything is protected, and where?

Seal currently draws attention only when something is **wrong** — an exposed file gets a line on its tile and an alert on the repository. When everything is sealed, nothing anywhere states it. The user infers safety from the absence of warnings, which means reading every tile.

The journey asks for the opposite: one glance, no reading. Directions:

- **Nothing — absence is the answer.** Trust that no warning means safe, and keep the interface quiet. Consistent with the product's proportionality rule, and asks the user to know that rule.
- **A single statement in the title bar**, beside or in place of the exposure indicator that is already specified there — present at every altitude, so the answer travels with the user. Needs deciding whether a reassurance and an alarm share one element or are two.
- **A summary on the repositories surface only** — a count of what is protected, at the altitude that already speaks for everything. Answers the question on the landing screen, but says nothing while the user is inside a repository.
- **Per repository as well as overall**, so a tile states its own health rather than only its faults.

Worth stating plainly for whoever answers: a standing "everything is protected" is a claim the product must be able to keep. How current it can honestly be depends entirely on question 1, so answering 2 alone does not unblock the work.

**Answer:**
