Part of [the engine plan](README.md).

# Scope

Atomic, identity-preserving replacement of a file's contents in place: the mechanism both sealing and unsealing use to swap a file's bytes at its own path without ever exposing a partial write and without altering the file's identity. Covers the temp-file discipline, metadata capture and restore, durability flushing, the rename, and cleanup on failure. Out of scope: anything cryptographic (the content transform is a caller-supplied streaming write), and deciding *whether* a file should be replaced.

# What exists

The replacement sequence and its syscall seam, implemented and verified on Unix.

The seam is a trait covering every step that can fail — metadata capture, temp creation, metadata restore, flush, rename, directory sync, and temp removal — with the captured metadata held as an opaque platform-typed value so a future Windows implementation is a new impl rather than a change to callers. A fault-injecting implementation wraps the real one and fails at any named step, which is what makes the crash contract testable; the content-write step is injected through the caller's closure instead, since that is where it lives.

The caller-facing operation takes a target path, a streaming write, and an explicit durability setting, and returns the observed identity of the resulting file. It runs the sequence the Approach specifies: capture the target's mode and extended attributes; create a dotfile temp sibling opened exclusively at mode `0600`; stream the content; restore the captured metadata onto it; flush according to the durability setting; rename over the target; sync the directory. Durability `Full` prefers the macOS full-flush and falls back to an ordinary sync where unsupported; durability `None` skips both the flush and the directory sync, which is what keeps plaintext from being forced to the medium. A guard removes the temp file on any early return or panic and is released only once the rename has committed.

Verified by ten tests: the round-trip and new-identity report, mode preservation across several modes the temp file does not share, extended-attribute preservation, the temp file being a sibling, both durability directions honoured, a failure injected at each of five seam steps plus the write step leaving the target and its permissions wholly intact with no debris, and a failure after the rename correctly keeping the new contents. The two metadata tests were confirmed non-vacuous by deleting each restore path in turn and observing the corresponding test fail.

# What is missing

The advisory lock, which is deferred rather than skipped — see the open thread below. Windows support.

# Steps

- [x] Define the syscall seam, with the captured metadata as an opaque platform-typed value, alongside its fault-injecting implementation.
- [x] Define the caller-facing API: target path, streaming write, explicit durability, returning the observed identity.
- [x] Implement the replace sequence over the seam, with a guard that removes the temp file on early return and on panic.
- [ ] Implement the advisory sibling lock — moved to `operations.md`, which owns the span it must cover.
- [x] Unit tests: round-trip, mode preservation, xattr preservation, temp-file cleanup on write failure, temp file is a sibling.
- [x] Failure-injection tests through the seam at every step, asserting the target is left intact and no debris remains.
- [x] Assert the durability setting is honoured in both directions.

# Open threads

- The advisory lock belongs in `operations.md` rather than here: it must be held across classification *and* replacement, and classification happens before this sequence begins, so wrapping only the replace would leave the very race it exists to close. This plan provides the atomic sequence; the caller owns the span.
- Windows needs a different mechanism entirely (`ReplaceFileW`/`MoveFileExW`, no directory fsync, no mode or xattrs); it is a second implementation of the seam when Seal first targets Windows, not before. The trait shape already accommodates it.
- Ownership restoration is not attempted: it requires elevated privileges for any file the user does not own, and a tool that silently needs them is worse than one that does not try. Revisit only if a real case appears.
