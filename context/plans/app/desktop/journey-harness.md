Part of [the desktop plan](README.md).

# Scope

The demonstration harness that drives the real built application for the journeys axis. [context/journeys/HARNESS.md](../../../journeys/HARNESS.md) is its specification — what a run must do, what must fail it, and which scenario comes first; this plan owns how it is built, its code, and its coverage.

# What & why

Every journey is satisfied only by driving the real application, and every journey was blocked on there being nothing to drive it with. The defect class the harness exists to catch is measured, not hypothetical: a control wired to a browser API that silently no-ops inside the application's webview passed every unit test, because the test environment implements the API and the real webview does not.

The user fixed the constraints: **it must work on macOS first** — the primary development platform — and beyond that it must be long-term stable, maintainable, and robust.

# Approach

The harness is **WebdriverIO with `@wdio/tauri-service`**, driving the application through an **embedded WebDriver server** (`tauri-plugin-wdio-webdriver`) compiled into the app. That is what satisfies the constraints together: it runs on macOS — where no WKWebView driver exists and the stock `tauri-driver` cannot go — it is the framework's own recommended path rather than a bespoke bridge, and it speaks the standard WebDriver protocol, so scenarios find controls by what they are called on screen.

**The bridge exists only in harness builds.** The plugin rides an `e2e` cargo feature, and its capability grant lives in a second capabilities directory that the build script includes only when the feature is enabled — a normal build rejects the unknown permission, which is exactly the property wanted. Continuous integration proves the distributable binary carries no trace of the bridge by building without the feature and scanning the binary; the check is non-vacuous, measured at twenty-six matches with the feature and zero without.

**The harness binary is a real release build.** The application must be built with the `custom-protocol` feature (plus `e2e`), because the framework treats any build without it as a development build that loads the dev-server URL — against no running dev server that is a permanently blank window, not an error. `bun run e2e:build` produces the frontend and the correctly-featured binary in one step.

**Fresh profile by construction.** Scenarios launch the binary through a wrapper script that sets `HOME` to a scratch directory minted once per run, so a first-run scenario starts from genuinely nothing — no registry, no sentinel, no repositories — and later scenarios in the same run inherit that same home, which is what lets a returning-user scenario find the state the first-run scenario created.

**The native folder dialog is bridged by a seam, not stubbed.** The webview's IPC internals object is readonly, so page-side stubbing of plugin calls is impossible. Instead the folder pick is a purpose-built command on the app's own surface, and in harness builds only, that command honours an environment variable naming the folder to return instead of showing the native dialog. The scenario writes its fixture repository into that folder before clicking the add control.

**Two scenarios, ordered.** `first-run` drives the install experience end to end: choosing the password with the typo caught and unrecoverability stated, the sealed sentinel proven on disk, adding through the picker with conservative preselection, the acknowledgement gate on the first seal, the sealed file proven armored in place, and lock followed by a plainly-refused wrong password. `return-and-use` relaunches against the same home: the returning shield, unlock, masked structure with no value in the page, reveal and conceal, an edit saved with the file still sealed on disk, a staged exposure surfaced by the insistent alert, the recency warning on sealing it back, and a supervised password change after which the old password no longer opens Seal.

**Non-vacuity is part of done, and was done:** deliberately unwiring the empty state's add button — a control that renders but does nothing, the exact defect that motivated the axis — fails the run at that step.

# What exists

The harness; the `first-run` scenario fully green against the real application on macOS across three consecutive runs; the non-vacuity demonstration; the `return-and-use` scenario, whose early path — returning shield, unlock, masked open, sealed-on-disk, reveal, edit and save — passes when run in sequence (`bun run e2e:extended`); and the continuous-integration workflow, gated on the stable scenario, that builds the harness binary, drives the journey, and proves the distributable free of the bridge.

# What is missing

**The extended scenario's tail wedges on an embedded-bridge freeze.** At a wandering point around the acknowledgement-and-seal interactions, the driver stops receiving responses: the application's main thread is provably idle in its event loop, its tokio workers are parked, and the bridge's status endpoint stops answering — so the fault sits in the embedded server or its client under rapid command traffic, not in the application. Disabling the service's mock machinery, pausing after heavy operations, and granting the companion plugin all failed to cure it (the companion plugin did remove a five-second-per-command polling tax, which is why it stays). Until it is resolved upstream or worked around, continuous integration gates on `first-run` only and the extended run is invoked explicitly.

Also missing: a green run of the workflow on the hosted runner, and scenarios for the command-line resolve, an interrupted password change, and plaintext expiry.

# Steps

- [x] Research driver options against the constraints — macOS first, then stability and maintainability — and choose
- [x] Build the harness and the `first-run` scenario against a fresh profile
- [x] Prove it non-vacuous: wire an inert control deliberately, watch the run fail, remove it
- [~] The `return-and-use` scenario: early path green in sequence; the tail blocked on the embedded-bridge freeze above
- [~] Gate it in continuous integration — the workflow is authored, gated on the stable scenario; its first run on the hosted runner is pending
- [ ] Resolve the bridge freeze: report the reproduction upstream, and try moving the key-derivation-heavy command bodies onto blocking threads, which is correct on its own and may remove the trigger
- [ ] Scenarios for what remains undriven: the command-line resolve, an interrupted password change, plaintext expiry

# Open threads

- Whether the embedded provider also runs on the Linux runner, which would widen the gate beyond macOS.
