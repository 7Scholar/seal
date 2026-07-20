Part of [the engine plan](README.md).

# Scope

The engine's public API: the classify, seal, unseal-to-a-sink, verify and multi-file re-seal operations; the advisory lock that makes their guard conditions real; the guard conditions themselves; passphrase handling across the boundary; and the error enum consumers match on. There is deliberately no operation that writes plaintext to a managed file's path. Composes `format.md` and `replace.md` into the surface the CLI and the desktop app consume. Out of scope: resolving *which* passphrase applies (the caller supplies it, since the registry owns repo overrides) and anything about how a passphrase is collected from a human.

# What exists

The advisory lock and the single-file operations, implemented and verified.

**The lock** is a hidden sibling file beside the target, held for the whole operation and released when the handle closes — so a process that dies never leaves a stuck lock. It excludes other processes and this process alike, verified in both directions by driving a second process. Acquiring does not require the target to exist, since sealing may reach a path that is about to be created. The lock file is deliberately never deleted, for the reason recorded in `MEMORY.md`: unlinking it while another holder is active lets that holder lock a fresh inode, which converts mutual exclusion into the appearance of it.

**The operations** are classify, seal, unseal-to-a-sink, and verify. Each acquires the lock before opening the file, so the guard conditions are real rather than racing: seal refuses a file that is already sealed, and the unseal operations refuse one that is not sealed. Classification happens on the same open handle the operation goes on to use, and the handle is rewound afterwards, so a file cannot be swapped between the check and the act. Sealing composes the format writer with the atomic replacement, inheriting its identity preservation and crash contract; unsealing streams to a caller-supplied sink and never writes plaintext to the path. Verifying is unsealing to a sink that discards, so it costs a full derivation by construction and produces no plaintext.

Errors name the path and the condition a user experiences: already sealed, not sealed, absent, busy, no candidate passphrase opened it, damaged, an unacceptable work factor, or a symbolic link.

Verified by eleven operations tests and seven lock tests: a real env file sealed in place and unsealed back with the file left sealed on disk; permissions preserved; no debris beside the file; every guard condition refusing without touching the file; the candidate index reported so an override can be distinguished from the master; a wrong passphrase leaving nothing in the sink; a symlink refused with its destination untouched; and an operation refused while the file is locked, then succeeding once released. The lock and the already-sealed guard were both confirmed non-vacuous by removing them.

# What is missing

Multi-file re-sealing, specified in the [engine Approach](README.md): plan first, prove the new passphrase by round trip, derive progress from the files rather than a journal, retry transient failures with a bounded count, and report only what survives those retries.

A structural guarantee that no error value can carry plaintext or passphrase material. The variants carry paths and an underlying IO error today, which is already the right shape; what is missing is enforcing that a future variant cannot introduce a leak, since a test can only check the variants that exist.

# Steps

- [x] Define the error enum and the public function signatures: candidate-plural passphrases reporting which one matched, and the observed identity returned from a seal.
- [x] Implement the advisory sibling lock, acquired before the classifying open, returning a busy result rather than blocking.
- [x] Implement the single-file operations over `format.md` and `replace.md`, holding that lock so each guard condition actually holds.
- [ ] Implement re-sealing over an explicit list of paths: plan computation, the new-passphrase round-trip guard, derived progress, bounded retry of transient failures, and a per-file result naming what remains and why.
- [x] Unit tests: every guard condition, the candidate-passphrase resolution reporting the right match, and the lock's exclusion within and across processes.
- [ ] Assert no error value carries plaintext or passphrase material, enforced structurally as well as tested.
- [ ] Test scripts: exercise the real engine against a realistic tree of env files — happy path, large files, a deliberately corrupted sealed file, a file sealed under a different passphrase than expected, wrong passphrases, and genuinely concurrent operations on the same file from two processes.

# Open threads

- The retry bound and backoff for transient failures during a multi-file re-seal: enough attempts that a briefly-locked file resolves itself, few enough that a permanently stuck one surfaces promptly. Settle by testing against a genuinely locked file rather than by guessing a number.
- Which failure reasons are classified transient (retry automatically) versus actionable (surface for the user to resolve): the distinction drives both the retry loop and what the interface can say specifically, so enumerate it against the real error variants once they exist.

