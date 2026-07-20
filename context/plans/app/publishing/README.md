# Intent

## What & why

Everything around the code that turns a working application into one a stranger can trust, install, and change. The root intent is explicit that this is planned work rather than an afterthought: the documentation someone needs to understand and trust the project, the README with installation and getting started, packaging and signing so the application installs without the platform refusing it, the release process, the licence and contribution guidance, and the maintainability that keeps all of it true a year from now.

It is done when someone who has never seen this repository can install Seal, understand what it does and does not protect them from, use it, and — if they want to — build it, test it, and send a change with the project's standards visible rather than folklore.

## Approach

TBD. The shape is partly forced already: the application is a Tauri desktop bundle plus a command-line binary, the format is standard age so the recovery story does not depend on Seal existing, and the threat model has sharp edges that documentation must state plainly rather than soften. What is not settled is how much of the release process to automate now versus later, and what the signing and notarisation story is for a project with no organisation behind it yet.

# Plans

- [x] ci.md -> the automated checks that keep every claim in the repository true
- [x] docs.md -> the README and the documents a stranger needs to trust and contribute
- [!] packaging.md -> awaiting an answer in QUESTIONS.md on signing bundling, signing, notarisation, and the release process

# Cursor

Freshly framed, with `ci.md` already complete because the gap it closed was real and immediate: seventy-six interface tests and a typecheck existed that **no automated run executed at all**.

`docs.md` is complete: the README now covers the application as well as the command-line tool, and every command it gives was verified against a clean clone — which caught a gitignored lockfile that would have made `npm ci` impossible. The security policy, contributing guide and both licence texts are in place.

`packaging.md` is framed and partly blocked. Bundling already works — verified, a `Seal.app` and a 4 MB `.dmg` from a clean tree — but the result is ad-hoc signed and **Gatekeeper refuses it**, so a downloaded release would tell the user the application is damaged. Fixing that needs a signing identity, which is a decision about the project rather than the code, and is waiting in `QUESTIONS.md`.

Two things in that plan are not blocked and can proceed: shipping the command-line tool inside the bundle, which measurement showed is currently missing entirely, and building artefacts on a tag with checksums.

# Open threads

- Windows and Linux artefacts are unaddressed until the macOS path is proven end to end, since whatever is learned there mostly transfers.
