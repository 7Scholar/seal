# Intent

## What & why

Everything around the code that turns a working application into one a stranger can trust, install, and change. The root intent is explicit that this is planned work rather than an afterthought: the documentation someone needs to understand and trust the project, the README with installation and getting started, packaging and signing so the application installs without the platform refusing it, the release process, the licence and contribution guidance, and the maintainability that keeps all of it true a year from now.

It is done when someone who has never seen this repository can install Seal, understand what it does and does not protect them from, use it, and — if they want to — build it, test it, and send a change with the project's standards visible rather than folklore.

## Approach

TBD. The shape is partly forced already: the application is a Tauri desktop bundle plus a command-line binary, the format is standard age so the recovery story does not depend on Seal existing, and the threat model has sharp edges that documentation must state plainly rather than soften. What is not settled is how much of the release process to automate now versus later, and what the signing and notarisation story is for a project with no organisation behind it yet.

# Plans

- [x] ci.md -> the automated checks that keep every claim in the repository true
- [x] docs.md -> the README and the documents a stranger needs to trust and contribute
- [x] packaging.md -> bundling, distribution, and the release process bundling, signing, notarisation, and the release process

# Cursor

Freshly framed, with `ci.md` already complete because the gap it closed was real and immediate: seventy-six interface tests and a typecheck existed that **no automated run executed at all**.

`docs.md` is complete: the README now covers the application as well as the command-line tool, and every command it gives was verified against a clean clone — which caught a gitignored lockfile that would have made `npm ci` impossible. The security policy, contributing guide and both licence texts are in place.

`packaging.md` is complete for the decision that was made: no signing identity for now, so the command-line tool is the released artefact and the desktop application is build-from-source.

That decision was nearly implemented on a false premise. The question proposed shipping the CLI "because it has no signing problem, not being a bundled application" — measurement showed that is **wrong**, and the failure is worse than for a bundle: an unsigned binary is killed behind a malware dialog with no override button, where an unsigned bundle at least offers right-click-to-open. What actually works is the packaging shape: quarantine survives `.zip` extraction but not `tar`, so the release ships tarballs and continuous integration asserts a quarantined tarball still yields a runnable binary — verified to accept a tarball and reject a zip.

# Open threads

- A Homebrew formula is the natural primary route for the command-line tool, since a formula installs without setting quarantine at all. Not built yet.
- Windows and Linux artefacts are unaddressed until the macOS path is proven end to end, since whatever is learned there mostly transfers.
- **Tooling friction to raise:** `set_boundary` routes its `--include` patterns through the same path resolver that coverage arguments use, so a boundary pattern naming a file that also exists under `context/_scripts/` — `README.md` is the live case — is rejected as ambiguous even though a boundary pattern is unambiguously repo-relative. Absolute paths work around it. The resolver is right for coverage arguments and wrong here; the fix belongs in the script rather than in every caller.
