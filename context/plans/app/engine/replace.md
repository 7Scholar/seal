Part of [the engine plan](README.md).

# Scope

Atomic, identity-preserving replacement of a file's contents in place: the mechanism both sealing and unsealing use to swap a file's bytes at its own path without ever exposing a partial write and without altering the file's identity. Covers the temp-file discipline, metadata capture and restore, durability flushing, the rename, and cleanup on failure. Out of scope: anything cryptographic (the content transform is a caller-supplied streaming write), and deciding *whether* a file should be replaced.

# What exists

Nothing implemented. The design is settled and grounded in an empirical sanity-test whose constraints are recorded in the engine's `MEMORY.md`: same-directory temp files (rename cannot cross filesystems), and explicit metadata capture/restore (a naive replace measurably widened `0600` to `0644` and dropped xattrs).

# What is missing

The implementation and its verification: the guard type that guarantees temp-file cleanup on early return and panic, the platform split for durability flushing (`F_FULLFSYNC` on macOS with a fallback), the metadata capture/restore, and the failure-injection tests that prove the crash contract.

# Steps

- [ ] Define the syscall seam: the interface covering temp creation, streaming, metadata capture/restore, flushing, rename, and directory sync, with the captured metadata as an opaque platform-typed value. The fault-injecting implementation is designed together with it, since the seam exists to make injection possible.
- [ ] Define the caller-facing API: target path, the streaming write, an explicit durability setting, and the expected prior state; returning the observed post-state including the identity fingerprint.
- [ ] Implement the replace sequence over the seam, with an RAII guard that removes the temp file on early return and on panic.
- [ ] Implement the advisory sibling lock held across the caller's classify-and-replace, with a busy result rather than a block-forever.
- [ ] Unit tests: round-trip, mode preservation including the `0600` case, xattr preservation, temp-file cleanup on write failure, and an assertion that the temp file is always a sibling of the target.
- [ ] Failure-injection tests through the seam: fail at every step in turn and assert the target is left wholly intact and no debris remains.
- [ ] Assert the durability setting is honoured in both directions — that the plaintext path does not force data to the medium.

# Open threads

- Whether the lock belongs here (it wraps the replace) or one layer up in operations (it must span classification, which happens before the replace begins). Leaning up: the lock has to be acquired before the classifying open, so the caller most likely owns it and this plan only provides it.
- Windows needs a different mechanism entirely (`ReplaceFileW`/`MoveFileExW`, no directory fsync, no mode or xattrs); it is a second implementation of the seam when Seal first targets Windows, not before.
