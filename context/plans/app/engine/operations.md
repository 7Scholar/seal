Part of [the engine plan](README.md).

# Scope

The engine's public API: the classify, seal, unseal-to-a-sink, verify and multi-file re-seal operations; the advisory lock that makes their guard conditions real; the guard conditions themselves; passphrase handling across the boundary; and the error enum consumers match on. No *read* operation writes plaintext to a managed file's path; the one operation that does is named for that alone and is reached only by callers deliberately changing a file's state. Composes `format.md` and `replace.md` into the surface the CLI and the desktop app consume. Out of scope: resolving *which* passphrase applies (the caller supplies it, since the registry owns repo overrides) and anything about how a passphrase is collected from a human.

# What exists

The advisory lock and the single-file operations, implemented and verified.

**The lock** is a hidden sibling file beside the target, held for the whole operation and **released explicitly when the handle is dropped**, before the descriptor is closed. The kernel does drop an `flock` when the last descriptor referring to it closes, so a process that dies never leaves a stuck lock — but relying on the close alone is not sufficient in-process: the release is observable only after the descriptor is actually reclaimed, and a re-acquisition issued immediately after the drop can still be refused as busy. Unlocking first makes the release ordered with respect to the next acquisition rather than merely eventual. It excludes other processes and this process alike, verified in both directions by driving a second process. Acquiring does not require the target to exist, since sealing may reach a path that is about to be created. The lock file is deliberately never deleted, for the reason recorded in `MEMORY.md`: unlinking it while another holder is active lets that holder lock a fresh inode, which converts mutual exclusion into the appearance of it.

**The operations** are classify, seal, unseal-to-a-sink, and verify. Each acquires the lock before opening the file, so the guard conditions are real rather than racing: seal refuses a file that is already sealed, and the unseal operations refuse one that is not sealed. Classification happens on the same open handle the operation goes on to use, and the handle is rewound afterwards, so a file cannot be swapped between the check and the act. Sealing composes the format writer with the atomic replacement, inheriting its identity preservation and crash contract; unsealing streams to a caller-supplied sink and never writes plaintext to the path. Verifying is unsealing to a sink that discards, so it costs a full derivation by construction and produces no plaintext.

**Writing edited contents back is a small family, and every member is defined by its guard rather than its body.** All of them take bytes held in memory and replace the path through the same lock and atomic replacement; what differs is what each requires of the file it is replacing, so that no caller can produce an outcome it did not name:

- **re-seal from memory** refuses a file that is *not* already sealed — this is what stops a save from sealing a file the user deliberately made readable.
- **seal from memory** carries no such requirement, and is what turns a readable file into a sealed one carrying edits.
- **write plaintext** refuses a file that *is* sealed, so the one operation that puts readable bytes at a managed path can never overwrite a secret; it is what saves a file the user chose to keep readable.

Each guard is the inverse of a specific accident, and the guards rather than the call sites are what make the accidents unreachable — a caller that reasons wrongly about a file's state gets a refusal instead of a silent state change. Splitting the guard rather than the body is deliberate: a second code path writing the same bytes through a different replacement would be the place the family silently diverges.

Errors name the path and the condition a user experiences: already sealed, not sealed, absent, busy, no candidate passphrase opened it, damaged, an unacceptable work factor, or a symbolic link.

Verified by eleven operations tests and seven lock tests: a real env file sealed in place and unsealed back with the file left sealed on disk; permissions preserved; no debris beside the file; every guard condition refusing without touching the file; the candidate index reported so an override can be distinguished from the master; a wrong passphrase leaving nothing in the sink; a symlink refused with its destination untouched; and an operation refused while the file is locked, then succeeding once released. The lock and the already-sealed guard were both confirmed non-vacuous by removing them.

**Multi-file re-sealing** follows the Approach exactly. It refuses to begin unless two things hold: the new passphrase survives a full seal-then-unseal round trip against a scratch value, and every path in the list is present and already sealed. Both guards run before any file is touched, so a mistyped new passphrase or an unreadable file cannot leave a set half-converted.

Progress is derived rather than recorded. Each file is unsealed with the new passphrase first and the old second: opening under the first candidate means the file is already converted and is skipped, and opening under the second means it converts. Nothing is written down, so re-running is always safe and always finishes exactly the remainder — which makes retrying the recovery mechanism rather than a fallback.

The operation reports each file to a caller-supplied observer as it settles, in addition to returning the whole report at the end. The engine still records nothing itself — the observer is how a caller that *does* keep a durable record, such as the desktop's rekey manifest, can persist per file instead of learning the outcome only when the whole list returns. The plain entry point is the same operation with an observer that does nothing, so the derived-progress contract above is unchanged.

A file that fails transiently — busy, interrupted, momentarily unreadable — is retried up to a bounded count. A file that fails for a reason retrying cannot fix, such as being sealed under neither passphrase, is reported immediately without burning attempts. The report names every converted file and every unfinished one with its reason and whether it is worth retrying, which is what lets the interface offer a one-click retry rather than a count.

Sealing also range-checks the work factor before it reaches the library, which panics rather than erroring on an out-of-range value — see `MEMORY.md`.

Verified by seven re-seal tests: a whole set converted and no longer opening under the old passphrase; a second run recognising the work as done; a partially converted set finishing; both plan guards refusing without touching anything; a locked file reported as retryable and then completing once released; and a file under an unrelated passphrase reported as not worth retrying.

**No error value can carry secret material, and that is enforced at compile time rather than tested.** An in-crate check matches every variant exhaustively and passes each payload through a marker trait implemented only for types that cannot hold a secret — a path and an underlying IO error. Adding a variant whose payload is free-form text fails the build, forcing whoever adds it to justify the payload rather than discovering the leak later. The check lives inside the crate deliberately: the enum is marked non-exhaustive for external consumers, so an equivalent match written in a test crate is forced to carry a wildcard arm and would silently absorb the very variant it exists to catch. A separate behavioural test asserts that real error messages from wrong passphrases, already-sealed files and unsealable plaintext contain neither the passphrase nor any line of the file's content.

# What is missing

Nothing in the single-file or multi-file operations. The remaining engine work is the interoperability job in `format.md`, which needs a pinned stock binary in continuous integration.

# Steps

- [x] Define the error enum and the public function signatures: candidate-plural passphrases reporting which one matched, and the observed identity returned from a seal.
- [x] Implement the advisory sibling lock, acquired before the classifying open, returning a busy result rather than blocking.
- [x] Implement the single-file operations over `format.md` and `replace.md`, holding that lock so each guard condition actually holds.
- [x] Implement re-sealing over an explicit list of paths: plan computation, the new-passphrase round-trip guard, derived progress, bounded retry of transient failures, and a per-file result naming what remains and why.
- [x] Unit tests: every guard condition, the candidate-passphrase resolution reporting the right match, and the lock's exclusion within and across processes.
- [x] Assert no error value carries plaintext or passphrase material, enforced structurally as well as tested.
- [ ] Test scripts: exercise the real engine against a realistic tree of env files — happy path, large files, a deliberately corrupted sealed file, a file sealed under a different passphrase than expected, wrong passphrases, and genuinely concurrent operations on the same file from two processes.

# Open threads

- The retry loop currently makes its attempts back to back. A file held briefly by another process would benefit from a short pause between them; settle the delay when the desktop application drives a real run, since the right value depends on what the interface does while waiting.
- Transient is currently: busy, interrupted, would-block, timed-out, permission-denied. Permission-denied is the debatable one — it is usually permanent, but it is also what a transiently locked file reports on some systems. Revisit against real failures rather than in the abstract.

