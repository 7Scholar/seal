# Intent

## What & why

The sealing engine is the cryptographic heart of Seal and the seam every other concern consumes: it turns a plaintext file at a path into a sealed file at that same path and back, under the constraints the root Approach fixes — standard age v1 format with an scrypt passphrase recipient via the `age` Rust crate, one master password by default with optional per-repo overrides, and passwords that exist only in the user's head. It owns the handling of secret material in memory (passphrases, file keys, plaintext buffers) and the semantics behind the app's unlocked session and the CLI's per-operation prompt. It is a pure Rust library with no Tauri dependency, so its behavior is fully testable without a runtime. It is done when sealing, unsealing, password verification, and password change work exactly as specified, with the failure and edge behavior (wrong password, corrupted file, partial writes, already-sealed input) defined and tested.

## Approach

TBD.

# Plans

No child plans yet.

# Cursor

Freshly framed from the root's answered design forks; nothing designed yet. Next: research and design — sanity-check the `age` crate's encrypt/decrypt API against a real file, then shape the password model (master vs per-repo override resolution), the sealed-file write semantics (atomicity, in-place replacement), and the in-memory key/session handling into an Approach.

# Open threads

- Armored vs binary age output for sealed files — a visible, greppable "sealed" marker versus a smaller opaque binary; decide during design.
- How a per-repo override interacts with sealing: which passphrase a given file is sealed under and how the engine knows; settle when the password model is designed.
- Atomic in-place replacement semantics: what happens on crash mid-seal or mid-unseal; settle during design, before implementation.
