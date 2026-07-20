Part of [the engine plan](README.md).

# Scope

The engine's public API: the seal, unseal-to-memory, unseal-in-place, verify, and repo re-seal operations; the guard conditions each enforces; passphrase handling across the boundary; and the error enum consumers match on. Composes `format.md` and `replace.md` into the surface the CLI and the desktop app consume. Out of scope: resolving *which* passphrase applies (the caller supplies it, since the registry owns repo overrides) and anything about how a passphrase is collected from a human.

# What exists

Nothing implemented. The operations, their invariants, and the error taxonomy are specified in the [engine Approach](README.md).

# What is missing

The implementation and its verification: the guard conditions (seal refuses an already-sealed file; the unseal operations refuse a file that is not sealed), the secret-material handling at the API boundary, the error enum, and the re-seal operation's partial-failure reporting.

# Steps

- [ ] Define the error enum and the public function signatures, including the secret-carrying types at the boundary.
- [ ] Implement the four single-file operations over `format.md` and `replace.md`.
- [ ] Implement repo re-seal with per-file partial-failure reporting.
- [ ] Unit tests: every guard condition, every error variant, and assertions that no error value carries plaintext or passphrase material.
- [ ] Test scripts: exercise the real engine against a realistic tree of env files — happy path, large files, a deliberately corrupted sealed file, wrong passphrases, and concurrent operations on the same file.

# Open threads

- Re-seal atomicity across many files: a mid-run failure leaves a repo split across two passphrases, so the operation must report precisely which files moved and which did not, and be safely re-runnable. Design the report shape before implementing.
- Whether concurrent operations on the same path need explicit locking or whether the atomic replace makes last-writer-wins acceptable; determine by testing before finalizing.
