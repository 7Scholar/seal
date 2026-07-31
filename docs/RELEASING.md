# Releasing

How a tagged version becomes something a stranger can install. The decisions behind this — why the command-line tool is the released artefact and the application is built from source — live in [the packaging plan](../context/plans/app/publishing/packaging.md); this document is the operating procedure.

## What a release produces

Pushing a tag matching `v*` builds the command-line tool for four targets, publishes them as a GitHub release with checksums, and updates the Homebrew tap. Unsigned application bundles are built too, but stay as workflow artefacts rather than release downloads: they exist so a contributor can check a build, not for users to install.

```
git tag v0.2.0
git push origin v0.2.0
```

The version in the tag must match the `version` in the workspace `Cargo.toml`; nothing enforces this yet, so check it before tagging.

## The one-time setup

Two things live outside this repository and must exist before the first release.

**The tap repository.** Homebrew resolves `brew install 7scholar/tap/seal` to `github.com/7scholar/homebrew-tap` — the `homebrew-` prefix is the convention that makes the short name work, and the repository must be public. It needs a `Formula/` directory; the release fills it in.

```
gh repo create 7scholar/homebrew-tap --public \
  --description "Homebrew formulae for Seal"
```

**A token that may write to it.** The release workflow pushes the rendered formula to that repository, which the default `GITHUB_TOKEN` cannot reach because it is scoped to this repository alone. Create a fine-grained personal access token with **contents: write** on `homebrew-tap` only, and add it to this repository as the secret `SEAL_TAP_TOKEN`.

Without the secret the release still succeeds: the formula is rendered and printed, and the tap step reports that it was not pushed. That is deliberate, so a fork's release does not fail on a secret it was never going to have.

## What the release actually verifies

Continuous integration proves the install route on every change rather than at tag time, because a release is a bad moment to discover the installer is broken. It stands up a real served release, runs the installer against it, asserts the installed binary works, and asserts a **tampered download is refused**. It renders the formula and runs `brew audit` over it.

The macOS build additionally asserts that a quarantined tarball extracts to a binary carrying no quarantine — the property the whole unsigned distribution depends on.

## Signing

The binaries are **ad-hoc signed** in the release workflow. This satisfies the Apple Silicon requirement that arm64 code carry a signature to execute at all, and costs nothing. It is not notarisation and does not pass Gatekeeper: a browser-downloaded binary is still refused. The install routes avoid that by never setting quarantine in the first place.

Taking on a Developer ID later changes this file and the release workflow, not the installer or the formula.
