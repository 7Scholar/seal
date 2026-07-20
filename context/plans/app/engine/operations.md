Part of [the engine plan](README.md).

# Scope

The engine's public API: the seal, unseal-to-memory, unseal-in-place, verify, and repo re-seal operations; the guard conditions each enforces; passphrase handling across the boundary; and the error enum consumers match on. Composes `format.md` and `replace.md` into the surface the CLI and the desktop app consume. Out of scope: resolving *which* passphrase applies (the caller supplies it, since the registry owns repo overrides) and anything about how a passphrase is collected from a human.

# What exists

Nothing implemented. The operations, their invariants, and the error taxonomy are specified in the [engine Approach](README.md).

# What is missing

The implementation and its verification: the guard conditions (seal refuses an already-sealed file; the unseal operations refuse a file that is not sealed), the secret-material handling at the API boundary, the error enum, and the re-seal operation's partial-failure reporting.

The public surface is settled with one exception. Unsealing is a memory operation only — there is no verb that writes plaintext to a managed file's path, so the on-disk state moves from plaintext to sealed and never back. What remains open is the shape of re-sealing many files under a new passphrase, which depends on how master-passphrase change is decided in the root `QUESTIONS.md`: whether it needs a resumable journal or only a precise report. That affects one operation, not the others, so the rest of this plan proceeds.

# Steps

- [ ] Define the error enum and the public function signatures: candidate-plural passphrases reporting which one matched, observed post-state returns carrying the identity fingerprint, and secret-carrying types at the boundary.
- [ ] Implement the single-file operations over `format.md` and `replace.md`, acquiring the advisory lock before the classifying open so each guard condition actually holds.
- [!] Implement re-sealing over an explicit list of paths with a per-file report — blocked on the master-passphrase-change answer in the root `QUESTIONS.md`, which decides whether this needs a resumable journal.
- [ ] Unit tests: every guard condition, every error variant, the candidate-passphrase resolution reporting the right match, and assertions that no error value carries plaintext or passphrase material.
- [ ] Test scripts: exercise the real engine against a realistic tree of env files — happy path, large files, a deliberately corrupted sealed file, a file sealed under a different passphrase than expected, wrong passphrases, and genuinely concurrent operations on the same file from two processes.

# Open threads

- The report shape for a multi-file re-seal: it must name precisely which files moved and which did not, and be safely re-runnable so a file already under the new passphrase is skipped rather than failed. Design it before implementing, against whichever answer the master-change question returns.

