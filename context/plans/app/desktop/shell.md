Part of [the desktop plan](README.md).

# Scope

The Tauri shell: the application's managed state, the lifetimes of the secrets it holds, the points at which they are cleared, and the window and webview configuration that keeps the interface from persisting or leaking them. Out of scope: the command surface (`commands.md`) and anything the interface renders (`ui/`).

# What exists

Nothing implemented. The design is settled in the [desktop Approach](README.md), including the measurement that fixed the expiry mechanism.

# What is missing

Everything: the session and open-file state, the dual-deadline expiry, the explicit wipe on exit, and the hardened window configuration.

# Steps

- [ ] Define the managed state: the session holding the master password and any repo overrides, and the set of open files each holding plaintext and its deadlines.
- [ ] Implement expiry as a fail-closed check on access, comparing both a wall-clock and a monotonic deadline and treating any error, or a clock that has moved backwards, as expiry.
- [ ] Implement explicit wiping on session end, on sealing or expiring a file, and from the application-level exit request rather than a window event.
- [ ] Add the coarse background sweep that keeps the interface honest, explicitly not relied on for correctness.
- [ ] Configure the window: a memory-only webview data store, a strict content-security policy, developer tooling absent from release builds.
- [ ] Tests: a secret is refused after its wall-clock deadline even when the monotonic clock has not advanced; refused after the monotonic deadline; refused when the clock moves backwards; wiped on session end and on the exit path; and the webview configuration asserted rather than assumed.

# Open threads

- Whether to lock the master password's pages against swap. Small and bounded, and the platform encrypts swap by default, so this is defence in depth to settle with measurement.
- Whether system sleep and screen lock should end the session immediately. The platform publishes the notifications but the framework does not wrap them, so it is custom glue; it strengthens the model but never replaces the deadline check, since a force-quit bypasses it regardless.
