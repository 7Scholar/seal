Operated per [the journeys manual](../../docs/plans/JOURNEYS.md).

# The demonstration harness

Journeys are satisfied by driving the real application. This document states how, and it is the first thing to build — every journey is blocked on it, and without it the whole axis degrades into documents nobody runs.

# Where this gets built

This document is the **specification**, not the home. The harness is code, so it is framed in the implementation tree through intake ([INTAKE.md](../../docs/plans/INTAKE.md)) and built there under a plan that holds its coverage — `context/journeys/` carries no code and no coverage.

Its technology is an **open design fork, and an unanswered one**: which driver, which client, which runner, and how it hooks into continuous integration. Choosing that silently would be exactly the kind of quiet answer intake forbids. Frame the plan, raise the fork as a blocking question, and wait — see [QUESTIONS.md](QUESTIONS.md) in this folder for the questions this axis has already surfaced.

# What it must do

Launch the **actual built application** — the same binary a user would install, not a component in a test environment — and drive it the way a person does: find controls by what they are called on screen, click them, type into them, and assert what appears.

The rule it exists to enforce: **a control that does nothing must fail the run.** The defect that motivated this axis was a button wired to a browser API that silently no-ops inside the application's webview. It passed every unit test, because the test environment implements that API and the real one does not. A harness that cannot catch that is not worth building.

# The platform constraint, and what follows from it

The framework's WebDriver support covers Linux and Windows. **There is no macOS driver**, which is a problem because macOS is the primary development platform here.

This is a real constraint, not a reason to skip automation:

- **Automated journeys run on Linux in continuous integration.** That is where they gate.
- **macOS is verified by hand** at release, recorded in each journey's Demonstration section.
- **Anything platform-specific gets its own explicit note** in the journey, because the automated run does not cover it.

Do not let the macOS gap become an excuse to have no automation at all. Most of what journeys catch — dead controls, unreachable screens, missing states, flows with no entry — is platform-independent, and a Linux run catches all of it.

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
