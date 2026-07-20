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

# What is missing

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
- [+] Sign and notarise the macOS bundle. Deliberately out of scope for now — answered in `QUESTIONS.md` — and revisited if the project takes on a signing identity.
- [ ] A Homebrew formula for the command-line tool.
- [ ] Decide what Windows artefacts are produced, once someone wants them.

# Open threads

- Whether to publish a Homebrew formula for the command-line tool. It is the idiomatic way to install a CLI on macOS and is independent of the desktop signing question, so it can proceed either way.
- Universal versus per-architecture macOS builds. A universal binary halves the release matrix and roughly doubles the download; at 4 MB the size argument is weak.
