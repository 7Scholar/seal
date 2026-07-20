# Secrets-tooling landscape

Reference survey of existing secret-file encryption tools and current cryptographic practice, gathered to ground Seal's design decisions. Consult it when shaping the Approach or answering the root design forks. Facts verified 2026-07-20; links are the sources of depth.

## SOPS ([getsops/sops](https://github.com/getsops/sops), CNCF)

- Encrypts YAML/JSON/dotenv/INI/binary files **structure-preserving**: keys stay plaintext, only leaf values are encrypted (`ENC[AES256_GCM,data:...,iv:...,tag:...]`), chosen for diffability and readability.
- One random **data key per file** encrypts all values with AES-256-GCM; the key path is AEAD additional data binding each value to its position; a MAC over all values detects entry add/remove tampering.
- The data key is wrapped by one or more master keys (AWS/GCP/Azure KMS, age, PGP); k-of-n key groups via Shamir. `sops rotate` re-encrypts with a fresh data key; `sops updatekeys` re-wraps the existing data key without touching values.
- Editing is an `$EDITOR` round-trip through a tempfile (`sops edit`), plus scripted `sops set`/`unset`.
- Runtime delivery: `sops exec-env file 'cmd'` (child-process env only) and `sops exec-file file 'cmd {}'` (FIFO by default, tempfile with `--no-fifo`).
- Partial encryption via `--(un)encrypted-suffix/-regex` flags; files are designed to be committed, with cleartext diffs via a `.gitattributes` textconv hook because fresh IVs on every save make raw ciphertext diffs noisy.

## age / rage ([spec](https://github.com/C2SP/C2SP/blob/main/age.md), [str4d/rage](https://github.com/str4d/rage))

- File = textual header (version, recipient stanzas, header MAC) + binary payload; payload uses the **STREAM construction**: 64 KiB chunks, ChaCha20-Poly1305, counter nonces — streaming and seekable, in-place modification forbidden (re-encrypt = new file key).
- Recipient types: X25519 keypairs and an **scrypt passphrase recipient** (r=8, p=1, CLI-chosen work factor); an scrypt stanza must be the **only** stanza — passphrase and key recipients cannot be mixed in one file. Plugins (yubikey, Secure Enclave) extend recipients via external binaries.
- Binary output by default; strict-PEM ASCII armor with `-a`. Not key-committing across recipients and does not authenticate sender identity ([age and Authenticated Encryption](https://words.filippo.io/age-authentication/)).
- **Maintained Rust library exists**: the [`age` crate](https://crates.io/crates/age) (0.12.1, released 2026-07-14, ~2.8M downloads) exposes Encryptor/Decryptor, streaming, armor, and scrypt passphrase recipients; `rage` is the CLI on top. Pre-1.0 by its own labeling despite wide production use; interoperable with the Go reference implementation.
- Nondeterministic ciphertext by design — documented as unsuitable for git clean/smudge filters ([discussion](https://github.com/FiloSottile/age/discussions/507)).

## git-crypt & transcrypt (clean/smudge filters)

- Both encrypt on stage and decrypt on checkout via `.gitattributes` filters: plaintext working tree, ciphertext in git objects. The approach requires **deterministic encryption** or git sees phantom diffs.
- [git-crypt](https://www.agwa.name/projects/git-crypt/): AES-256-CTR with synthetic IV = HMAC-SHA-1 of the contents; repo key optionally GPG-wrapped per collaborator. [transcrypt](https://github.com/elasticdog/transcrypt): OpenSSL AES-256-CBC with a deterministic HMAC-derived salt; shared password stored plaintext in `.git/config`.
- Documented weaknesses: determinism leaks file equality/size/change patterns; git-crypt has no key rotation ([issue #61](https://github.com/AGWA/git-crypt/issues/61)) — a revoked collaborator decrypts all history forever; filters must be configured per clone, misconfiguration can commit plaintext, and merges/diffs/CI operate on ciphertext.

## dotenvx ([docs](https://dotenvx.com/docs/quickstart/encryption))

- `dotenvx encrypt` keeps `.env` a **valid dotenv file**: plaintext `DOTENV_PUBLIC_KEY` line, each value replaced by `encrypted:BASE64...`. Per-value secp256k1 ECIES (ephemeral ECDH + AES-256), so anyone with the public key can add/encrypt values, and unchanged values keep identical ciphertext (per-key diffability).
- The private key sits plaintext in gitignored `.env.keys` (`DOTENV_PRIVATE_KEY_<ENV>` per environment file) — the protection problem is relocated to that file, not removed; no passphrase mode. `dotenvx run -- cmd` injects decrypted values into the child env.

## Password-based encryption practice (2025/2026)

- **Argon2id** is [OWASP's first choice](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) (e.g. m=46 MiB/t=1/p=1 or m=19 MiB/t=2/p=1); RFC 9106 recommends higher (64 MiB–2 GiB). scrypt is the fallback (N=2^17, r=8, p=1 minimum). For infrequent interactive unlocks against offline brute force, parameters well above server minimums are common. Tune to ~250–400 ms on target hardware; KDFs run via `spawn_blocking` in async apps.
- **XChaCha20-Poly1305** (192-bit nonce, safe to generate randomly, constant-time in software) vs **AES-256-GCM** (faster with AES-NI, FIPS-recognized, 96-bit nonce with birthday-collision risk under random generation): the libsodium construction is the common recommendation for cross-platform file encryption; age instead solves nonce management structurally with counter nonces inside STREAM.
- **Envelope encryption** (random file key wrapped by a password-derived KEK) buys password change by re-wrapping small keys instead of bulk re-encryption, multiple unlock methods wrapping the same file key, one KDF run per unlock, and separable data-key vs wrap-key rotation. SOPS, age, and dotenvx all implement variants.
- None of the common AEADs are **key-committing** ("invisible salamanders"; [Soatok's overview](https://soatok.blog/2024/09/10/invisible-salamanders-are-not-what-you-think/)); partitioning-oracle attacks specifically target password-derived keys, so new password-based formats add a key-check value or explicit commitment.

## Runtime delivery patterns

- **Exec with injected env**: `sops exec-env`, `dotenvx run`, 1Password `op run` (which also masks secret values in the child's output). Plaintext exists only in the child's environment/memory; env vars are readable via `/proc/<pid>/environ` by same-UID processes, leak into crash dumps, and are inherited by every child.
- **Decrypt to stdout**: `sops decrypt`, `age -d`, `op read` — composable but easily leaked into shell history and caller responsibility.
- **FIFO / tempfile**: `sops exec-file` (FIFO default); 1Password Environments mounts a `.env` backed by a named pipe so dotenv loaders read plaintext that never touches disk. FIFOs are single-reader and break tools that reopen or seek; tempfiles put plaintext on disk for a window.
- **Agent over local IPC** (ssh-agent model): a long-lived process holds keys; clients request operations over a socket. [1Password CLI + desktop app](https://developer.1password.com/docs/cli/about-biometric-unlock/) is the flagship GUI-authorizes-CLI example: macOS uses an XPC service with code-signature verification of the CLI, Windows a named pipe with Authenticode verification, Linux a unix socket with a group check; each request is authorized per account via biometric/OS auth with the requesting process named, and locking the app revokes all CLI authorizations. Bitwarden shipped the same pattern in 2025–26.

## Git stance on encrypted files

- Three established conventions: commit ciphertext as first-class files (SOPS, dotenvx — versioned and reviewable, but **old ciphertext lives in history forever**, so revoking access means rotating the underlying secrets); commit via filters (git-crypt/transcrypt — requires deterministic encryption and per-clone setup); never commit (`.env` + `.gitignore` — no history exposure, no versioning, perennial accidental-commit risk).
- Nondeterministic ciphertext (age, SOPS full-file saves) produces full-file spurious diffs on every re-encrypt when committed; SOPS mitigates with textconv diffs, dotenvx structurally via per-value ciphertext.

## Prior art near Seal's concept

- Nothing matches in-place, password-only, GUI-managed encryption of files at their original paths across repos. Nearest: [EnvKeep](https://github.com/jackofshadowz/envkeep) (macOS GUI+CLI, centralized age vault, not in-place), [sei](https://github.com/xi72yow/sei) (TUI storing env vars in GNOME Keyring), EnvKey (server-synced E2E config manager; maintenance status unverified), 1Password Environments (GUI-managed env sets over FIFO-mounted `.env`, cloud-vault-backed).
