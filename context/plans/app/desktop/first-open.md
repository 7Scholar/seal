Part of [the desktop plan](README.md).

# Scope

The product's first-open experience, and the state that makes it possible: knowing whether a master password has ever been established, establishing it on the first open, and verifying it on every open after. Also the empty state's onboarding weight — the words and path that take a person from "the product is empty because it is new" to their first protected file. Out of scope: the unlock screen's visual treatment, which `ui/screens.md` owns, and the import flow itself, which `lifecycle.md` owns.

# What & why

The product has no concept of a first run. `Session::unlock` stores whatever passphrase it is given without verifying it against anything, and nothing on disk records whether a master password exists — so a first-time user is asked to unlock a vault that does not exist, any password "unlocks" an empty install, and a typo at the highest-stakes moment in the product is accepted silently. The first-run journey ([context/journeys/first-run.md](../../../journeys/first-run.md)) surfaced this as its first finding, and its findings on the late irreversibility warning and the weightless empty state land here too.

The user has fixed the experience's shape: **the product is exactly the same on the first open as on the hundredth.** Every open shows the unlock shield. If no master password exists yet, the first open *sets* it; otherwise the open *checks* it. After unlock, one single interface with a proper empty state — the empty state is what carries onboarding. There is no separate setup sequence and no first-run-only screen.

The journey's bar still applies in full inside that shape: a person establishing a password must understand they are *choosing* rather than recalling one, must be protected from a silent typo, and must meet the two irreversibility facts — an unrecoverable password, and sealing not reaching backwards — before anything depends on them.

# Approach

TBD.

# What exists

Nothing yet. The unlock shield verifies-or-clears against an established session; establishment does not exist anywhere.

# What is missing

Everything in scope: the established/not-established distinction, establishment on first open with typo protection and the irreversibility facts, verification on later opens, and the empty state's onboarding weight.

# Steps

- [!] Settle how the product knows a master password exists — awaiting answer in QUESTIONS.md
- [ ] Research and design the establish and verify flows within the single-shield shape
- [ ] Design the empty state's onboarding
- [ ] Implement, with tests
- [ ] Re-drive the first-run journey against the built application

# Open threads

No open threads yet.
