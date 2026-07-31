Operated per [the journeys manual](../../docs/plans/JOURNEYS.md).

# The demonstration harness

Journeys are satisfied by driving the real application. This document states how, and it is the first thing to build — every journey is blocked on it, and without it the whole axis degrades into documents nobody runs.

# Where this gets built

This document is the **specification**, not the home. The harness is code, so it is built in the implementation tree under [journey-harness](../plans/app/desktop/journey-harness.md), which holds its coverage — `context/journeys/` carries no code and no coverage.

Its technology — which driver, which client, which runner, and how it hooks into continuous integration — is chosen in that plan, delegated to the implementer within the constraints below.

# What it must do

Launch the **actual built application** — the same binary a user would install, not a component in a test environment — and drive it the way a person does: find controls by what they are called on screen, click them, type into them, and assert what appears.

The rule it exists to enforce: **a control that does nothing must fail the run.** The defect that motivated this axis was a button wired to a browser API that silently no-ops inside the application's webview. It passed every unit test, because the test environment implements that API and the real one does not. A harness that cannot catch that is not worth building.

# The platform requirement, and what follows from it

**The harness must drive the application on macOS first.** macOS is the primary development platform, and a harness that cannot run where the product is actually developed and used degrades into documents nobody runs. The framework's stock WebDriver path has no macOS driver, so meeting this requirement is the central technology problem the implementation plan solves.

Beyond macOS-first, the choice is governed by **long-term stability, maintainability, and robustness** — a bespoke harness nobody maintains is worse than none, so whatever is chosen must be something a stranger can keep alive.

- **Automated journeys gate in continuous integration** on every platform the chosen technology supports, macOS included.
- **Anything a platform's run cannot cover gets its own explicit note** in the journey.

# What a journey run looks like

One runnable scenario per journey, named for the journey. Each drives the path in order and asserts what the journey's **What good looks like** section says must be true. The assertions are written from that section rather than invented, so the journey document stays the specification and the run stays its check.

A run must fail loudly on:

- a control that is present but inert
- a screen with no path forward
- an expected element that never appears
- an unhandled error surfacing to the user
- a step that hangs with no indication of progress

# The first scenario to build

`first-run`, driven against a **fresh profile with no existing state** — which is the condition that exposed the original defect and the one most likely to be skipped, since a developer's machine always has state on it.

The run must start from genuinely nothing: no registry, no password, no repositories. Whatever the harness has to do to guarantee that is part of building it.

# Definition of done for this harness

- A scenario can launch the real application and drive it.
- It runs in continuous integration on Linux and fails the build when a journey breaks.
- It provably catches an inert control — demonstrated by wiring one deliberately and watching the run fail, then removing it. The same non-vacuity bar the rest of this repository holds.
- Adding a scenario for a new journey is straightforward enough that nobody is tempted to skip it.
