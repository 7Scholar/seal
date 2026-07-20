# Intent

## What & why

Everything around the code that turns a working application into one a stranger can trust, install, and change. The root intent is explicit that this is planned work rather than an afterthought: the documentation someone needs to understand and trust the project, the README with installation and getting started, packaging and signing so the application installs without the platform refusing it, the release process, the licence and contribution guidance, and the maintainability that keeps all of it true a year from now.

It is done when someone who has never seen this repository can install Seal, understand what it does and does not protect them from, use it, and — if they want to — build it, test it, and send a change with the project's standards visible rather than folklore.

## Approach

TBD. The shape is partly forced already: the application is a Tauri desktop bundle plus a command-line binary, the format is standard age so the recovery story does not depend on Seal existing, and the threat model has sharp edges that documentation must state plainly rather than soften. What is not settled is how much of the release process to automate now versus later, and what the signing and notarisation story is for a project with no organisation behind it yet.

# Plans

- [x] ci.md -> the automated checks that keep every claim in the repository true
- [ ] docs.md -> the README and the documents a stranger needs to trust and contribute
- [ ] packaging.md -> bundling, signing, notarisation, and the release process

# Cursor

Freshly framed, with `ci.md` already complete because the gap it closed was real and immediate: seventy-six interface tests and a typecheck existed that **no automated run executed at all**.

Next: `docs.md`, since the README is what a stranger meets first and it currently describes only the command-line tool. Then `packaging.md`, which is the one part of this tree that may need decisions only the project's owner can make.

# Open threads

- Signing and notarisation need an Apple Developer identity, and Windows signing needs a certificate. Both are decisions about the project's identity rather than its code, and both may need to be raised as questions rather than chosen.
