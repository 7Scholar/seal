# Intent

## What & why

Everything around the code that turns a working application into one a stranger can trust, install, and change. The root intent is explicit that this is planned work rather than an afterthought: the documentation someone needs to understand and trust the project, the README with installation and getting started, packaging and signing so the application installs without the platform refusing it, the release process, the licence and contribution guidance, and the maintainability that keeps all of it true a year from now.

It is done when someone who has never seen this repository can install Seal, understand what it does and does not protect them from, use it, and — if they want to — build it, test it, and send a change with the project's standards visible rather than folklore.

## Approach

Three concerns, each with its own plan: the checks that keep the repository's claims true (`ci.md`), the documents a stranger needs (`docs.md`), and getting builds into someone's hands (`packaging.md`).

One decision shapes the whole tree: **the project has no code-signing identity**, which was settled deliberately rather than deferred. That is not merely a missing nicety on macOS — an unsigned artefact is killed behind a malware dialog with no override — so it determines what is distributed and how. The command-line tool is the released artefact, shipped as a tarball because quarantine survives zip extraction but not tar. The desktop application is build-from-source, stated plainly rather than shipped as a download that fails on first run.

Everything the documentation claims is verified rather than believed: the README's commands were run against a clean clone, and the release's own packaging assumption is asserted in continuous integration.

# Plans

- [x] ci.md -> the automated checks that keep every claim in the repository true
- [x] docs.md -> the README and the documents a stranger needs to trust and contribute
- [x] packaging.md -> bundling, distribution, and the release process

# Cursor

Freshly framed, with `ci.md` already complete because the gap it closed was real and immediate: seventy-six interface tests and a typecheck existed that **no automated run executed at all**.

`docs.md` is complete: the README now covers the application as well as the command-line tool, and every command it gives was verified against a clean clone — which caught a gitignored lockfile that would have made `bun install` impossible. The security policy, contributing guide and both licence texts are in place.

`packaging.md` is complete, and now covers installation rather than only what gets built. Its earlier state settled the signing question but left the tool as a tarball a user had to find, extract and move by hand — from a workflow that published its artefacts nowhere a stranger could reach.

The correction came from separating two macOS gates that had been conflated: the Apple Silicon execution gate, satisfied by a **free** ad-hoc signature, and Gatekeeper, which fires only on quarantined files and needs the paid identity. Since quarantine is set by the delivery mechanism rather than the artefact, a Homebrew tap and an installer script both give the command-line tool a clean one-command install with no signing identity at all. That was measured, not assumed: an ad-hoc-signed binary, tarred, quarantined to simulate a browser download, and installed through a real formula, arrives unquarantined and runs.

The same route stays closed to the desktop application, which remains build-from-source with its build documented. Signing and notarisation slot into the same workflow whenever the project takes on an identity.

Being a plain binary rather than a bundle grants no exemption: an unsigned command-line tool that arrives quarantined is killed behind the same malware dialog, with no override button where a bundle would at least offer right-click-to-open. Only the delivery mechanism saves it, which is why the release ships tarballs and continuous integration asserts that a quarantined tarball still yields a runnable binary — verified to accept a tarball and reject a zip.

# Open threads

- Windows is unaddressed: no target is built and no install route exists. Linux is covered by both routes.
- **Tooling friction to raise:** `set_boundary` routes its `--include` patterns through the same path resolver that coverage arguments use, so a boundary pattern naming a file that also exists under `context/_scripts/` — `README.md` is the live case — is rejected as ambiguous even though a boundary pattern is unambiguously repo-relative. Absolute paths work around it. The resolver is right for coverage arguments and wrong here; the fix belongs in the script rather than in every caller.
