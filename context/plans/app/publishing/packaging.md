Part of [the publishing plan](README.md).

# Scope

Turning the built application into something a stranger can install: bundling, shipping the command-line tool alongside it, code signing and notarisation, and the release process that produces artefacts. Out of scope: the checks that gate a merge (`ci.md`) and the documents that explain the project (`docs.md`).

# What exists

The command-line tool installs in one command — `brew install 7scholar/tap/seal`, or an installer script piped to a shell — from a GitHub release the workflow publishes on a tag. Bundling works and was verified rather than assumed: `tauri build` produces `Seal.app` and a 4 MB `Seal_0.1.0_aarch64.dmg` on macOS from a clean tree, with the interface built and embedded.

The install route was measured end to end rather than reasoned about: an unsigned, ad-hoc-signed `seal`, packaged as a tarball, quarantined to simulate a browser download, and installed through a real Homebrew formula, arrives carrying only `com.apple.provenance` — no quarantine — and runs. The installer script was driven against a served release, installed a working binary, and **refused a tarball whose bytes had been altered after its checksum was published**.

## How Seal is distributed, and why

The signing question is settled: **no paid signing identity for now.** That decision shapes distribution rather than merely deferring it, because measurement showed the obvious fallbacks do not work.

An unsigned artefact on macOS is not merely warned about — it is **killed**, behind a dialog reading "Apple could not verify this app is free of malware" whose only buttons are Done and Move to Bin. There is no override affordance. Measured across three shapes: a bare downloaded binary is killed, a binary extracted from a quarantined `.zip` is killed, and a binary extracted from a quarantined `.tar.gz` **runs normally**, because quarantine propagates through zip extraction but not through tar.

So distribution is:

- **The command-line tool** installs in one command, by a Homebrew formula in a project-owned tap or by an installer script, from a published GitHub release carrying a `.tar.gz` per platform and their checksums.
- **The desktop application** is build-from-source, documented as such. Bundles are still produced on a tag so a contributor can check a build, but they stay workflow artefacts rather than release downloads, because publishing them would offer a user a download macOS refuses to open.

This is honest about the project's state rather than shipping something that dies on first run, and nothing about it forecloses signing later.

## The install routes, and what each guarantees

**Four targets are built**: macOS on Apple Silicon and Intel, Linux on x86-64 and arm64. An installer that fails on a colleague's Intel Mac is not an install story, so the matrix covers what a user plausibly has rather than what the release runner happens to be.

**Every released binary is ad-hoc signed.** This is not notarisation and is not security theatre: Apple Silicon refuses to execute arm64 code carrying no signature at all, so an unsigned binary is killed regardless of how it arrived. Ad-hoc signing satisfies that gate and costs nothing.

**The formula is rendered from the artefacts rather than hand-maintained.** A script takes a version and a directory of tarballs and emits the formula with each platform's real checksum, so the hashes cannot drift from what was published. The release pushes it to the tap; when the tap token is absent — a fork, most obviously — the formula is still rendered and checked, and the step reports that it was not pushed rather than failing.

**The installer script verifies before it installs.** It picks the platform's tarball, downloads the published checksum file, and refuses to install anything that does not match. It installs to a writable directory it chooses (or one the user names), and tells the user when that directory is not on their path — a silent install to somewhere unreachable is indistinguishable from a broken one.

**The whole route is proven on every change, not at tag time.** Continuous integration stands up a real served release, runs the installer against it, asserts the installed binary runs and carries the `open` subcommand, and asserts that a **tampered download is refused**. It renders the formula and runs `brew audit` over it. A release is the wrong moment to discover the installer is broken.

## What installation the two gates actually allow

macOS applies two independent gates, and only one of them costs money. The **execution gate** on Apple Silicon refuses arm64 code carrying no signature at all, and a free ad-hoc signature satisfies it. The **Gatekeeper gate** fires only on files carrying `com.apple.quarantine`, and only a paid Developer ID with notarisation passes it. Since quarantine is applied by the delivery mechanism rather than by the artefact — browsers set it, `curl` and `tar` do not, and Homebrew never adds it — an unsigned command-line tool installs and runs cleanly through a tap or an installer script. Measured end to end rather than assumed: an unsigned `seal` tarred, quarantined to simulate a download, and installed through a real formula arrives carrying only `com.apple.provenance`, and runs.

That same reasoning does **not** extend to the desktop application, which is why it is not distributed as a cask; `MEMORY.md` holds the constraint and its expiry date.

# What is missing

Two things live outside this repository and cannot be created from inside it: the `homebrew-tap` repository itself, and the `SEAL_TAP_TOKEN` secret that lets the release push to it. Both are recorded in [docs/RELEASING.md](../../../../docs/RELEASING.md). Until they exist, a tagged release publishes correctly and reports that the tap was not updated.

Windows is unaddressed: no target is built and no install route exists.

# Approach

## The command-line tool ships inside the application

The root intent makes runtime resolution from a bash script a first-class use, so an install that omits `seal` delivers half the product. It is bundled as a sidecar — built by a script that names the binary with the host target triple, which is the convention the bundler requires — and the README documents the one-line symlink that puts it on a user's path.

Verified rather than assumed: the bundle now contains both binaries, and the copy inside `Seal.app` runs and correctly classifies a real file.

## Releases are reproducible and checkable

A tagged push builds bundles on macOS and Linux, collects every artefact, and publishes a `SHA256SUMS` alongside them. For a tool whose whole value is trust, a download nobody can verify is a poor first impression.

# Steps

- [x] Ship the command-line tool inside the bundle, and document how a user puts it on their path.
- [x] Build artefacts on a tag, with checksums published alongside them.
- [x] Package the command-line tool so an unsigned download actually runs, asserted in continuous integration.
- [x] Publish a GitHub release on a tag, carrying a tarball per platform and their checksums, with the tag checked against the declared version.
- [x] Build the command-line tool for both macOS architectures and both Linux ones, ad-hoc signed so Apple Silicon will execute them.
- [x] Render the Homebrew formula from the built artefacts, and push it to the tap when a token allows.
- [x] An installer script that verifies the download against its published checksum and refuses a mismatch.
- [x] Prove the whole route in continuous integration: install from a served release, assert the binary works, assert a tampered download is refused, and audit the rendered formula.
- [+] Sign and notarise the macOS bundle, making the desktop application installable by a stranger. Out of scope until the project takes on a signing identity — answered in `QUESTIONS.md`.
- [ ] Decide what Windows artefacts are produced, once someone wants them.

# Open threads

- Universal versus per-architecture macOS builds. Both architectures are now built separately, which the formula and the installer both select between correctly; a universal binary would halve the matrix and roughly double the download. At 4 MB the size argument is weak either way, so this is not urgent.
- The first real tag will exercise the release path for the first time. Continuous integration proves the installer and the formula on every change, but nothing has yet driven `gh release create` or the tap push, so expect that first release to need a fix.
