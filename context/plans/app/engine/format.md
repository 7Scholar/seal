Part of [the engine plan](README.md).

# Scope

The sealed-file format and the binding to the age library: producing an armored age file with a single scrypt passphrase stanza at an explicitly pinned work factor, reading one back, and classifying a path as sealed, plaintext, or absent without a passphrase. Out of scope: writing files to disk (`replace.md`'s job) and the public operations that compose these (`operations.md`).

# What exists

Nothing implemented. A sanity-test verified the library binding end to end against real compiled code: the recipient/identity types for passphrase sealing, explicit work-factor control, armored framing, streaming over file handles, and the distinct error variants for wrong passphrase, non-age input, and corrupt payload. The constraints that follow are in the engine's `MEMORY.md`.

# What is missing

The implementation and its verification: the encrypt and decrypt stream wrappers, the classification probe, the work-factor constant, and the interoperability tests against the stock `age` CLI that back the standard-format guarantee.

# Steps

- [ ] Measure a derivation in release build on current hardware and pin the work-factor constant to a few hundred milliseconds.
- [ ] Implement the encrypt and decrypt stream wrappers over reader/writer pairs.
- [ ] Implement classification: probe a file's opening bytes for both the armored framing and the binary age version line.
- [ ] Unit tests: round-trip across sizes, classification of every input shape (armored, binary, plaintext, empty, absent, a file whose first bytes coincidentally resemble the marker), and each error variant provoked deliberately.
- [ ] Interoperability tests in both directions against the stock `age` CLI.

# Open threads

- Whether the interoperability test invokes a real `age` binary (requiring it in CI) or a second independent implementation path; the guarantee matters enough to want the real binary, so CI likely installs it.
- Empty-file handling: sealing a zero-byte file is legal and round-trips, but confirm classification and the operations behave sensibly rather than treating empty as absent.
