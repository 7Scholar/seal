Part of [the desktop plan](README.md).

# Scope

The command surface between the interface and Rust: which operations the interface may invoke, what each is permitted to return, and how blocking work is dispatched so the window never freezes. Out of scope: the state those commands read and write (`shell.md`) and the interface that calls them (`ui/`).

# Approach

## The surface is specific, never general

The interface is granted a small set of purpose-built operations — unlock, lock, ask whether unlocked, ask whether a master password is established, establish one, pick a repository folder, the cross-repo overview, open a managed file, reveal one value, save edits, seal a file, seal an explicitly chosen set of files, unseal a file, unseal an explicitly chosen set, close a file, list what is open, and stop managing a whole repository. There is deliberately no "read this path" or "decrypt these bytes" command: every path-taking command first checks the path against the registry and refuses anything not already managed, so a compromised interface cannot use Seal as a general-purpose file reader. Unlock and establish both prove the password against the sentinel before the session accepts it — the sentinel's semantics are `first-open.md`'s.

Picking a folder shows the native dialog from the Rust side and returns the chosen path or nothing, so the interface never receives filesystem powers beyond the one answer; in harness builds only, the command honours an environment override in place of the dialog (`journey-harness.md` owns why).

## The held-plaintext lifetime, and its harness seam

The session the commands hold is built with the session crate's default fifteen-minute lifetime. **In `e2e`-feature builds only, an environment variable may shorten it** — never lengthen it. The value is read once when the held state is constructed, parsed as whole seconds, and accepted only when it is both parseable and **strictly shorter than the default**; anything else leaves the default standing, so a malformed, zero, or longer value is ignored rather than honoured. Zero is refused because a lifetime of zero expires a secret before the user can read it, which is a different behaviour from a short one rather than an extreme of it.

The clamp is what makes the seam safe to state as a property rather than as a convention: the variable cannot weaken the product's guarantee in the direction that matters, in any build, because the only direction it can move the deadline is shorter. The feature gate is the outer guard and the clamp is the inner one, and neither is redundant — the gate keeps the branch out of a distributable binary entirely, while the clamp means that even inside a harness build the seam cannot be used to hold plaintext longer than the product promises.

This exists because plaintext expiry is otherwise undrivable by the journeys axis: the lifetime is fixed at fifteen minutes and a scenario completes in seconds, so no journey could ever witness a held secret expiring. `journey-harness.md` owns that reasoning; what belongs here is that the lifetime is a property of the command surface's held state, chosen once at construction, and that the seam is bounded in one direction only.

Capabilities grant the window only the core defaults plus Seal's own commands, rather than a broad permission set.

## What may cross, expressed as the shape of the API

**Only env files are editable, and the shape of the open result says so.** Opening a managed file returns either an editable env view or an opaque one carrying nothing but the path and the plaintext's length. The distinction is drawn from the file's name, and reveal and save both refuse anything that is not an editable env file. This is the root intent's rule — a non-env managed file is stored and encrypted as-is, never edited — enforced at the boundary rather than trusted to the interface. An `.envrc` is deliberately opaque despite the name: it is a shell script, and presenting it as key-value rows would corrupt it on save. Measured before the guard existed: a Terraform `.tfvars` opened as two editable rows and saving rewrote `secret_key = "x"` as `secret_key="x"`, dropping the spacing and quoting the format requires.

**Opening an env file returns structure, not content.** The returned view carries each variable's name, a fixed mask in place of its value, and whether the value is empty — plus the file's duplicate keys and a count of lines that could not be parsed. It never carries a value. The plaintext itself stays in the session in Rust.

The view does carry **the path it opened**, which is not secret material and is what lets the interface tie the view to the file. The test asserting that no secret crosses the boundary therefore searches the serialized view **with the path field removed**: a path is chosen by the user and can contain any substring at all, so including it makes the assertion depend on what the file happens to be called rather than on what the view carries.

**The overview reports each file as the disk has it, never as the registry last recorded it.** The cross-repo view reconciles every managed file against disk as it is built, and each file's reported state is what that reconciliation observed — so a file deleted, sealed, or unsealed outside Seal reads as it actually is. The recorded state is the fallback used only for a file reconciliation had nothing to say about. The exposure alert stays a separate flag on top of that, because "recorded sealed, found readable" is a different claim from the state itself and is the one case the registry deliberately refuses to absorb. Serving the recorded state instead is the specific defect this rules out: it made a deleted file read `Sealed` with a live open control, and every unit test still passed because the registry library reported the divergence correctly and only its consumer discarded it.

**Sealing and unsealing are symmetric commands, and unsealing is not releasing.** `unseal_file` restores the file's plaintext at its own path and **keeps the registry entry**, recording the observed state as plaintext; `release` removes the entry and is the operation that ends management. They share the engine call that writes plaintext and nothing else, because the promise each makes to the user is opposite — one keeps the file in Seal's view, the other takes it out. Unsealing also closes any plaintext the session was holding, so no held copy outlives the state change it describes.

Recording plaintext rather than leaving the file recorded as sealed is what keeps the exposure alert honest: the alert is the *recorded sealed, found readable* divergence, so a deliberate unseal that failed to record would raise a permanent false alarm on the user's own choice. The acknowledgement gate does not apply — it guards what cannot be undone, and unsealing is undone by sealing.

**Opening reads the file as it is, so a managed file that is readable on disk opens too.** Open classifies before it decrypts: a sealed file is unsealed into memory, and a readable one is read as it stands. Both then take the same path — the plaintext is held by the session, the view is masked, and the file on disk is left exactly as it was found. Unsealing unconditionally is the specific defect this rules out: every managed file that was not yet sealed failed to open with `notSealed`, so the files the user had brought under management but not yet protected were the ones the application could not show them. Saving is the mirror image and deliberately asymmetric: whatever the file's state on open, a save leaves it **sealed**, because the engine writes no plaintext to a managed path.

**A value crosses only one at a time, and only when asked for.** Reveal takes a single key and returns that value's bytes. It reads exclusively from plaintext the session already holds, so a reveal on a file that is not open fails rather than silently unsealing it — exposure is bounded to what the user explicitly asked to see, and there is no path by which the interface can pull a file's contents without the user opening it first.

Revealed bytes are returned as a raw response rather than as a serialised string, which keeps the value out of the JSON serialisation path.

**Saving sends back edits, never the file.** The interface sends key-value pairs; the plaintext held in Rust is edited through the lossless env model and re-sealed from memory. The whole secret never makes the round trip. An edit naming a key the file does not contain is refused rather than silently adding it, since a typo would otherwise create a new variable rather than change the intended one.

**An operation over many files reports per file, and never aborts on the first failure.** Sealing a chosen set and releasing a whole repository both take the set explicitly, run each member through the same guarded single-file path — so the managed-path check and the acknowledgement gate hold for every member rather than once for the batch — and return one outcome per path carrying whether it succeeded and, if not, which error kind stopped it. A failure on one member never prevents the members after it from being attempted. The alternative, looping in the interface, is refused: it would move both gates to the caller, where a bug or a second frontend could skip them. The outcome carries a path and an error kind only, so it satisfies the secret-free rule below by construction.

**Errors carry no secret material, and this is checked by the compiler.** The error crossing the boundary is a kind plus an optional path — nothing else. A private in-crate assertion destructures the error type and requires every field's type to implement a marker trait implemented only for types proven secret-free. Adding a free-form `String` field fails to compile even when every construction site is updated, so an error can never grow a field carrying a passphrase, a value, or an underlying error's text. The assertion lives **inside** the crate: an equivalent check in a test crate cannot work, because a `#[non_exhaustive]` type forces a wildcard arm that silently absorbs new variants.

## Keeping the window responsive

Every command is `async`, so it runs on the runtime rather than the interface thread — a key derivation of several hundred milliseconds would otherwise visibly hang the window on every unlock.

Shared state is a plain mutex, and **the guard must never be held across an await**. This is enforced by the compiler rather than by review: Tauri's async command path requires the returned future to be `Send`, a `MutexGuard` is not `Send`, so a guard that lives across an await fails to build with a message naming the guard and the await. The check only arms once a command is registered in the handler — an unregistered command with the same defect compiles silently, so a command is not considered checked until it is wired in.

## Persisting registry changes

Commands that change managed state write through the registry's compare-and-retry update rather than storing a snapshot. The application holds an in-memory mirror for display, but a save re-reads the on-disk state, applies the change, and retries on a revision mismatch, so a concurrent writer is never clobbered by a stale mirror.

# What exists

The domain layer and the command layer, plus the Tauri shell wiring that `shell.md` was waiting on: managed state, the wipe on the application-level exit request, the background sweep, the registered handler, and the hardened window configuration.

Forty tests cover the surface against a real engine and registry — masking, per-key reveal, reveal refused when the file is not open, unmanaged paths refused, a save that preserves comments and changes exactly one value, a readable managed file opening and saving back sealed, errors that never echo a passphrase or a value, the wipe the exit handler calls, and a managed non-env file opening as opaque with save and reveal refused. Unsealing is covered in both directions that matter: the file becomes readable and **stays managed**, it is recorded plaintext so it raises **no** exposure alert, a file made readable outside Seal **still** raises one, held plaintext is dropped, an unmanaged path is refused without touching the file, and a batch reports per path.

Both of unsealing's load-bearing guards were confirmed non-vacuous by breaking them: recording `Sealed` instead of `Plaintext` fails the alert test, and dropping the registry entry fails the stays-managed test.

Guards confirmed non-vacuous by breaking them: returning real values in place of the mask fails 2 tests, removing the managed-path check fails 1, a no-op exit wipe fails 1, and treating every file as editable fails 4. The compile-time error-payload check was confirmed by adding a `String` field, which fails to build.

# What is missing

The per-file surface is complete. Getting a file into management, and the gates on sealing, are `lifecycle.md` — now complete too, so the registry these commands read can be populated.

The supervised master-password change is deferred into `ui/`, since its behaviour is mostly the flow around it; the engine already implements the hard part.

# Steps

- [x] Define the command set and implement each over the domain layer.
- [x] Implement each command asynchronously with shared state behind a mutex whose guard cannot cross an await.
- [x] Enforce the boundary rule in the shape of the commands: masked structure on open, per-key reveal as raw bytes, edits rather than files on save.
- [x] Make it impossible for an error to carry secret material, checked at compile time.
- [x] Configure capabilities so the interface is granted only what it needs.
- [x] Tests against a real engine and registry, with each guard confirmed non-vacuous.
- [ ] The password-change command with progress and per-file retry, once the interface exists to supervise it.

# Open threads

- Whether reveal should be rate-limited or bounded in number, so a compromised interface cannot walk a whole file one value at a time. The cost is a full derivation per file rather than per value, so it is cheap to consider once the interface exists.
- The registry directory is currently derived from the home directory directly. If a platform-conventional configuration location is wanted instead, that is a one-line change here and a question for packaging rather than for this plan.
