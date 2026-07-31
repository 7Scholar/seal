Part of [the publishing plan](README.md).

# Scope

Turning the built application into something a stranger can install: bundling, shipping the command-line tool alongside it, code signing and notarisation, and the release process that produces artefacts. Out of scope: the checks that gate a merge (`ci.md`) and the documents that explain the project (`docs.md`).

# What exists

Bundling works today and was verified rather than assumed. `tauri build` produces `Seal.app` and a 4 MB `Seal_0.1.0_aarch64.dmg` on macOS from a clean tree, with the interface built and embedded.

## How Seal is distributed, and why

The signing question is settled: **no paid signing identity for now.** That decision shapes distribution rather than merely deferring it, because measurement showed the obvious fallbacks do not work.

An unsigned artefact on macOS is not merely warned about — it is **killed**, behind a dialog reading "Apple could not verify this app is free of malware" whose only buttons are Done and Move to Bin. There is no override affordance. Measured across three shapes: a bare downloaded binary is killed, a binary extracted from a quarantined `.zip` is killed, and a binary extracted from a quarantined `.tar.gz` **runs normally**, because quarantine propagates through zip extraction but not through tar.

So distribution is:

- **The command-line tool** ships as a `.tar.gz` per platform, with checksums. Continuous integration asserts that a quarantined tarball extracts to a binary that actually runs, which is verified to accept the tarball and reject a zip.
- **The desktop application** is build-from-source, documented as such. Bundles are still produced on a tag so a contributor can check a build, but they are labelled unsigned and are not for users to download.
- **Homebrew** is the intended primary route for the command-line tool, since a formula installs without setting quarantine at all.

This is honest about the project's state rather than shipping something that dies on first run, and nothing about it forecloses signing later.

## What installation the two gates actually allow

macOS applies two independent gates, and only one of them costs money. The **execution gate** on Apple Silicon refuses arm64 code carrying no signature at all, and a free ad-hoc signature satisfies it. The **Gatekeeper gate** fires only on files carrying `com.apple.quarantine`, and only a paid Developer ID with notarisation passes it. Since quarantine is applied by the delivery mechanism rather than by the artefact — browsers set it, `curl` and `tar` do not, and Homebrew never adds it — an unsigned command-line tool installs and runs cleanly through a tap or an installer script. Measured end to end rather than assumed: an unsigned `seal` tarred, quarantined to simulate a download, and installed through a real formula arrives carrying only `com.apple.provenance`, and runs.

That same reasoning does **not** extend to the desktop application, which is why it is not distributed as a cask; `MEMORY.md` holds the constraint and its expiry date.

# What is missing

The command-line tool has no one-command installation: the released artefact is a tarball a user must find, extract and move onto their path by hand. A tap and an installer script are what close that, and both need a published GitHub release to download from — which the release workflow does not currently produce, since it uploads its artefacts as workflow artefacts that a stranger cannot reach.

How the desktop application is installed is blocked on the question in `QUESTIONS.md`.

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
- [!] blocked — awaiting answer in `QUESTIONS.md`: how Seal is installed, and whether the desktop application stays build-from-source or takes on a signing identity.
- [ ] A tap holding the command-line tool's formula, so it installs in one command.
- [ ] An installer script for people without Homebrew, and for Linux.
- [ ] Ad-hoc sign the released binaries in continuous integration, satisfying the Apple Silicon execution gate.
- [ ] Decide what Windows artefacts are produced, once someone wants them.

# Open threads

- Universal versus per-architecture macOS builds. A universal binary halves the release matrix and roughly doubles the download; at 4 MB the size argument is weak.
- Whether the release should publish its artefacts to a GitHub release at all: the workflow currently builds and checksums them but only uploads them as workflow artefacts, which a stranger cannot download. Whatever the installation answer, a tap and an installer script both need a stable public download URL, so this is settled by the same work.
