# Seal

Seal encrypts the secret files in your repositories **in place**. A `.env.production` stays exactly where it is, with its name and location plainly visible, but its contents are unreadable — to you, to any program on the machine, and to any agent working in the codebase. The only thing that opens it is a password that exists nowhere on the machine, typed at the moment it is needed.

This exists to make two things coexist that otherwise cannot: giving tools and agents full access to your working environments, and keeping production credentials on the same machine for the local scripts that deploy with them.

## Status

Under active development. The engine, registry and command-line tool are built, tested and working. The desktop application carries its first end-to-end proof: the first-run experience — opening for the first time, choosing the master password, importing a repository, and sealing a file — is driven automatically against a real build and passes. The remaining [journeys](context/journeys/README.md) are partially driven, and the application is not considered done until every one has been driven end to end in a real build.

The command-line tool is usable today.

Seal is **not code-signed**, which shapes how it is installed. macOS does not merely warn about unsigned software; it refuses to run it, behind a dialog that reads as a malware accusation and offers no override. So:

- **The command-line tool** is released as a `.tar.gz` per platform. Extracted with `tar`, it runs normally — quarantine does not survive tar extraction, though it does survive a `.zip`, which is why no zip is published.
- **The desktop application** is build-from-source for now. Unsigned bundles are produced on each tag so a contributor can check a build, but they will not open on a Mac without deliberately overriding the system, and that is not something a tool asking to hold your secrets should teach you to do.

Signing is a matter of the project taking on a developer identity rather than a code change, and is revisited when that happens.

## How it works

A sealed file is a **standard [age](https://age-encryption.org) file** with a passphrase — nothing proprietary. This matters more than it sounds: if Seal disappeared tomorrow, every sealed file would still open with the stock `age` tool and your password. That guarantee is verified in both directions by the test suite against the reference implementation.

Sealing replaces the file atomically and preserves its permissions, so a `0600` secrets file stays `0600` rather than being quietly widened. A crash at any moment leaves either the complete old file or the complete new one, never a half-written one.

### Managing files in the application

The desktop application is where files are managed. You point it at a repository, and it looks for files that hold secrets — env files, key files, credential files — classifying each as a likely secret, a possible one, or a template that is meant to stay readable. Only the likely secrets are pre-selected, because managing a file that was meant to be readable encrypts it and breaks your build. Importing a folder never encrypts anything; sealing stays a separate, deliberate action.

Env files get a per-variable editor. Values are masked, and a value is fetched only when you ask to see that one row — the application holds no more of the file than the row on screen. Saving preserves your comments, ordering, quoting and line endings exactly, changing only the lines whose value you changed. Files that are not env files are stored and encrypted as they are, never edited.

Before anything is sealed for the first time the application asks you to acknowledge two facts it cannot soften: that a forgotten password loses the data permanently, and that sealing cannot protect a secret that was already exposed.

### Resolving a secret in a script

Install the command-line tool from a release tarball:

```bash
tar xzf seal-aarch64-apple-darwin.tar.gz
sudo mv seal /usr/local/bin/
```

Or build it yourself with `cargo build --release -p seal-cli`. It is also bundled inside the application, at `Seal.app/Contents/MacOS/seal`, if you built that.

A deploy script then asks for a file's contents at the moment of use:

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

## Building from source

Requires a recent Rust toolchain and Node 22. The repository pins the Rust version it needs, and `npm ci` installs exactly what the lockfile pins.

```bash
npm ci
npm run build          # the interface
cargo build --release  # the engine, the CLI and the application
```

To run the tests:

```bash
cargo test    # the Rust suite
npm test      # the interface suite
```

On Linux the desktop application additionally needs the system webview libraries — `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev` and `patchelf`. The engine and the command-line tool build without them.

The test suite runs without any external tools. Tests that need something the environment may not provide skip themselves with a message — the reference `age` binary for the interoperability proof (`brew install age`), and a pseudo-terminal for the password-prompt test, which some sandboxes refuse. Continuous integration sets the variables that turn each of those skips into a failure, so a fresh clone is green either way while nothing goes silently unverified.

## Contributing and project layout

The project is plan-driven: the founding intent, every design decision, and the current state of all work live in the plan tree at [context/plans/app/](context/plans/app/README.md), operated per [docs/plans/](docs/plans/README.md). Anyone — human or agent — picking up work starts at [AGENTS.md](AGENTS.md) and follows the entry manual from there.

Code carries no comments; the explanation lives in the plans, where it can be read as a whole and kept honest.

Two conventions are worth knowing before sending a change. Every load-bearing guard is expected to be **confirmed non-vacuous** — break it deliberately, watch the matching test fail, restore it — because a test that passes whether or not the code works is worse than no test. And a design decision that a later reader would reasonably try to "simplify" back out belongs in the relevant `MEMORY.md` with the mistake it prevents, not in a comment.
