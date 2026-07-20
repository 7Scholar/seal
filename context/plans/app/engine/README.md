# Intent

## What & why

The sealing engine is the cryptographic heart of Seal and the seam every other concern consumes: it turns a plaintext file at a path into a sealed file at that same path and back, under the constraints the root Approach fixes — standard age v1 format with an scrypt passphrase recipient via the `age` Rust crate, one master password by default with optional per-repo overrides, and passwords that exist only in the user's head. It owns the handling of secret material in memory (passphrases, file keys, plaintext buffers) and the semantics behind the app's unlocked session and the CLI's per-operation prompt. It is a pure Rust library with no Tauri dependency, so its behavior is fully testable without a runtime. It is done when sealing, unsealing, password verification, and password change work exactly as specified, with the failure and edge behavior (wrong password, corrupted file, partial writes, already-sealed input) defined and tested.

## Approach

The engine is a plain Rust library crate with no dependency on Tauri, on the registry, or on any UI. Its whole surface is: classify a path, seal a path, unseal a path to memory, unseal a path in place, and verify a passphrase. Everything else in Seal is a consumer of these operations.

### Sealed-file format

A sealed file is a standard age v1 file carrying exactly one scrypt passphrase stanza, written **ASCII-armored** — the `-----BEGIN AGE ENCRYPTED FILE-----` framing. Armor is chosen because a sealed file must survive the life of a text file in a repo: it stays line-oriented for tools that assume text, remains diffable and greppable as text, and is visibly, self-evidently sealed to a human who opens it. The size cost is irrelevant at env-file scale. No Seal-specific header, marker, or metadata is added: byte-compatibility with standard `age`/`rage` is a guarantee of the format, so any sealed file is recoverable with the password and stock age tooling even if Seal itself is gone.

The scrypt work factor is **always set explicitly** by the engine and never left to the crate's runtime-calibrated default. The engine defines one work-factor constant for newly sealed files, chosen so a derivation costs a few hundred milliseconds on typical current hardware, and records nothing about it outside the file — the age format already carries the factor in its stanza, so unsealing a file sealed under an older constant keeps working. Unsealing caps accepted work via the identity's maximum-work-factor setting, so a hostile or corrupt file cannot force an unbounded derivation.

### Classification

Classification answers "what is this path?" without a passphrase and without reading more than a file's opening bytes: **sealed** (an age file, armored or binary), **plaintext** (anything else), or **absent**. It reads only the head of the file, so it is cheap enough for the registry to run across every managed file on demand. The engine treats binary age files as sealed even though it never writes them, because a user may seal a file with stock age tooling and Seal must recognize it. Classification never decrypts and so never needs a passphrase; a file that is sealed but unopenable by the current passphrase still classifies as sealed.

### Operations and their invariants

`seal` requires the target to classify as plaintext and refuses a file that is already sealed, so that a double-seal can never silently produce doubly-encrypted content. `unseal_to_memory` returns the plaintext to the caller — the CLI's resolution path and the UI's editor both use it — and leaves the file on disk untouched, sealed. `unseal_in_place` replaces the sealed file with its plaintext, and is the management action the UI offers. Both unseal operations require the target to classify as sealed. `verify` attempts the header key-unwrap only and reports whether a passphrase opens a given sealed file, without producing plaintext.

Every operation that writes is **atomic and identity-preserving**, in this order: capture the target's mode and extended attributes; create the replacement in the target's own directory as a dotfile with a random suffix, opened exclusively at mode `0600`; stream the transformed content into it; restore the captured mode and extended attributes onto it; flush it to durable storage (`F_FULLFSYNC` on macOS, falling back to an ordinary sync where unsupported); rename it over the target; sync the containing directory so the rename itself is durable. A guard removes the temp file on any failure or panic, so a failed operation leaves the user's directory exactly as it was. The temp file lives in the target's directory because rename cannot cross filesystems; this is a correctness requirement, not a preference. ACLs and creation time are known not to survive an inode replacement and are explicitly out of scope; the plan states this rather than leaving it to be discovered.

The crash contract that follows: at every instant the target path holds either the complete old file or the complete new one, never a partial write, and the plaintext is never destroyed before the sealed replacement is durable. The failure mode a crash can produce is a leftover temp file, which is inert and removable.

Content is streamed between file handles rather than buffered whole, so a large managed file does not require memory proportional to its size. `unseal_to_memory` is the deliberate exception, since its caller wants the bytes.

### Passphrase model

The engine resolves which passphrase applies to a file but never stores one. Resolution is: the repo's override passphrase if that repo has one, otherwise the master passphrase. The engine is told the resolved passphrase by its caller; it does not consult the registry itself, keeping it free of that dependency. Because a per-repo override means a file's ciphertext is bound to whichever passphrase sealed it, changing a repo's passphrase is not a metadata edit — it is a re-seal of every file in that repo, which the engine exposes as an explicit operation with a partial-failure report rather than an all-or-nothing promise it cannot keep across many separate files.

Passphrases cross the API as the secrecy crate's protected string type and derived key material is zeroized on drop. Plaintext buffers returned to callers are the one place secret material leaves the engine's control, and the API hands them back in a zeroize-on-drop container so a careless consumer does not leave copies behind.

### Error taxonomy

Errors are a `thiserror` enum whose variants map to distinct user-facing outcomes, because the sanity-test confirmed the underlying library distinguishes these cases cleanly: wrong passphrase, not-a-sealed-file, corrupt-or-truncated sealed file, already-sealed (from `seal`), not-sealed (from the unseal operations), absent path, and an IO variant carrying the failed step. Wrong passphrase and corrupt file are deliberately separate variants: conflating them would make the UI tell a user their password is wrong when their file is damaged. Error values never carry plaintext, passphrases, or key material.

### Verification

The engine is testable end-to-end without a Tauri runtime, and its test suite is part of what "done" means: round-trips across file sizes and content shapes; every error variant provoked deliberately; interoperability proven **against the stock `age` CLI in both directions** (a Seal-sealed file opens with `age`, an `age`-sealed file opens with Seal), since standard-format compatibility is a claim the tests must hold to; metadata preservation asserted explicitly, including the `0600`-stays-`0600` case that a naive implementation regresses; and crash-safety exercised by injecting failures at each step of the replace sequence and asserting the target is left intact.

# Plans

- [ ] format.md -> sealed-file format, classification, and the age binding
- [ ] replace.md -> atomic identity-preserving file replacement
- [ ] operations.md -> the engine's public operations, passphrase resolution, and error taxonomy

# Cursor

Solutioned: the Approach above is designed and grounded in two sanity-tests whose findings are recorded in `MEMORY.md` (explicit work factor, armored-reader wrapping, same-directory temp file, metadata capture/restore). Three children are framed, none started. Next: work `replace.md` first — it is the foundation the other two build on and the one with the subtlest correctness requirements — then `format.md`, then `operations.md` which composes both. No code is written until each child's own design is settled.

# Open threads

- The exact work-factor constant: pick by measuring a derivation on current hardware in release build during `format.md`, targeting a few hundred milliseconds.
- Whether `unseal_in_place` should refuse when the plaintext would land in a git-tracked file: out of scope per the root Approach (git is the repo's responsibility), but worth reconsidering if the UI wants to warn.
- Whether to offer the `RENAME_SWAP` variant on macOS to retain the original inode for a rollback window; the plain-rename sequence is correct without it, so this is an optimization to evaluate, not a requirement.
