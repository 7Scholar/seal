# Intent

## What & why

The desktop application is Seal's face and the reason it is an application at all: a Tauri 2 app with a React + TypeScript (Vite) frontend where all management happens. It spans the Rust shell (window and app lifecycle, the IPC command surface, capability configuration, the unlocked-session state) and the UI (the cross-repo view of repos and managed files with their sealed/unsealed tags, the repo manage flow with its candidate confirmation, seal/unseal actions, the explicit session seal/unseal control, and the dedicated Vercel-style environment-variables editor for env files — the only editing surface, since non-env files are never edited in the app). It consumes the engine and the registry through a thin command layer per the Tauri practices doc. It is done when a user can do everything the root intent promises through the UI, with the session model the root Approach fixes: unlocked by password, ended by quit or the seal action.

## Approach

The application is the one place where secret material lives in memory for longer than a single operation, so its design is organised around that fact rather than around its screens. Everything below follows from where secrets are, how long they stay, and what crosses the boundary into the webview.

### The session, and where secrets live

Passwords and decrypted plaintext live only in the Rust process, in state the application manages. Nothing secret is written to disk, and nothing secret is held by the frontend beyond what the user is actively looking at.

Two kinds of secret material are held, with different lifetimes. The **session** holds the master password and any per-repo overrides, from unlock until the session ends. An **open file** holds its decrypted plaintext, from the moment the user opens it until it expires, is sealed, or the application quits.

**Every held secret carries a deadline, and expiry is decided by checking that deadline on access rather than by a timer firing.** This is not a stylistic choice. The monotonic clock that ordinary timers are built on **stops while the machine sleeps** — the platform's own documentation says so, and it was measured here as losing more than seven hours across a single night. A timer-based expiry would therefore hold plaintext through a closed lid and wake believing a minute had passed, failing in exactly the situation the fifteen-minute expiry exists for.

Each held secret carries **both** a wall-clock deadline and a monotonic one, and expires when **either** says it should. Neither alone is sufficient: the monotonic clock misses time spent asleep, and the wall clock can be moved backwards by a clock correction or by someone hoping to extend a secret's life. A check that fails closed on both cannot be defeated by either. Any error reading elapsed time is treated as expiry rather than as time remaining.

Expiry is checked on the read path, so a secret is never handed out after its deadline regardless of whether any timer ran. A timer that never fires is a fail-open design; a deadline compared at the moment of access is fail-closed, which is the only acceptable posture for a security timeout.

A coarse background sweep runs alongside, purely so the interface does not display a file as open after it has expired. It is never the mechanism correctness depends on; it only keeps the display honest.

### Clearing, and what cannot be promised

Secrets are wiped explicitly when the session ends, when a file is sealed or expires, and when the application exits. The exit case needs its own handling: **the normal quit path terminates the process without running destructors**, so a design that relies on values being wiped when they go out of scope would silently never wipe anything on the ordinary path. The wipe is therefore an explicit step in the exit handler, with scope-based wiping kept only as a backstop for the cases where it genuinely runs.

The wipe hangs off the application-level exit request rather than a window closing, because the platform's quit shortcut can bypass window-close events entirely — cleaning up on a window event would silently do nothing for the most common way a user quits.

What cannot be promised is stated rather than engineered around: a force-quit or a power loss runs nothing, so secrets remain in memory until the operating system reclaims those pages. This is the honest bound of any application of this kind, and it is the strongest argument for the expiry being short.

### The boundary into the interface

**Anything sent to the frontend has left Seal's control permanently.** Text in the webview cannot be reliably erased, so the design minimises what crosses rather than pretending it can be cleaned up afterwards.

Concretely: the full plaintext of a file stays in Rust. The editor receives the *structure* of an env file — the variable names, and each value masked — and receives an actual value only when the user explicitly reveals that one row. Saving sends back the edits, and the file is re-sealed from the plaintext held in Rust, so the whole secret never makes the round trip. This is the pattern password managers converge on, and it is chosen for the same reason: it is the only part of the exposure that can actually be reduced.

The hosted platforms this editor takes its shape from went further and made their most sensitive values **permanently unreadable once written** — no reveal at any price. That is the right answer for a service that stores a secret on your behalf, and the wrong one here: Seal is the editor of a file the user owns, and a value that cannot be read back cannot be corrected, only overwritten blind. Reveal-per-row is therefore a deliberate divergence, not an oversight, and the exposure it opens is bounded by revealing one value at a time rather than a file at a time.

The window is configured so the webview persists nothing at all: its data store is memory-only, so no local storage, database, or cache written by the interface can reach the disk even by accident. A strict content-security policy bounds where the interface may send anything, and fields carrying secrets opt out of spellchecking and autofill. Developer tooling stays compiled out of release builds, which the platform then enforces by refusing inspection of a shipped application.

Values that must cross the boundary are sent as raw bytes rather than as text, which keeps them out of the serialisation path and leaves them in memory the interface can actually overwrite. Detailed request and response tracing is never enabled in a release build, since that machinery records entire response bodies — which for this application means the secrets themselves.

### Editing an env file without destroying it

A managed env file belongs to the user's repository and is very often commented, ordered deliberately, and formatted by hand. **Saving an edit must return a file that differs only where the user changed something.** Every available parsing library parses to values and discards the rest, so round-tripping through one would silently strip every comment the first time a user saved — a data-loss bug in a tool whose whole job is guarding that file.

The file is therefore modelled as a sequence of lines, each retaining its original text. Saving re-renders only the lines whose variable actually changed and emits every other line byte-for-byte as it was read, which makes an untouched round trip exact by construction rather than by care. Lines that cannot be parsed are preserved verbatim rather than dropped, since silently deleting what it does not understand is the worst thing an editor of somebody else's file can do. Duplicate keys are kept as distinct lines rather than collapsed, because implementations genuinely disagree on whether the first or last wins, and the honest response to that ambiguity is to show the user both rather than pick silently. Newline style and whether the file ends with one are preserved too, so saving does not produce a whole-file difference for a colleague on another platform.

### Talking to the engine without freezing

Every command that reaches the engine runs asynchronously and moves the blocking work off the interface thread, because a key derivation takes hundreds of milliseconds and would otherwise visibly hang the window on every unlock. Shared state uses a plain mutex whose guard never crosses an await point, which the compiler enforces rather than leaving to review.

### What the interface must insist on

Two flows carry more weight than their screens suggest, and their behaviour is fixed here rather than left to interface design.

**A file found unsealed that Seal recorded as sealed is an alert, not a status.** The registry detects it; the application must surface it prominently and keep surfacing it, because it means a secret is sitting in the clear in a repository — most likely because an editor had the file open when it was sealed and later saved over it.

**Changing the master password is supervised and never left half-done.** Before starting, the interface asks — as a question needing an answer, not a warning to dismiss — whether the user has a backup, and states plainly that both passwords must be remembered until it finishes and that a forgotten old password cannot be rescued by it. During the run it shows real progress. Files that fail transiently are retried by the engine without the user seeing them; what survives retries appears as a persistent banner naming each stuck file, the reason, and a control that retries it. The banner is not dismissible, because a half-converted set left unattended is what turns a recoverable situation into a confusing one months later when only one password is still remembered.

# Plans

- [x] shell.md -> the Tauri shell: session state, secret lifetimes and clearing, lifecycle hooks, window and webview hardening
- [x] commands.md -> the IPC surface: the command set, what may cross the boundary, and how blocking work is dispatched
- [x] dotenv.md -> lossless env-file parsing and rendering, so saving preserves comments, order and formatting
- [x] lifecycle.md -> bringing files under management, removal from it, the pre-seal open-file check, and the irreversibility acknowledgements
- [~] ui/ -> the interface: the navigation model, the cross-repo view, the manage flow, the environment-variables editor, and the two flows that must insist. **`navigation/` is in flight: its surfaces need the depth pass its cursor names.**
- [x] first-open.md -> establishing the master password on the first open, verifying it on every open after, and the empty state's onboarding weight
- [~] journey-harness.md -> the harness that drives the built application for the journeys axis; macOS first

# Cursor

Solutioned, and decomposed into four children. The design is grounded in research and in one measurement that changed it: the monotonic clock underlying ordinary timers stops during system sleep — verified here as losing 7.26 hours overnight — so secret expiry is a wall-clock deadline checked on access rather than a timer.

`dotenv.md` is complete: an untouched file round-trips byte-for-byte and an edit changes exactly one line, verified against a lossy renderer that fails seven of its fourteen tests.

`shell.md` and `commands.md` are both complete, and the application builds and links as a real Tauri app. The session, the dual-clock fail-closed expiry, the explicit wipe on the exit request, the background sweep and the hardened window are all in place, as is the command surface: masked structure on open, a per-key reveal returning raw bytes, edits rather than files on save, and an error type the compiler forbids from carrying secret material.

The webview's memory-only data store was confirmed at the platform layer rather than trusted from documentation — it resolves to the non-persistent website data store on macOS, ahead of every other branch.

An audit against the root intent found that the per-file surface was built while the surface that gets files *into* management was not, so a fresh install can currently unlock and lock and nothing else. That gap is now carved as `lifecycle.md` rather than left implicit: bringing files under management, removal from it, the pre-seal open-file check, and the irreversibility acknowledgements the intent requires before a first seal.

The same audit caught two defects that are now fixed: a managed non-env file was parsed and re-rendered as an env file — measured corrupting a Terraform `.tfvars` on save — and a per-repo password override never reached any file inside the repo.

`lifecycle.md` is now complete, and with it the gap the audit found: a folder's files can be brought under management, a file can be released from it, and sealing is gated on acknowledging the two consequences that cannot be undone. Its research changed the design — the "notice a file is open in an editor" requirement cannot be met by checking descriptors, because editors hold none on files open in tabs, so it became a recency warning that states its own limit with reconciliation as the real safety net.

`ui/` is complete: the frontend, every screen, and the supervised password change, designed from a survey of the products this interface will be judged against rather than invented. Seventy-six interface tests alongside the Rust suite, with each load-bearing rule confirmed by reintroducing the exact defect it prevents — including two that comparable products actually shipped.

Every child above the last two is complete **as code**, and the application is nonetheless not usable — a first-time user cannot get past the opening screen. Those defects live between these plans rather than inside any of them, which is the blind spot [the journeys axis](../../../journeys/README.md) exists to close. The desktop application is not done until its journeys are satisfied.

The journeys' first answers landed and are built. `first-open.md` is complete: a sealed sentinel records that a master password exists, establishment demands the password twice and states unrecoverability at the choosing moment, unlock verifies against the sentinel instead of accepting anything, the password change carries the sentinel as its first manifest entry — and the first-run journey was driven end to end by the automated harness, which is what closed it. The unhappy paths got their surface too: every command failure reaches the user in plain language (`ui/errors.md`), a locked session re-locks to the shield with a notice, sealing warns on a freshly-modified file, and the folder pick is a purpose-built native-dialog command.

`journey-harness.md` is in flight: WebdriverIO driving the real release build through an embedded WebDriver bridge that exists only in harness builds, with `first-run` green across three consecutive runs, the non-vacuity proof done, and continuous integration gated on it. **The freeze that blocked the extended scenario is resolved** — it was a five-second timeout the client paid on every element command, waiting for a page global the client reads but never assigns, so the application was never at fault; installing it took `first-run` from minutes and a mid-run wedge to eight of eight in 2.2 seconds. The returning scenario now drives eight of its nine steps, which satisfied [the exposure journey](../../../journeys/exposure.md).

The returning scenario now drives **all nine of its steps**, which satisfied [the exposure journey](../../../journeys/exposure.md) and put the supervised password change under a real drive for the first time — the run, the old password refused afterwards, the new one opening the file, and the step confirmed non-vacuous by dropping the sentinel from the rotation. Reaching that step first produced a false alarm worth remembering: it looked like the change had left the vault openable by neither password, and the cause was the harness typing passwords a character at a time with the spaces silently dropped. All typing now goes through one helper that asserts what landed.

`ui/` gained the concern its children never held: the **shell**. Every screen had been built as a full-screen replacement, so there was no persistent frame, no navigation, and no way to work in one repository — which does not scale to the cross-repo span the root intent promises. `ui/shell-layout.md` is complete: a two-level repository sidebar that stays present while a file is edited, a detail surface with a stable selection model, and the disclosure architecture deciding what the interface shows against what it collapses — bounded by the rule that disclosure never defers an alert, a state, or a consequence. **Its frame has since been withdrawn** in favour of `ui/navigation/` below; the disclosure architecture it established outlived it and still governs the interface.

It brought the last piece of Rust scope here with it: a **batch seal** command taking an explicitly selected set of paths, running each through the same guarded single-file path so the managed-path check and the acknowledgement gate hold per file, and returning a per-path outcome rather than a count. It is a command rather than an interface loop so both gates stay where the interface cannot forget them. Releasing a whole repository follows the same shape.

`ui/repo-layer/` is **complete**, and with it the interface reads as what the root intent promises: a layer over repositories the user still owns. Adding a repository draws the repository itself with Seal's judgement marked on it, the steady-state surface draws the managed set as a tree in its real directory structure, and *import* is retired from the product down to the command name. The folder checkbox is deliberately scoped to detected files, so a single click can never queue a repository's source for sealing.

It carried Rust scope again — the scan now returns structure rather than candidates — and it produced the sharpest evidence yet for the journeys axis: a serde casing mismatch that both sides' unit suites passed straight through, and that only the driven application caught.

`ui/navigation/` **replaced the shell rather than extending it, and is in flight rather than complete.** The product owner withdrew the sidebar for Supabase-style routing: a breadcrumb trail in the title bar over three full-width altitudes — repository tiles, a repository's files as large rows, and the file itself — with a chevron switcher on the repository and file segments. The first-run journey drives the new model end to end against a release build, all eight checks green.

Its surfaces were built only for the populated state and the breadcrumb diverges from the reference supplied for it — found by the product owner in the running application, caught by nothing automated, and now recorded in its own cursor.

Two parts of it were not layout. The interface gained **light, dark and system themes**, which needed a Rust-side store and two commands: the webview is deliberately memory-only, so a preference cannot persist in it — the one place this redesign touched the command surface. And the **title bar became draggable**, which was a real bug with a driven reproduction: the strip carried the framework's drag attribute in its bare form, which drags only on a direct press of the element itself, so every part of the strip a user actually presses was dead. The CSS property that looks like the mechanism is inert and discarded by this webview — recorded in `ui/navigation/MEMORY.md`, because it is invisible from the code and would be "fixed" the wrong way.

# Open threads

- Whether to treat system sleep and screen lock as immediate session-lock triggers. The platform exposes the notifications but the framework does not wrap them, so it is custom platform glue; it would strengthen the model but is an addition to the wall-clock check rather than a replacement, since a force-quit bypasses it either way.
- Whether to lock the master password's memory pages against being written to swap. It is a small, bounded amount of material, and the platform encrypts swap by default, so this is a defence-in-depth question to settle with measurement rather than assumption.
