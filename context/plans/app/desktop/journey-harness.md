Part of [the desktop plan](README.md).

# Scope

The demonstration harness that drives the real built application for the journeys axis. [context/journeys/HARNESS.md](../../../journeys/HARNESS.md) is its specification — what a run must do, what must fail it, and which scenario comes first; this plan owns how it is built, its code, and its coverage.

# What & why

Every journey is satisfied only by driving the real application, and every journey is currently blocked on there being nothing to drive it with. The defect class the harness exists to catch is measured, not hypothetical: a control wired to a browser API that silently no-ops inside the application's webview passed every unit test, because the test environment implements the API and the real webview does not.

The user has fixed the constraints: **it must work on macOS first** — the primary development platform — and beyond that it must be long-term stable, maintainable, and robust. The choice of driver, client, runner, and continuous-integration hookup is delegated to the implementer within those constraints.

# Approach

The harness is **WebdriverIO with `@wdio/tauri-service`**, the framework's own recommended path, which drives the application through an **embedded WebDriver server** (`tauri-plugin-wdio-webdriver`) compiled into the app rather than through a platform driver. That is what satisfies the constraints together: it runs on macOS — where no WKWebView driver exists and the stock `tauri-driver` cannot go — exactly as it runs on Linux and Windows; it is the upstream-documented path with a maintained service and plugin behind it, not a bespoke bridge; and it speaks the standard WebDriver protocol, so scenarios find controls by what they are called on screen, as the specification demands.

Two rules follow from the embedded shape. **The WebDriver plugin must never reach a release build** — an embedded automation server in a shipped secrets manager would undo the shell's hardening, so it is compiled in only for the harness's own build profile, and proving it absent from release artifacts is part of the work. And **the fresh-profile guarantee comes from pointing the application at a scratch state directory** — the registry directory derives from the home directory, so the harness launches each first-run scenario with a temporary home, which is genuinely nothing: no registry, no sentinel, no repositories.

Continuous integration runs the scenarios on the platforms the runner fleet offers, macOS included, per the specification's gating rule.

# What exists

Nothing yet.

# What is missing

Everything: the driver choice, the harness itself, the fresh-profile guarantee the first-run scenario needs, the continuous-integration gate, and the deliberately-wired inert control that proves the harness non-vacuous.

# Steps

- [x] Research driver options against the constraints — macOS first, then stability and maintainability — and choose
- [ ] Build the harness and the `first-run` scenario against a fresh profile
- [ ] Prove it non-vacuous: wire an inert control deliberately, watch the run fail, remove it
- [ ] Gate it in continuous integration
- [ ] Make adding a scenario per journey cheap enough that nobody skips it

# Open threads

- How the harness's build profile carries the embedded plugin without it existing in release builds — a feature flag, a separate profile, or a test-only binary — settles during the build step, and the proof that release artifacts exclude it belongs to the same step.
- `tauri-plugin-wdio` (IPC mocking, log capture) is available beside the WebDriver plugin; whether the scenarios need it settles when the first one is written.
