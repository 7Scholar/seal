# Seal

Seal encrypts the secret files in your repositories **in place**. A `.env.production` stays exactly where it is, with its name and location plainly visible, but its contents are unreadable — to you, to any program on the machine, and to any agent working in the codebase. The only thing that opens it is a password that exists nowhere on the machine, typed at the moment it is needed.

This exists to make two things coexist that otherwise cannot: giving tools and agents full access to your working environments, and keeping production credentials on the same machine for the local scripts that deploy with them.

## Status

Under active development. The engine, registry and command-line tool are built, tested and working. The desktop application carries its first end-to-end proof: the first-run experience — opening for the first time, choosing the master password, importing a repository, and sealing a file — is driven automatically against a real build and passes. The remaining [journeys](context/journeys/README.md) are partially driven, and the application is not considered done until every one has been driven end to end in a real build.

The command-line tool is usable today.

Seal is **not code-signed**, which is why the command-line tool installs by Homebrew or the installer script rather than by downloading it in a browser, and why the desktop application is built from source. [Installation](#installation) covers both, and [what unsigned means for you](#what-unsigned-means-for-you) explains the consequence without softening it.

## Installation

### The command-line tool

With [Homebrew](https://brew.sh):

```bash
brew install 7scholar/tap/seal
```

Without it, on macOS or Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/7scholar/seal/main/scripts/install.sh | sh
```

The script picks the right build for your platform, checks it against the published checksum, and refuses to install anything that does not match. It installs to `~/.local/bin` or `/usr/local/bin`, whichever it can write to; set `SEAL_INSTALL_DIR` to choose. If you would rather read it before running it — reasonable for any install script, more so for one shipping a tool that holds your secrets — it is [`scripts/install.sh`](scripts/install.sh), and you can download it, read it, and run it as separate steps.

Either way, check what you got:

```bash
seal --version
```

### The desktop application

Built from source, which needs [Rust](https://rustup.rs) and [Bun](https://bun.com):

```bash
git clone https://github.com/7scholar/seal
cd seal
bun install
bun run build
cargo build --release --manifest-path src-tauri/Cargo.toml --features custom-protocol
```

That produces `target/release/seal-desktop`, which you can run directly. The `--features custom-protocol` is not optional: without it the binary looks for a development server and shows a blank window. [docs/RUNNING.md](docs/RUNNING.md) has the detail.

If you also build the command-line tool from the same checkout — `cargo build --release -p seal-cli` — then `./target/release/seal open` launches this build, because `seal open` prefers the application sitting beside it over any other installation.

### What unsigned means for you

Seal has no Apple Developer identity, and that has one specific consequence worth stating plainly rather than burying.

macOS refuses to run software that arrives carrying the quarantine flag unless it is signed and notarised. That flag is set by *how* a file reaches your disk: a **browser download sets it**, while `curl`, `tar` and Homebrew do not. So the install routes above work — the binaries are ad-hoc signed, which is what Apple Silicon requires to execute code at all — while downloading a release tarball by clicking a link in a browser produces a binary macOS will kill, behind a dialog that reads as a malware accusation.

Unsigned application bundles are produced on each tag so a contributor can check a build. They are **not** for general use and will not open by double-clicking. Seal deliberately does not tell you to run `xattr -cr` to get around this: teaching you to disarm a security warning is a poor trade for a tool whose entire purpose is protecting secrets. Build the application from source, which is the honest route until the project takes on a signing identity.

## How it works

A sealed file is a **standard [age](https://age-encryption.org) file** with a passphrase — nothing proprietary. This matters more than it sounds: if Seal disappeared tomorrow, every sealed file would still open with the stock `age` tool and your password. That guarantee is verified in both directions by the test suite against the reference implementation.

Sealing replaces the file atomically and preserves its permissions, so a `0600` secrets file stays `0600` rather than being quietly widened. A crash at any moment leaves either the complete old file or the complete new one, never a half-written one.

### Managing files in the application

The desktop application is where files are managed. You point it at a repository, and it looks for files that hold secrets — env files, key files, credential files — classifying each as a likely secret, a possible one, or a template that is meant to stay readable. Only the likely secrets are pre-selected, because managing a file that was meant to be readable encrypts it and breaks your build. Importing a folder never encrypts anything; sealing stays a separate, deliberate action.

Env files get a per-variable editor. Values are masked, and a value is fetched only when you ask to see that one row — the application holds no more of the file than the row on screen. Saving preserves your comments, ordering, quoting and line endings exactly, changing only the lines whose value you changed. Files that are not env files are stored and encrypted as they are, never edited.

Before anything is sealed for the first time the application asks you to acknowledge two facts it cannot soften: that a forgotten password loses the data permanently, and that sealing cannot protect a secret that was already exposed.

### Opening the application from the terminal

```bash
seal open
```

This launches the application and returns immediately. It looks for the application beside the `seal` binary you ran first, then for one installed on your system. If it finds none it says so and exits non-zero rather than appearing to do nothing.

That order is what makes it predictable in a source checkout: `./target/release/seal open` opens the build you just made, rather than an older copy installed elsewhere.

### Resolving a secret in a script

With the command-line tool [installed](#the-command-line-tool), a deploy script asks for a file's contents at the moment of use:

```bash
value=$(seal resolve .env.production)
```

The password is typed on your terminal; only the file's contents reach standard output, byte for byte. To load a whole env file into the environment:

```bash
payload=$(seal resolve .env.production)
set -a
eval "$payload"
set +a
```

Use this rather than `source <(seal resolve .env.production)`, which looks equivalent but **silently produces empty variables** on the version of bash that ships with macOS.

Exit codes distinguish what a script would act on differently: `0` success, `3` wrong password, `4` no such file, `5` not a sealed file, `6` the file is busy, `7` the file is damaged, `8` no terminal available to ask for a password, `130` cancelled.

For automation without a terminal, supply the password on a file descriptor — never through an environment variable, which leaks into process listings and CI logs:

```bash
seal resolve .env.production --passphrase-fd 3 3<secret-source
```

## What Seal protects, and what it does not

Seal defends against anything that can **read the machine at rest**: an agent with filesystem access, a stolen laptop, a backup or sync service, a malicious dependency. Against those, a sealed file is unreadable.

It does not defend against an attacker watching the machine **while you are actively using a secret**. At the moment of resolution the plaintext necessarily exists in memory, and a process that can read another process's memory defeats any tool of this kind.

Two consequences worth stating plainly:

- **Sealing protects from that moment on; it cannot reach backwards.** Replacing a plaintext file unlinks the old contents but cannot overwrite them, and on modern filesystems and solid-state drives no tool can promise otherwise. A credential that has already sat unprotected on disk, in a backup, or in a snapshot should be **rotated**, not merely sealed. Sealing also does not revoke access for a program that already had the file open.
- **A forgotten password means the data is gone.** There is no recovery key, no escrow, no backdoor — any of those would be a copy of the key living on the machine, which is exactly what Seal exists to avoid.

## Building and testing

Building the desktop application is covered under [Installation](#the-desktop-application); this is what a contributor needs beyond it. Requires a recent Rust toolchain and Bun — the repository pins the Rust version it needs, and `bun install` installs exactly what the lockfile pins.

```bash
bun install
bun run build          # the interface
cargo build --release  # the engine, the CLI and the application
```

To run the tests:

```bash
cargo test    # the Rust suite
bun run test      # the interface suite
```

On Linux the desktop application additionally needs the system webview libraries — `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev` and `patchelf`. The engine and the command-line tool build without them.

The test suite runs without any external tools. Tests that need something the environment may not provide skip themselves with a message — the reference `age` binary for the interoperability proof (`brew install age`), and a pseudo-terminal for the password-prompt test, which some sandboxes refuse. Continuous integration sets the variables that turn each of those skips into a failure, so a fresh clone is green either way while nothing goes silently unverified.

## Contributing and project layout

The project is plan-driven: the founding intent, every design decision, and the current state of all work live in the plan tree at [context/plans/app/](context/plans/app/README.md), operated per [docs/plans/](docs/plans/README.md). Anyone — human or agent — picking up work starts at [AGENTS.md](AGENTS.md) and follows the entry manual from there.

Two operating procedures sit alongside it: [docs/RUNNING.md](docs/RUNNING.md) for launching and driving the application, and [docs/RELEASING.md](docs/RELEASING.md) for how a tag becomes an installable release.

Code carries no comments; the explanation lives in the plans, where it can be read as a whole and kept honest.

Two conventions are worth knowing before sending a change. Every load-bearing guard is expected to be **confirmed non-vacuous** — break it deliberately, watch the matching test fail, restore it — because a test that passes whether or not the code works is worse than no test. And a design decision that a later reader would reasonably try to "simplify" back out belongs in the relevant `MEMORY.md` with the mistake it prevents, not in a comment.
