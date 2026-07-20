# Open questions

These are the major design forks the root concern exposes; the Approach stays `TBD` until they are answered. The survey grounding the options lives in [_docs/secrets-landscape.md](_docs/secrets-landscape.md).

## 1. What cryptographic foundation seals the files?

The core encrypt/decrypt machinery can be adopted or built, and the choice shapes the file format, the password story, and how much cryptographic responsibility Seal itself carries.

- **A: the age format via the maintained `age` Rust crate.** A published, audited-in-practice format with streaming encryption and an existing passphrase mode. Constraints inherited: the passphrase recipient is scrypt (not Argon2id, OWASP's current first choice), a passphrase stanza cannot be combined with other recipient types in one file, and ciphertext is an opaque binary/armored blob.
- **B: Seal's own envelope format built from established primitives** (Argon2id-derived key encryption key wrapping a random per-file key, XChaCha20-Poly1305 for content, an explicit key-commitment check). Full control over KDF choice, header metadata, and future unlock methods, at the cost of owning a bespoke format's correctness and its documentation for open-source scrutiny.
- **C: SOPS-compatible files.** Interoperates with an existing ecosystem and its editor/diff tooling, but SOPS's model is values-encrypted-keys-visible with master-key backends aimed at KMS/keypairs; a pure interactive-password mode is not its native shape.

**Answer:**

## 2. One password for everything, or a password per repo?

The intent fixes that the password lives only in the user's head. It does not fix its scope, which sets the unlock UX, the blast radius of a compromised or forgotten password, and what "the app is unlocked" means across repos.

- **A: one master password for all repos and all sealed files.** One thing to remember, one unlock gesture; losing it affects everything, and unlocking anywhere unlocks everything.
- **B: a password per repo.** Contains blast radius per repo and allows different strengths for different sensitivity levels; multiplies what the user must remember and re-prompts as workflows cross repos.
- **C: one master password by default with optional per-repo overrides.** The flexible middle, at the cost of a more complex key model and UI.

**Answer:**

## 3. What does a sealed file look like on disk?

The sealed form determines what a human, an editor, git, and a scanning tool see when they open the file at its original path.

- **A: an opaque encrypted blob** (age-style, binary or armored) — maximally unreadable, leaks nothing but size; the file no longer looks like its type, and any diff is all-or-nothing noise.
- **B: structure-preserving encryption for env files** (SOPS/dotenvx-style: variable names stay readable, only values are ciphertext), with opaque blobs for arbitrary non-env files — sealed env files stay recognizable and per-variable diffable, at the cost of leaking variable names and a more complex format with two sealed shapes.
- **C: an opaque payload wrapped in a small readable marker header** (a recognizable "sealed by Seal" preamble naming the original file type but revealing nothing of the contents) — a middle form: tools and humans can identify sealed files, contents and structure stay fully hidden.

**Answer:**

## 4. Are sealed files meant to be committed to git?

The intent says sealed files live the repo's life at their natural paths, but leaves open whether that life includes being committed in sealed form. Prior art splits cleanly (SOPS/dotenvx commit ciphertext; the `.env` convention gitignores), and the answer feeds back into question 3: committed ciphertext wants diff-friendliness and determinism, while gitignored ciphertext is free to be opaque.

- **A: sealed files are committable by design** — secrets are versioned and synced with the repo; old ciphertext stays in history forever, so any password or access revocation implies rotating the underlying secrets.
- **B: sealed files stay gitignored** — sealing protects contents at rest on the machine only; nothing sensitive ever enters history, and clones/other machines get secrets some other way (or not at all).
- **C: per-file user choice** — Seal manages the gitignore state as part of each file's settings and stays agnostic; both stories must then be first-class.

**Answer:**

## 5. How do external workflows resolve a sealed file at runtime?

A bash deploy script must be able to ask for plaintext at the moment of use. The resolution surface decides what must be running, where the password gets typed, and where plaintext momentarily exists.

- **A: a standalone CLI** (shipped with the app) that performs decryption itself, prompting for the password in the terminal — works with nothing else running; the password is typed into whatever terminal asked, and each invocation pays the KDF cost.
- **B: the running app as the sole resolver** (1Password-style agent): the CLI or script requests over local IPC, the app — which holds the unlocked state — authorizes, optionally with an explicit per-request approval in the UI; nothing resolves when the app is closed or locked, which is both the guarantee and the friction.
- **C: both surfaces** — the agent path when the app is running, standalone password-prompt fallback when it is not; two codepaths to keep correct and consistent.

Related sub-fork, answerable in the same breath: the delivery form — inject into the child process environment (`seal run -- cmd`), print plaintext to stdout for composition, or expose a FIFO/tempfile path for tools that need a file — which of these Seal offers shapes the CLI's contract.

**Answer:**

## 6. What is the unlock/session model?

With the password never stored, every resolution ultimately traces to a typed password — but not necessarily one typing per operation.

- **A: prompt on every operation** — no unlocked state ever held; maximal guarantee, heavy friction for edit-heavy UI sessions and multi-file resolutions.
- **B: a timed unlock session** — one password entry unlocks for a bounded period or until lock/quit, with derived keys held only in the app's memory (zeroized on lock); the standard desktop-vault pattern (1Password), trading a bounded in-memory exposure window for usability.
- **C: session for the UI, per-operation prompt for runtime resolution** — browsing/editing rides one unlock, but anything delivering plaintext to an external process re-authorizes explicitly.

**Answer:**

## 7. What frontend stack does the Tauri webview run?

Tauri is frontend-agnostic; this is a one-time commitment that sets the ecosystem for the entire UI (the file/repo views and the Vercel-style env editor).

- **A: React + TypeScript (Vite)** — matches the stack already in daily use in your other projects; largest ecosystem.
- **B: Svelte + TypeScript** — lighter output and less boilerplate for a small app; a second framework to keep in your head.
- **C: SolidJS or vanilla TypeScript** — minimal footprint options if UI dependencies should stay near zero.

**Answer:**
