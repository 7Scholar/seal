Part of [the engine plan](README.md).

# Scope

Atomic, identity-preserving replacement of a file's contents in place: the mechanism both sealing and unsealing use to swap a file's bytes at its own path without ever exposing a partial write and without altering the file's identity. Covers the temp-file discipline, metadata capture and restore, durability flushing, the rename, and cleanup on failure. Out of scope: anything cryptographic (the content transform is a caller-supplied streaming write), and deciding *whether* a file should be replaced.

# What exists

Nothing implemented. The design is settled and grounded in an empirical sanity-test whose constraints are recorded in the engine's `MEMORY.md`: same-directory temp files (rename cannot cross filesystems), and explicit metadata capture/restore (a naive replace measurably widened `0600` to `0644` and dropped xattrs).

# What is missing

The implementation and its verification: the guard type that guarantees temp-file cleanup on early return and panic, the platform split for durability flushing (`F_FULLFSYNC` on macOS with a fallback), the metadata capture/restore, and the failure-injection tests that prove the crash contract.

# Steps

- [ ] Design the API surface: what the caller supplies (target path, a streaming write closure) and what it gets back; how failure at each step is reported.
- [ ] Implement the replace sequence with an RAII cleanup guard.
- [ ] Unit tests: round-trip, mode preservation including the `0600` case, xattr preservation, temp-file cleanup on write failure, `EXDEV` never reachable.
- [ ] Failure-injection tests: fail at each step of the sequence and assert the target is left wholly intact and no debris remains.

# Open threads

- Whether the platform split lives here or behind a small internal abstraction shared with future platform needs; decide when the Windows path is actually written.
- Windows needs a different mechanism entirely (`ReplaceFileW`/`MoveFileExW`, no directory fsync); it is designed when Seal first targets Windows, not before, but the API shape should not preclude it.
