Part of [the publishing plan](README.md).

# Scope

The automated checks that keep the repository's claims true: formatting, lints, tests, the interoperability proof, the interface, and the dependency audit. Out of scope: building release artefacts, which belongs to `packaging.md`.

# Approach

Continuous integration exists to catch the claims that quietly stop being true. Five jobs, each guarding something specific.

**The Rust job** runs on macOS and Linux, because the application targets both and the filesystem behaviour the engine depends on differs between them. It installs the desktop system libraries on Linux, since the Tauri crate does not build without them. It sets the variable that turns a skipped terminal-driven test into a failure, because that test proves the password prompt reaches a real terminal and a silent skip would verify nothing.

**The interface job** installs exactly what the lockfile pins, then typechecks, tests and builds. It ends with an assertion that is easy to overlook and load-bearing: **the build must emit no inline script, no inline style, and no data URI**, because the application ships a strict content-security policy that blocks all three. A bundler configuration change could reintroduce any of them and the application would fail at runtime rather than at build time. Verified in both directions — the check catches an injected inline script and passes a clean build.

**The interoperability job** installs a version-pinned reference `age` binary and sets the variable that makes a skip fail. This is the only evidence that Seal's format is genuinely standard rather than self-consistent, so it must never be able to report success without having run.

**The installation job** proves the published install route, and is specified in `packaging.md` because that plan owns what it guards.

**The audit job** checks dependencies against the advisory database.

**The interface toolchain is Bun**, used as the package manager and script runner rather than as a test runner or bundler: Vite still builds and Vitest still tests, because the suite depends on the jsdom environment, global test APIs and the React transform that Vite's config supplies, and none of that carries across to a different runner. So Bun replaces `npm` at the command level and nothing beneath it, which is what keeps the change reversible. The lockfile is `bun.lock` — text rather than binary, so a dependency change is reviewable in a diff, which matters for a project asking to be trusted with secrets. It is the only lockfile: keeping a second one invites the two to disagree about what is installed.

Two rules cut across all of them. Skips are permitted so a fresh clone is green without installing anything, but every skip that guards a real claim has an environment variable that converts it into a failure, and continuous integration sets it. And the toolchain is pinned rather than floating, so an upstream change surfaces as a deliberate update rather than a mysterious failure.

# What exists

All of it. The interface job was added last and closed a genuine hole: seventy-six interface tests and a typecheck existed that no automated run executed.

# What is missing

Nothing on this plan. Building and signing release artefacts is `packaging.md`.

# Steps

- [x] Rust formatting, lints and tests across both platforms, with the desktop system libraries on Linux.
- [x] The terminal-driven test required rather than skippable in continuous integration.
- [x] The interoperability proof against a pinned reference binary, required rather than skippable.
- [x] The interface: lockfile-exact install, types, tests, build, and the content-security-policy assertion.
- [x] Dependency audit.

# Open threads

- The interface job does not yet run on macOS. The frontend build is platform-independent, so this buys little until the packaging job needs a macOS runner anyway.
