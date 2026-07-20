# Questions

## 1. How should released builds be signed?

**Status:** answered — C. Acted on in `packaging.md`.

**Why this needs you.** Bundling already works — `tauri build` produces a `Seal.app` and a `.dmg`. But the result is **ad-hoc signed**, and I verified that macOS Gatekeeper refuses it: a user who downloads it is told the application is damaged and cannot open it without deliberately overriding the warning. That is a bad first impression for any application and a particularly bad one for a tool asking to be trusted with secrets.

Fixing it needs a signing identity, which costs money and is tied to a legal identity. That is your decision, not a technical one.

**The options, as I understand them:**

**A. Sign and notarise properly for macOS.** Needs an Apple Developer Program membership (99 USD/year) and an Apple ID for notarisation. The result installs with no warning at all. This is what every application a user would trust does.

**B. Ship unsigned, and document the override.** Costs nothing. Users must right-click-open, or run a `xattr` command, the first time. Many open-source tools do this. It teaches users to bypass a security warning in order to run a security tool, which I think is a genuine tension worth naming rather than a mere inconvenience.

**C. Ship the command-line tool only for now, and treat the desktop application as build-from-source.** Costs nothing, and the CLI has no signing problem because it is not a bundled application. It defers the question without leaving a broken download, but it also means the application — the reason this is not just a CLI — is not really released.

**My recommendation: C now, A when you are ready to spend on it.** Option B is the one I would avoid: an unsigned security tool that instructs users to click past a security warning undermines the thing it is selling. C is honest about the state of the project, and nothing about it forecloses A later.

If you pick A, I will need to know whether you have or want an Apple Developer account, and the release workflow will need the certificate and an app-specific password as repository secrets. I will not need the secrets themselves — only to know they exist so I can write the workflow against them.

Windows signing is the same question with a different certificate authority, and can be answered separately or deferred.

**ANSWER**

Let's do C.

**Acted on.** Distribution is now the command-line tool as a `.tar.gz` per platform, with the desktop application build-from-source.

One correction to the question itself, found by measuring before building: option C's stated premise — that "the CLI has no signing problem because it is not a bundled application" — is **false**. An unsigned command-line binary is killed by Gatekeeper behind a dialog reading "Apple could not verify this app is free of malware", offering only Done and Move to Bin. That is a worse failure than the bundle's, which at least allows right-click-to-open.

What makes C work is the packaging shape rather than the artefact type: macOS quarantine propagates through `.zip` extraction but **not** through `tar`. A binary from a quarantined tarball runs normally. The release therefore publishes tarballs only, and continuous integration asserts that a quarantined tarball still extracts to a binary that runs — a check verified to accept a tarball and reject a zip.