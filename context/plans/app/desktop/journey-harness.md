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

**A scenario may restart the application, and does so by killing the process rather than by resetting the session.** Reloading the WebDriver session reconnects the driver to the *same* process — measured, the process identity is unchanged across it and the application stays unlocked — so it cannot demonstrate anything about surviving a crash. An interruption is therefore a real `SIGKILL` against the running binary, followed by relaunching the same wrapper script and reconnecting; the relaunched process reads the scratch home the run has been using throughout, so it comes up as the returning user with whatever state the kill left on disk. The bridge global is reinstalled after the reconnect, since a new process starts without it.

**Four scenarios, ordered.** `first-run` drives the install experience end to end: choosing the password with the typo caught and unrecoverability stated, the sealed sentinel proven on disk, adding through the picker with conservative preselection, the acknowledgement gate on the first seal, the sealed file proven armored in place, and lock followed by a plainly-refused wrong password. `return-and-use` relaunches against the same home: the returning shield, unlock, masked structure with no value in the page, reveal and conceal, an edit saved with the file still sealed on disk, a staged exposure surfaced by the insistent alert, the recency warning on sealing it back, and a supervised password change after which the old password no longer opens Seal. `interrupted-rekey` runs against its own scratch home, because it establishes a vault of six managed files in order to have a rotation long enough to interrupt: it seals them, starts a password change, force-kills the application the moment a file's ciphertext on disk is observed to change, relaunches, and drives the resume — the unprompted banner, the screen naming which files still need the old password, the retry that finishes the job, and the old password refused afterwards. `living-with-it` runs against its own scratch home and drives the second-week texture rather than a feature: an exposure staged on disk, surfaced by name and cleared from beside the problem; a managed file deleted outside Seal, which must read as not found with its open control dead rather than as still sealed; the whole repository directory removed while the application is open, which must leave a way forward and no fault text in the interface; and a mid-session force-kill the application returns from. Its lock-and-unlock steps are load-bearing rather than incidental, because that is currently the only thing that makes the interface look at disk again.

**One scenario is not a journey.** `window-frame` (`bun run e2e:frame`) drives the window's own frame across the three surfaces that are not an altitude — the locked screen, the manage surface and the password change — asserting that each carries a drag region, starts below the platform's window controls, and, for the manage surface, that its tree region is the scrolling element while the document is not. It exists because that defect is invisible to every scenario that drives a *task*: the surfaces work, the controls respond, and the window is merely unusable as a window. It measures geometry off the running layout rather than asserting on markup, since the shipped defect was one where the CSS read as correct.

**The client's Tauri bridge global is installed by the harness.** The service runs a focus check before every `findElement`, `findElements`, `$`, `$$` and `elementClick`, and that check reaches Tauri through `window.__wdio_original_core__` — a page global the service reads but never assigns. Absent it, every one of those commands waits five seconds and then throws, so a scenario's waits expire against a page that was ready the whole time and the run appears to hang at a wandering point. The harness therefore binds that global to the webview's own IPC invoke once per session, in the runner's `before` hook, which is the client's defect and so belongs on the client side rather than in the application.

**Non-vacuity is part of done, and was done:** deliberately unwiring the empty state's add button — a control that renders but does nothing, the exact defect that motivated the axis — fails the run at that step.

# What exists

The harness; the `first-run` scenario fully green against the real application on macOS across three consecutive runs, each completing in about two seconds; the non-vacuity demonstration; the `return-and-use` scenario, **all nine steps green** (`bun run e2e:extended`) — returning shield, unlock, masked open, sealed-on-disk, reveal, edit and save, the staged exposure and its insistent alert, the recency warning followed by sealing from the alert, and the supervised password change after which the old password no longer opens Seal; and the continuous-integration workflow, gated on the stable scenario, that builds the harness binary, drives the journey, and proves the distributable free of the bridge.

**The freeze that blocked the tail is resolved.** It was never a freeze in the application or in the embedded server: the client's focus check, which runs before every element command, reads `window.__wdio_original_core__` and waits five seconds for a global that nothing in the service ever assigns. Every `$`, `$$`, `findElement`, `findElements` and `elementClick` therefore paid five seconds and then threw, so scenario waits expired against a page that had been ready throughout — and *where* a run appeared to hang moved with timing, which is what made it look like a wandering freeze. Binding that global to the webview's own IPC invoke in the runner's `before` hook removed the tax outright: `first-run` went from minutes and a mid-run wedge to eight of eight in 2.2 seconds.

Removing the delay exposed two assumptions the tax had been masking, both fixed in the scenarios. The first-run drive now meets the recency warning before the acknowledgement gate, because it seals a file it wrote moments earlier — correct product behaviour that the slower run had reordered. And the returning scenario, which runs as a second worker against the same live application, locks first if it arrives already unlocked, rather than assuming a fresh launch.

**All typing goes through one helper, and every field asserts what landed.** This is the harness's most expensive lesson: a per-character key stream **silently drops the spaces** out of a passphrase, so the shield established the vault under `correcthorsebatterystaple` while the scenario believed it had typed four words. Every later unlock typed the same way and so kept working, which hid the mismatch completely — until one field was typed correctly and was refused, which read as the product losing the vault. The plugin's key handling also appends to a field rather than replacing it, and a clear-then-set sequence leaves a React-controlled input's DOM value and component state disagreeing, so a field can read correctly while the component behind it holds nothing. The helper clicks the field, sets the whole string at once, and asserts the value, so any of these fails at the field where it happened.

**Assert what the surface actually shows at that altitude.** The `Repositories` heading belongs to the top-level screen alone; the breadcrumb carries the same word as a button at every other altitude. A step that returns the user to a repository — as the password change does — must not assert the heading, or it fails against a screen that is behaving correctly.

**The interrupted password change is driven, and it found a real defect.** The rotation's durable manifest was written only from the engine's final report, so throughout the run it still read all-pending: a force-quit left a manifest recording **0 of 7 converted** while a file on disk had already moved to the new password, and the resume screen asked for the old password on that file. The manifest now persists per file, and the same interruption records **2 of 7**. Recovery was never broken — the engine's derived progress finishes correctly either way — but the report the user reads was wrong in exactly the state the flow exists to handle. `password-change.md` owns the fix.

# What is missing

A green run of the workflow on the hosted runner, and scenarios for the command-line resolve and plaintext expiry.

**Plaintext expiry cannot be driven today, and the obstacle is a missing seam rather than a missing scenario.** The lifetime is fixed at fifteen minutes: `Session::new` hard-codes `DEFAULT_LIFETIME`, and the desktop's session is built through it with no override, so nothing a scenario can set makes a held secret expire inside a run. Waiting it out is not an option at the harness's timescale — the whole three-scenario suite completes in about twenty seconds. Driving `living-with-it` step 5 (and `use-a-secret` step 8, which is the same behaviour) therefore needs a seam first, of the same shape as the folder-pick override: honoured only in `e2e`-feature builds, so a distributable build cannot have its expiry shortened by an environment variable. That is a change to the command surface rather than to the harness, so it belongs to `commands.md` and wants framing there before a scenario is written.

Worth stating because it is the reason this step has never been driven, and because the obvious workaround — asserting expiry through the Rust suite alone — is exactly what the journeys axis does not accept.

# Steps

- [x] Research driver options against the constraints — macOS first, then stability and maintainability — and choose
- [x] Build the harness and the `first-run` scenario against a fresh profile
- [x] Prove it non-vacuous: wire an inert control deliberately, watch the run fail, remove it
- [x] The `return-and-use` scenario: all nine steps green in sequence, across two consecutive runs
- [~] Gate it in continuous integration — the workflow is authored, gated on the stable scenario; its first run on the hosted runner is pending
- [x] Resolve the bridge freeze — it was the client's unassigned `__wdio_original_core__` global, and the harness now installs it
- [x] The `interrupted-rekey` scenario: a force-quit partway through a rotation, relaunched and resumed, green across consecutive runs
- [x] The `living-with-it` scenario: the exposure surfaced and cleared, a file deleted outside Seal, a repository directory removed, and a mid-session kill
- [ ] Report the missing global upstream, so the harness's `before` hook can eventually be dropped
- [ ] Scenarios for what remains undriven: the command-line resolve, and plaintext expiry once `commands.md` provides a lifetime seam

# Open threads

- Whether the embedded provider also runs on the Linux runner, which would widen the gate beyond macOS.
