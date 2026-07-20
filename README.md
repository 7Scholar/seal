# Seal

Seal encrypts the secret files in your repositories **in place**. A `.env.production` stays exactly where it is, with its name and location plainly visible, but its contents are unreadable — to you, to any program on the machine, and to any agent working in the codebase. The only thing that opens it is a password that exists nowhere on the machine, typed at the moment it is needed.

This exists to make two things coexist that otherwise cannot: giving tools and agents full access to your working environments, and keeping production credentials on the same machine for the local scripts that deploy with them.

## Status

Under active development, and not yet ready to install. The cryptographic engine, the cross-repo registry, and the command-line resolver are implemented and tested; the desktop application is being built. The plan tree records exactly where everything stands.

## How it works

A sealed file is a **standard [age](https://age-encryption.org) file** with a passphrase — nothing proprietary. This matters more than it sounds: if Seal disappeared tomorrow, every sealed file would still open with the stock `age` tool and your password. That guarantee is verified in both directions by the test suite against the reference implementation.

Sealing replaces the file atomically and preserves its permissions, so a `0600` secrets file stays `0600` rather than being quietly widened. A crash at any moment leaves either the complete old file or the complete new one, never a half-written one.

### Resolving a secret in a script

Once the command-line tool is installed, a deploy script asks for a file's contents at the moment of use:

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

Requires a recent Rust toolchain; the repository pins the version it needs.

```bash
cargo build --release
cargo test
```

The test suite runs without any external tools. Tests that verify interoperability with the reference `age` implementation skip themselves unless that binary is installed (`brew install age`), so a fresh clone is green either way.

## Contributing and project layout

The project is plan-driven: the founding intent, every design decision, and the current state of all work live in the plan tree at [context/plans/app/](context/plans/app/README.md), operated per [docs/plans/](docs/plans/README.md). Anyone — human or agent — picking up work starts at [AGENTS.md](AGENTS.md) and follows the entry manual from there.

Code carries no comments; the explanation lives in the plans, where it can be read as a whole and kept honest.
