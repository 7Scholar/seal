---
title: Install
description: Install the Seal command-line tool with one command, and build the desktop application from source.
---

## The command-line tool

With [Homebrew](https://brew.sh):

```bash
brew install 7scholar/tap/seal
```

Without it, on macOS or Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/7scholar/seal/main/scripts/install.sh | sh
```

The script picks the right build for your platform, checks it against the published checksum, and refuses to install anything that does not match. It installs to `~/.local/bin` or `/usr/local/bin`, whichever it can write to; set `SEAL_INSTALL_DIR` to choose.

If you would rather read it before running it — reasonable for any install script, more so for one shipping a tool that holds your secrets — it is [`scripts/install.sh`](https://github.com/7scholar/seal/blob/main/scripts/install.sh), and you can download it, read it, and run it as separate steps.

Either way, check what you got:

```bash
seal --version
```

## The desktop application

Built from source, which needs [Rust](https://rustup.rs) and [Bun](https://bun.com):

```bash
git clone https://github.com/7scholar/seal
cd seal
bun install
bun run build
cargo build --release --manifest-path src-tauri/Cargo.toml --features custom-protocol
```

That produces `target/release/seal-desktop`, which you can run directly.

The `--features custom-protocol` is not optional: without it the binary looks for a development server and shows a blank window.

If you also build the command-line tool from the same checkout — `cargo build --release -p seal-cli` — then `./target/release/seal open` launches this build, because `seal open` prefers the application sitting beside it over any other installation.

## What unsigned means for you

Seal has no Apple Developer identity, and that has one specific consequence worth stating plainly rather than burying.

macOS refuses to run software that arrives carrying the quarantine flag unless it is signed and notarised. That flag is set by *how* a file reaches your disk: a **browser download sets it**, while `curl`, `tar` and Homebrew do not. So the install routes above work — the binaries are ad-hoc signed, which is what Apple Silicon requires to execute code at all — while downloading a release tarball by clicking a link in a browser produces a binary macOS will kill, behind a dialog that reads as a malware accusation.

Unsigned application bundles are produced on each tag so a contributor can check a build. They are **not** for general use and will not open by double-clicking.

Seal deliberately does not tell you to run `xattr -cr` to get around this: teaching you to disarm a security warning is a poor trade for a tool whose entire purpose is protecting secrets. Build the application from source, which is the honest route until the project takes on a signing identity.

## Next

[Your first sealed file](/seal/get-started/first-sealed-file/) walks the whole path, from opening the application to resolving a secret in a script.
