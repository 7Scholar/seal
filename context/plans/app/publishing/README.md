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
- [!] packaging.md -> bundling, distribution, and the release process. Blocked — awaiting answer in `QUESTIONS.md` on how Seal is installed.

# Cursor

Freshly framed, with `ci.md` already complete because the gap it closed was real and immediate: seventy-six interface tests and a typecheck existed that **no automated run executed at all**.

`docs.md` is complete: the README now covers the application as well as the command-line tool, and every command it gives was verified against a clean clone — which caught a gitignored lockfile that would have made `npm ci` impossible. The security policy, contributing guide and both licence texts are in place.

`packaging.md` is **reopened and blocked** on how Seal is installed. It was complete for the decision that was made — no signing identity, the command-line tool as the released artefact — but that decision settled what is *built*, not how anyone *installs* it: the tool still arrives as a tarball to extract and move by hand, and the release workflow never publishes the artefacts anywhere a stranger can reach them.

Research since then measured what the platform actually allows and changed the shape of the answer. Two macOS gates were being conflated: the Apple Silicon execution gate, satisfied by a **free** ad-hoc signature, and Gatekeeper, which fires only on quarantined files and needs the paid identity. Because quarantine comes from the delivery mechanism rather than the artefact, a tap and an installer script both give the command-line tool a clean one-command install with no identity at all — verified by installing an unsigned, quarantined build through a real formula and watching it arrive unquarantined and run. The same route is closed to the desktop application, which is the fork now sitting in `QUESTIONS.md`.

That decision was nearly implemented on a false premise. The question proposed shipping the CLI "because it has no signing problem, not being a bundled application" — measurement showed that is **wrong**, and the failure is worse than for a bundle: an unsigned binary is killed behind a malware dialog with no override button, where an unsigned bundle at least offers right-click-to-open. What actually works is the packaging shape: quarantine survives `.zip` extraction but not `tar`, so the release ships tarballs and continuous integration asserts a quarantined tarball still yields a runnable binary — verified to accept a tarball and reject a zip.

# Open threads

- A Homebrew formula in a project-owned tap is the primary route for the command-line tool, now measured rather than assumed: a formula install strips quarantine, so an unsigned binary arrives clean and runs. Not built yet, and it needs a published GitHub release to download from.
- Windows and Linux artefacts are unaddressed until the macOS path is proven end to end, since whatever is learned there mostly transfers.
- **Tooling friction to raise:** `set_boundary` routes its `--include` patterns through the same path resolver that coverage arguments use, so a boundary pattern naming a file that also exists under `context/_scripts/` — `README.md` is the live case — is rejected as ambiguous even though a boundary pattern is unambiguously repo-relative. Absolute paths work around it. The resolver is right for coverage arguments and wrong here; the fix belongs in the script rather than in every caller.
