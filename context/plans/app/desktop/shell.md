Part of [the desktop plan](README.md).

# Scope

The Tauri shell: the application's managed state, the lifetimes of the secrets it holds, the points at which they are cleared, and the window and webview configuration that keeps the interface from persisting or leaking them. Out of scope: the command surface (`commands.md`) and anything the interface renders (`ui/`).

# Approach

## The two lifetimes

The session and the files it holds open have **different** lifetimes, and conflating them is the mistake this design exists to avoid.

The **session** holds the master password and any per-file password overrides. It lasts from unlock until it is explicitly ended — by the seal action, by quitting, or by anything that cannot establish the time. It carries **no** deadline of its own: a session that expired on a timer would lock a user out mid-edit for no security gain, since what actually needs bounding is how long decrypted *plaintext* survives.

An **open file** holds decrypted plaintext and does carry a deadline: fifteen minutes by default. Reading a file's plaintext **refreshes** its deadline, so the bound is on idleness rather than on total time open — a user editing a file continuously keeps it, and a file left untouched expires whether or not the application is in the foreground.

A file expiring never ends the session; ending the session always drops every open file.

## Expiry is a comparison on access, never a timer

Every held deadline is a **pair**: one wall-clock and one monotonic. A deadline has passed when **either** component has passed. Both are necessary and each covers the other's blind spot: the monotonic clock does not advance while the machine sleeps, and the wall clock can be moved backwards by a clock correction or deliberately by someone hoping to extend a secret's life.

The check happens **on the read path**, so plaintext is never handed out after its deadline regardless of whether any timer ran. This is what makes it fail-closed; a timer that does not fire is fail-open, which is the wrong posture for a security timeout.

**Any failure to read the clock is treated as expiry**, not as time remaining. An unreadable clock locks the session outright rather than leaving it open with unknowable age. Deadline arithmetic that would overflow yields no deadline and therefore refuses, rather than silently wrapping to a deadline in the past or the far future.

The clock is reached through a seam rather than called directly, which is what makes sleep, a frozen wall clock, a backwards jump, and an unreadable clock all directly testable instead of matters of argument.

A coarse **sweep** drops expired files so the interface does not display a file as open after it has expired, and locks the session if the clock has become unreadable. It is a display concern only: correctness never depends on it having run, and every guarantee above holds with the sweep removed entirely.

## Clearing

Wiping is explicit. It drops the master password, every override, and every open file's plaintext, and returns the session to locked. It runs when the session ends, when the application exits, and before a fresh unlock installs a new password — so no material from a previous unlock can survive into the next one.

Plaintext buffers zero themselves both on an explicit wipe and when dropped. The explicit path is the one that must be relied on: **the normal quit path terminates the process without running destructors**, so drop-based wiping is a backstop for the cases where it genuinely runs, never the mechanism. Correspondingly the wipe hangs off the application-level exit request rather than a window closing, because the platform's quit shortcut can bypass window-close events entirely.

A force-quit or power loss runs nothing at all. That bound is stated rather than engineered around, and it is the strongest argument for the expiry being short.

## The API's shape

Access to held material goes through methods that can refuse, never through fields — every read is therefore forced through the expiry check, and no caller can hold a reference across the moment a secret expires. Nothing in the crate's public surface hands out raw secret text: a helper that only unwraps a secret is a leak-shaped API even when its only caller is a test.

# What exists

The session itself, in `seal-session`: the two lifetimes, the dual-clock deadline, fail-closed access, the sweep, and explicit wiping. It is engine-independent and holds no Tauri types, so it is testable without a running application.

Sixteen tests cover it, each load-bearing guard confirmed non-vacuous by breaking it and watching the suite fail:

- monotonic-only expiry — the naive timer-shaped design — fails 4 tests, all sleep-related
- wall-clock-only expiry fails 2, including the backwards-clock attack
- treating an unreadable clock as "no time has passed" fails 2
- a wipe that does nothing fails 1

# What is missing

The Tauri shell proper: the managed-state wiring, the exit-request hook that calls the wipe, the background sweep task, and the hardened window and webview configuration. These need the Tauri dependency, which arrives with `commands.md`.

# Steps

- [x] Define the managed state: the session holding the master password and any overrides, and the set of open files each holding plaintext and its deadlines.
- [x] Implement expiry as a fail-closed check on access, comparing both a wall-clock and a monotonic deadline and treating any error, or a clock that has moved backwards, as expiry.
- [x] Implement explicit wiping on session end and before re-unlock, with drop-based wiping as a backstop.
- [x] Add the coarse sweep that keeps the interface honest, explicitly not relied on for correctness.
- [x] Tests: expiry after sleep, after monotonic time, under a backwards clock, and under an unreadable clock; wiping; and each guard confirmed non-vacuous.
- [ ] Wire the session into Tauri managed state and call the wipe from the application-level exit request.
- [ ] Run the sweep on a background interval.
- [ ] Configure the window: a memory-only webview data store, a strict content-security policy, developer tooling absent from release builds, and the configuration asserted rather than assumed.

# Open threads

- Whether to lock the master password's pages against swap. Small and bounded, and the platform encrypts swap by default, so this is defence in depth to settle with measurement.
- Whether system sleep and screen lock should end the session immediately. The platform publishes the notifications but the framework does not wrap them, so it is custom glue; it strengthens the model but never replaces the deadline check, since a force-quit bypasses it regardless.
- The default fifteen-minute lifetime is not yet configurable. Deciding whether it should be is a question for the interface, not for this crate, which already takes it as a parameter.
