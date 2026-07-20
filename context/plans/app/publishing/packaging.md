Part of [the publishing plan](README.md).

# Scope

Turning the built application into something a stranger can install: bundling, shipping the command-line tool alongside it, code signing and notarisation, and the release process that produces artefacts. Out of scope: the checks that gate a merge (`ci.md`) and the documents that explain the project (`docs.md`).

# What exists

Bundling works today and was verified rather than assumed. `tauri build` produces `Seal.app` and a 4 MB `Seal_0.1.0_aarch64.dmg` on macOS from a clean tree, with the interface built and embedded.

# What is missing

Three things, and the first is a blocker for anyone who is not building from source.

**The bundle is ad-hoc signed, and Gatekeeper rejects it.** Measured: the shipped `.app` reports `Signature=adhoc`, and `spctl` refuses it. A user who downloads a release today is told the application is damaged and cannot open it. Ad-hoc signing is what the toolchain does when no identity is configured; it is not a signature in any sense a platform trusts. Fixing this needs a real signing identity, which is a decision about the project rather than about the code — raised in `QUESTIONS.md`.

**The command-line tool is not in the bundle.** Measured: `Seal.app/Contents/MacOS/` contains only the desktop binary. The root intent makes runtime resolution from a bash script a first-class use, so an install that omits `seal` delivers half the product. The tool ships as a sidecar in the bundle, with a documented way to put it on the user's path.

**There is no release process.** No workflow builds artefacts on a tag, and no artefact carries a checksum. For a tool whose entire value is trust, an unverifiable download is a poor first impression.

# Steps

- [ ] Ship the command-line tool inside the bundle, and document how a user puts it on their path.
- [!] Sign and notarise the macOS bundle — awaiting an answer in `QUESTIONS.md`, since it needs a signing identity.
- [ ] Build artefacts on a tag, with checksums published alongside them.
- [ ] Verify a signed artefact actually passes Gatekeeper on a machine that did not build it, rather than trusting that the signing step succeeded.
- [ ] Decide what Linux and Windows artefacts are produced, once the macOS path is proven.

# Open threads

- Whether to publish a Homebrew formula for the command-line tool. It is the idiomatic way to install a CLI on macOS and is independent of the desktop signing question, so it can proceed either way.
- Universal versus per-architecture macOS builds. A universal binary halves the release matrix and roughly doubles the download; at 4 MB the size argument is weak.
