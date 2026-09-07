<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="88" alt="">
</p>

<h1 align="center">Seal</h1>

<p align="center">
  <strong>Your secret files stay exactly where they are — named, visible, unreadable.</strong><br>
  The only thing that opens them is a password that exists nowhere on the machine.
</p>

<p align="center">
  <a href="https://7scholar.github.io/seal/"><img alt="Documentation" src="https://img.shields.io/badge/docs-7scholar.github.io%2Fseal-2f6f4e"></a>
  <a href="https://github.com/7scholar/seal/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/7scholar/seal/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/7scholar/seal/actions/workflows/journeys.yml"><img alt="Journeys" src="https://github.com/7scholar/seal/actions/workflows/journeys.yml/badge.svg"></a>
  <img alt="Licence: MIT OR Apache-2.0" src="https://img.shields.io/badge/licence-MIT%20OR%20Apache--2.0-blue">
</p>

---

## Documentation

**Everything about using Seal lives at [7scholar.github.io/seal](https://7scholar.github.io/seal/).** This README is about the repository: how to build it, how it is laid out, and how to work on it.

| Page                                                                                        | What it answers                                                                                  |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Install](https://7scholar.github.io/seal/get-started/install/)                             | Every install route, and what being unsigned means for you                                       |
| [Your first sealed file](https://7scholar.github.io/seal/get-started/first-sealed-file/)    | From nothing to a sealed secret, in one sitting                                                  |
| [How it works](https://7scholar.github.io/seal/understand/how-it-works/)                    | Why a sealed file is a standard [age](https://age-encryption.org) file, and what that guarantees |
| [What Seal does not protect](https://7scholar.github.io/seal/understand/limits/)            | The threat model in full, including the two limits that will never have a workaround             |
| [Managing files in the application](https://7scholar.github.io/seal/guides/managing-files/) | The manage flow, the env-file editor, and files that are not env files                           |
| [Using Seal from scripts](https://7scholar.github.io/seal/guides/scripts/)                  | Resolving a secret at the moment of use, and the exit codes to act on                            |
| [CLI reference](https://7scholar.github.io/seal/reference/cli/)                             | Every command, flag and exit code                                                                |

## Status

The engine, the registry and the command-line tool are built, tested and working; the command-line tool is usable today. The desktop application is under active development, and all six [journeys](context/journeys/README.md) are satisfied — driven end to end against a release build in continuous integration on every push.

## Install

The command-line tool, with [Homebrew](https://brew.sh) or without it on macOS and Linux:

```bash
brew install 7scholar/tap/seal
```

```bash
curl -fsSL https://raw.githubusercontent.com/7scholar/seal/main/scripts/install.sh | sh
```

The desktop application is built from source, which needs [Rust](https://rustup.rs) and [Bun](https://bun.com):

```bash
git clone https://github.com/7scholar/seal
cd seal
bun install
bun run build
cargo build --release --manifest-path src-tauri/Cargo.toml --features custom-protocol
```

Seal is **not code-signed**, which is why these are the install routes: `curl` and Homebrew do not set macOS's quarantine flag, and a browser download does. Seal deliberately does not teach the `xattr` override. [Install](https://7scholar.github.io/seal/get-started/install/) explains the consequence in full, without softening it.

> [!WARNING]
> **Sealing protects from that moment on; it cannot reach backwards.** A credential that has already sat unprotected on disk, in a backup, or in a snapshot should be **rotated**, not merely sealed.
>
> **A forgotten password means the data is gone.** There is no recovery key, no escrow, no backdoor — any of those would be a copy of the key living on the machine, which is exactly what Seal exists to avoid.
>
> [The full threat model](https://7scholar.github.io/seal/understand/limits/) states what Seal defends against and what it does not.

## Repository layout

| Path                                           | What lives there                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| [crates/seal-engine/](crates/seal-engine/)     | The sealed-file format, atomic in-place replacement, locking and resealing          |
| [crates/seal-registry/](crates/seal-registry/) | The view over managed repos and their files: scanning, state, reconciliation        |
| [crates/seal-session/](crates/seal-session/)   | The unlocked session, its lifetime, and the zeroizing type plaintext is held behind |
| [crates/seal-dotenv/](crates/seal-dotenv/)     | Reading and rewriting env files without losing comments, quoting or line endings    |
| [crates/seal-cli/](crates/seal-cli/)           | The `seal` command-line tool                                                        |
| [src-tauri/](src-tauri/)                       | The desktop application shell: commands, capabilities and packaging                 |
| [ui/](ui/)                                     | The React interface the application embeds                                          |
| [e2e/](e2e/)                                   | The harness that drives the journeys against a real build                           |
| [site/](site/)                                 | The documentation site                                                              |
| [scripts/](scripts/)                           | The installer, the brand rendering, and the link and claim checks                   |
| [docs/](docs/)                                 | Operating procedures for this repository                                            |
| [context/](context/)                           | The plan tree and the journeys — where this project's design is documented          |

## Build and test

Needs a recent Rust toolchain — the version is pinned in [rust-toolchain.toml](rust-toolchain.toml) — and [Bun](https://bun.com).

```bash
bun install            # exactly what the lockfile pins
bun run build          # the interface
cargo build --release  # the engine, the CLI and the application
```

```bash
cargo test    # the Rust suite
bun run test  # the interface suite
```

Before launching or driving the application — the dev loop, a release binary, or the journey harness — read [docs/RUNNING.md](docs/RUNNING.md). A hand-built binary needs cargo features a plain `cargo build` does not pass, and guessing them produces blank windows that look like app defects and are not.

<details>
<summary><strong>Linux needs the system webview libraries</strong></summary>

The desktop application additionally needs `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev` and `patchelf`. The engine and the command-line tool build without them.

</details>

<details>
<summary><strong>Two tests skip themselves rather than fail</strong></summary>

The suite runs without any external tools. Tests that need something the environment may not provide skip themselves with a message: the reference `age` binary for the interoperability proof (`brew install age`), and a pseudo-terminal for the password-prompt test, which some sandboxes refuse. Continuous integration sets the variables that turn each of those skips into a failure, so a fresh clone is green either way while nothing goes silently unverified.

</details>

## Working on the code

The project is plan-driven: the founding intent, every design decision, and the current state of all work live in the plan tree at [context/plans/app/](context/plans/app/README.md), operated per [docs/plans/](docs/plans/README.md). Code carries no comments — the explanation lives in the plans, where it can be read as a whole and kept honest.

| Read this                              | When                                                            |
| -------------------------------------- | --------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                 | Before starting any work — it is the entry into the plan system |
| [CONTRIBUTING.md](CONTRIBUTING.md)     | Before sending a change, for the conventions it is held to      |
| [docs/RUNNING.md](docs/RUNNING.md)     | Launching, driving or screenshotting the application            |
| [docs/RELEASING.md](docs/RELEASING.md) | Turning a tag into an installable release                       |
| [SECURITY.md](SECURITY.md)             | Reporting a vulnerability — never as a public issue             |

## Licence

Dual-licensed under [MIT](LICENSE-MIT) and [Apache-2.0](LICENSE-APACHE).
