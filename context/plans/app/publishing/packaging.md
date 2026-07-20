Part of [the publishing plan](README.md).

# Scope

Turning the built application into something a stranger can install: bundling, shipping the command-line tool alongside it, code signing and notarisation, and the release process that produces artefacts. Out of scope: the checks that gate a merge (`ci.md`) and the documents that explain the project (`docs.md`).

# What exists

Bundling works today and was verified rather than assumed. `tauri build` produces `Seal.app` and a 4 MB `Seal_0.1.0_aarch64.dmg` on macOS from a clean tree, with the interface built and embedded.

# What is missing

Three things, and the first is a blocker for anyone who is not building from source.

**The bundle is ad-hoc signed, and Gatekeeper rejects it.** Measured: the shipped `.app` reports `Signature=adhoc`, and `spctl` refuses it. A user who downloads a release today is told the application is damaged and cannot open it. Ad-hoc signing is what the toolchain does when no identity is configured; it is not a signature in any sense a platform trusts. Fixing this needs a real signing identity, which is a decision about the project rather than about the code — raised in `QUESTIONS.md`.

# Approach

## The command-line tool ships inside the application

The root intent makes runtime resolution from a bash script a first-class use, so an install that omits `seal` delivers half the product. It is bundled as a sidecar — built by a script that names the binary with the host target triple, which is the convention the bundler requires — and the README documents the one-line symlink that puts it on a user's path.

Verified rather than assumed: the bundle now contains both binaries, and the copy inside `Seal.app` runs and correctly classifies a real file.

## Releases are reproducible and checkable

A tagged push builds bundles on macOS and Linux, collects every artefact, and publishes a `SHA256SUMS` alongside them. For a tool whose whole value is trust, a download nobody can verify is a poor first impression.

# Steps

- [x] Ship the command-line tool inside the bundle, and document how a user puts it on their path.
- [!] Sign and notarise the macOS bundle — awaiting an answer in `QUESTIONS.md`, since it needs a signing identity.
- [x] Build artefacts on a tag, with checksums published alongside them.
- [ ] Verify a signed artefact actually passes Gatekeeper on a machine that did not build it, rather than trusting that the signing step succeeded.
- [ ] Decide what Linux and Windows artefacts are produced, once the macOS path is proven.

# Open threads

- Whether to publish a Homebrew formula for the command-line tool. It is the idiomatic way to install a CLI on macOS and is independent of the desktop signing question, so it can proceed either way.
- Universal versus per-architecture macOS builds. A universal binary halves the release matrix and roughly doubles the download; at 4 MB the size argument is weak.
