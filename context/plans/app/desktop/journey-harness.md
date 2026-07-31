Part of [the desktop plan](README.md).

# Scope

The demonstration harness that drives the real built application for the journeys axis. [context/journeys/HARNESS.md](../../../journeys/HARNESS.md) is its specification — what a run must do, what must fail it, and which scenario comes first; this plan owns how it is built, its code, and its coverage.

# What & why

Every journey is satisfied only by driving the real application, and every journey is currently blocked on there being nothing to drive it with. The defect class the harness exists to catch is measured, not hypothetical: a control wired to a browser API that silently no-ops inside the application's webview passed every unit test, because the test environment implements the API and the real webview does not.

The user has fixed the constraints: **it must work on macOS first** — the primary development platform — and beyond that it must be long-term stable, maintainable, and robust. The choice of driver, client, runner, and continuous-integration hookup is delegated to the implementer within those constraints.

# Approach

TBD.

# What exists

Nothing yet.

# What is missing

Everything: the driver choice, the harness itself, the fresh-profile guarantee the first-run scenario needs, the continuous-integration gate, and the deliberately-wired inert control that proves the harness non-vacuous.

# Steps

- [ ] Research driver options against the constraints — macOS first, then stability and maintainability — and choose
- [ ] Build the harness and the `first-run` scenario against a fresh profile
- [ ] Prove it non-vacuous: wire an inert control deliberately, watch the run fail, remove it
- [ ] Gate it in continuous integration
- [ ] Make adding a scenario per journey cheap enough that nobody skips it

# Open threads

- The technology choice is the implementer's to make, within the stated constraints — it does not go back to the question channel unless research reveals that no option satisfies macOS-first without sacrificing maintainability, which would be a genuine fork.
