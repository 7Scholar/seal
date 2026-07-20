Part of [the desktop plan](README.md).

# Scope

The command surface between the interface and Rust: which operations the interface may invoke, what each is permitted to return, and how blocking work is dispatched so the window never freezes. Out of scope: the state those commands read and write (`shell.md`) and the interface that calls them (`ui/`).

# Approach

## The surface is specific, never general

The interface is granted a small set of purpose-built operations — unlock, lock, ask whether unlocked, the cross-repo overview, open a managed file, reveal one value, save edits, seal a file, close a file, and list what is open. There is deliberately no "read this path" or "decrypt these bytes" command: every path-taking command first checks the path against the registry and refuses anything not already managed, so a compromised interface cannot use Seal as a general-purpose file reader.

Capabilities grant the window only the core defaults plus Seal's own commands, rather than a broad permission set.

## What may cross, expressed as the shape of the API

**Only env files are editable, and the shape of the open result says so.** Opening a managed file returns either an editable env view or an opaque one carrying nothing but the path and the plaintext's length. The distinction is drawn from the file's name, and reveal and save both refuse anything that is not an editable env file. This is the root intent's rule — a non-env managed file is stored and encrypted as-is, never edited — enforced at the boundary rather than trusted to the interface. An `.envrc` is deliberately opaque despite the name: it is a shell script, and presenting it as key-value rows would corrupt it on save. Measured before the guard existed: a Terraform `.tfvars` opened as two editable rows and saving rewrote `secret_key = "x"` as `secret_key="x"`, dropping the spacing and quoting the format requires.

**Opening an env file returns structure, not content.** The returned view carries each variable's name, a fixed mask in place of its value, and whether the value is empty — plus the file's duplicate keys and a count of lines that could not be parsed. It never carries a value. The plaintext itself stays in the session in Rust.

**A value crosses only one at a time, and only when asked for.** Reveal takes a single key and returns that value's bytes. It reads exclusively from plaintext the session already holds, so a reveal on a file that is not open fails rather than silently unsealing it — exposure is bounded to what the user explicitly asked to see, and there is no path by which the interface can pull a file's contents without the user opening it first.

Revealed bytes are returned as a raw response rather than as a serialised string, which keeps the value out of the JSON serialisation path.

**Saving sends back edits, never the file.** The interface sends key-value pairs; the plaintext held in Rust is edited through the lossless env model and re-sealed from memory. The whole secret never makes the round trip. An edit naming a key the file does not contain is refused rather than silently adding it, since a typo would otherwise create a new variable rather than change the intended one.

**Errors carry no secret material, and this is checked by the compiler.** The error crossing the boundary is a kind plus an optional path — nothing else. A private in-crate assertion destructures the error type and requires every field's type to implement a marker trait implemented only for types proven secret-free. Adding a free-form `String` field fails to compile even when every construction site is updated, so an error can never grow a field carrying a passphrase, a value, or an underlying error's text. The assertion lives **inside** the crate: an equivalent check in a test crate cannot work, because a `#[non_exhaustive]` type forces a wildcard arm that silently absorbs new variants.

## Keeping the window responsive

Every command is `async`, so it runs on the runtime rather than the interface thread — a key derivation of several hundred milliseconds would otherwise visibly hang the window on every unlock.

Shared state is a plain mutex, and **the guard must never be held across an await**. This is enforced by the compiler rather than by review: Tauri's async command path requires the returned future to be `Send`, a `MutexGuard` is not `Send`, so a guard that lives across an await fails to build with a message naming the guard and the await. The check only arms once a command is registered in the handler — an unregistered command with the same defect compiles silently, so a command is not considered checked until it is wired in.

## Persisting registry changes

Commands that change managed state write through the registry's compare-and-retry update rather than storing a snapshot. The application holds an in-memory mirror for display, but a save re-reads the on-disk state, applies the change, and retries on a revision mismatch, so a concurrent writer is never clobbered by a stale mirror.

# What exists

The domain layer and the command layer, plus the Tauri shell wiring that `shell.md` was waiting on: managed state, the wipe on the application-level exit request, the background sweep, the registered handler, and the hardened window configuration.

Twenty-four tests cover the surface against a real engine and registry — masking, per-key reveal, reveal refused when the file is not open, unmanaged paths refused, a save that preserves comments and changes exactly one value, files staying sealed on disk throughout, errors that never echo a passphrase or a value, the wipe the exit handler calls, and a managed non-env file opening as opaque with save and reveal refused.

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
