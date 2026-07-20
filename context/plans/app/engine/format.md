Part of [the engine plan](README.md).

# Scope

The sealed-file format and the binding to the age library: producing an armored age file with a single scrypt passphrase stanza at an explicitly pinned work factor, reading one back, and classifying a path as sealed, plaintext, or absent without a passphrase. Out of scope: writing files to disk (`replace.md`'s job) and the public operations that compose these (`operations.md`).

# What exists

Nothing implemented. A sanity-test verified the library binding end to end against real compiled code: the recipient/identity types for passphrase sealing, explicit work-factor control, armored framing, streaming over file handles, and the distinct error variants for wrong passphrase, non-age input, and corrupt payload. The constraints that follow are in the engine's `MEMORY.md`.

# What is missing

The implementation and its verification: the encrypt and decrypt stream wrappers, the classification probe, the work-factor constant, and the interoperability tests against the stock `age` CLI that back the standard-format guarantee.

# Steps

- [ ] Measure a derivation in release build on current hardware; pin the work-factor constant for new files at a few hundred milliseconds and the minimum-accepted floor from the same measurement.
- [ ] Implement the encrypt and decrypt stream wrappers over reader/writer pairs, with the work factor set explicitly on write and both a maximum and a minimum enforced on read.
- [ ] Implement classification over an open handle, probing the opening bytes for both the armored framing and the binary version line, and reporting a sealed file's work factor. Add the path-taking wrapper and the bulk form returning a per-path result.
- [ ] Unit tests: round-trip across sizes, classification of every input shape (armored, binary, plaintext, empty, absent, and a file whose first bytes coincidentally resemble the marker), and each error variant provoked deliberately.
- [ ] Build the static test-vector corpus: files sealed by stock tooling at known passphrases and work factors, covering armored and binary, empty and large, and one below the minimum work factor. Commit it and test against it by default.
- [ ] Interoperability tests in both directions against a version-pinned real `age` binary, excluded from the default test run and run in their own continuous-integration job.

# Open threads

- Empty-file handling: sealing a zero-byte file is legal and round-trips, but confirm classification and the guard conditions treat empty as distinct from absent rather than conflating them.
- The passphrase-entry mechanism for driving a real `age` binary in tests is awkward (it reads from the terminal rather than standard input); settle it when the interoperability job is written, and note that the vector corpus is what keeps the default suite hermetic regardless.
