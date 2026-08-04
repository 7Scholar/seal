# Questions

Raised by [freshness.md](freshness.md), which is blocked until these are answered. All three come from driving [living-with-it](../../../../../journeys/living-with-it.md); the third also comes from [use-a-secret](../../../../../journeys/use-a-secret.md).

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

## 3. Should a revealed value disappear from the screen when Seal stops holding it?

Seal holds a file's decrypted contents for fifteen minutes of idleness, then drops them. That part works and was measured. But when a user has pressed **Reveal** on a value, the value they can see is a copy the screen is holding, and nothing removes it when Seal's own copy expires — so the secret stays on display until the user hides it, closes the file, or locks Seal.

The protection Seal promises is not broken by this: the secret really is gone from memory, and the file on disk stayed sealed the whole time. What is left is a value sitting visible on a screen the user has walked away from — which is the situation the fifteen-minute expiry exists to limit in the first place.

Directions:

- **Leave it.** Treat what is on screen as the user's business — they revealed it, they can hide it, and the machine's own screen lock is the real answer to an unattended display. Nothing to build.
- **Hide revealed values when their file expires.** The value re-masks itself at the same moment Seal drops the plaintext. Consistent with the expiry, and it means a screen left alone goes quiet on its own.
- **Hide them sooner, on their own timer.** A revealed value is a stronger exposure than a held file, so it could conceal after its own shorter interval — closer to how a password manager hides a copied password.
- **Close the whole file view when it expires.** The most thorough, and the most disruptive: the user returns to find the screen has changed underneath them.

A related sub-question for any option but the first: when a value vanishes on its own, should the product say why — a brief "hidden after fifteen minutes" — or simply re-mask it? Something disappearing with no explanation is its own kind of confusing.

Worth stating for whoever answers: this cannot be settled independently of question 1. The interface only learns what Seal knows by asking, and today nothing makes it ask — so whichever answer question 1 takes decides whether the screen can even know the value expired.

**Answer:**
