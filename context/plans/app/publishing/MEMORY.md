# Memory

## 2026-07-20 — Unsigned macOS artefacts ship as `.tar.gz`, never as a bare binary or a `.zip`

The release workflow packages the command-line tool as a gzipped tarball, and continuous integration asserts that a quarantined tarball extracts to a binary that runs. **Why:** macOS quarantine propagates through `.zip` extraction but **not** through `tar`. Measured, all three shapes: a downloaded bare binary and a binary extracted from a quarantined `.zip` both carry `com.apple.quarantine` and are **killed** — the user sees "Apple could not verify this app is free of malware", whose only buttons are Done and Move to Bin, with no override affordance at all. The same binary extracted from a quarantined `.tar.gz` carries only `com.apple.provenance` and runs normally. **Mistake it prevents:** switching the release artefact to a zip because it is friendlier on Windows, or publishing the bare binary because it saves a step — either silently turns a working download into one macOS refuses to run, with a dialog that reads as a malware accusation rather than a signing warning.

## 2026-07-20 — An unsigned command-line binary is not exempt from Gatekeeper

Being a plain executable rather than an application bundle does **not** avoid the signing problem, and the failure is worse rather than milder. Measured: an ad-hoc-signed `seal` binary is rejected by `spctl`, and when quarantined it is killed with exit 137 behind the malware dialog. An unsigned *bundle* at least offers the right-click-to-open override; an unsigned *binary* offers none. **Why:** the assumption that command-line tools sit outside Gatekeeper is widespread and was wrong here. **Mistake it prevents:** planning a release around "ship the CLI, it has no signing problem" — which is exactly the reasoning that was proposed and rejected here — and shipping a download that dies on first run.

## 2026-07-31 — Homebrew strips quarantine for formulae, and this is what makes unsigned distribution work

A formula installs an unsigned binary that runs, because quarantine is set by *how bits arrive* rather than by what they are: browsers set `com.apple.quarantine`, `curl` and `tar` do not, and Homebrew's cask machinery only ever detects, propagates or removes the attribute — it never adds one. Measured end to end: an unsigned `seal`, tarred, quarantined to simulate a download, and installed through a real local tap, arrives carrying only `com.apple.provenance` and runs. Separately, Apple Silicon's execution gate is satisfied by a **free ad-hoc signature** — Homebrew's own `ripgrep` is `Signature=adhoc` with `TeamIdentifier=not set`. **Why:** the two macOS gates are constantly conflated, and only the Gatekeeper one needs a paid identity. **Mistake it prevents:** concluding that unsigned software cannot be distributed on macOS without the 99 USD identity, and either buying it prematurely or shipping a download that dies on first run.

## 2026-07-31 — The desktop application must not be distributed as a Homebrew cask

A cask cannot remove quarantine on the user's behalf: no `quarantine false` stanza exists, and the user-side `--no-quarantine` flag was **removed** in Homebrew 6.0.14. Homebrew ends support for all casks failing Gatekeeper on **1 September 2026**. homebrew-core additionally refuses the application outright — "a formula whose primary output is a native macOS `.app` bundle is not eligible" — and will not accept prebuilt binaries. **Why:** a cask looks like the obvious way to ship a GUI with one command, and for an unsigned application it is a route with a published expiry date. **Mistake it prevents:** building the application's installation story on a cask, which requires notarisation to survive September regardless and cannot work unsigned before then.

## 2026-07-31 — The release publishes the command-line tool only, never the bundles

A tagged release attaches the four command-line tarballs and their checksums; the unsigned application bundles are built on the same tag but stay as workflow artefacts. **Why:** a bundle offered as a release download is a download macOS refuses to open, and the release notes would be advertising a broken install. Contributors can still fetch the bundle from the workflow run. **Mistake it prevents:** "completing" the release by attaching the `.dmg` and `.AppImage` alongside the tarballs, which turns a deliberate omission into a first-run failure for anyone who clicks the obvious download.

## 2026-07-31 — The tap push degrades to a no-op instead of failing

When `SEAL_TAP_TOKEN` is absent the tap step renders the formula, prints it, and exits successfully without pushing. **Why:** the token grants write access to a second repository, which a fork will never have, and a release that fails on a missing secret would make the project unreleasable by anyone but its owner. **Mistake it prevents:** "fixing" the conditional into a hard failure because a silent skip looks like a bug — it is the fork path working as intended.

## 2026-07-31 — Bun runs the scripts; Vite and Vitest still do the work

The interface toolchain uses Bun as package manager and script runner only. `bun run test` invokes **Vitest**, not `bun test`, and `bun run build` invokes **Vite**. **Why:** the suite relies on the jsdom environment, global test APIs, setup file and React transform configured in `vite.config.ts`, and Bun's own test runner reads none of that — switching to it would mean rewriting all 129 tests for no gain. **Mistake it prevents:** "finishing" the migration by replacing `vitest run` with `bun test` because the project already uses Bun, which breaks the entire interface suite at once.

## 2026-07-31 — `bun.lock` is the only lockfile

`package-lock.json` is deliberately absent rather than merely unused. **Why:** two lockfiles drift, and the one CI does not read is the one that silently goes stale, so a contributor running the other package manager installs a different tree from the one the checks proved. Bun migrated the original resolutions when the lockfile was created, so nothing was re-resolved in the switch. **Mistake it prevents:** restoring `package-lock.json` for the convenience of contributors who prefer npm, which reintroduces exactly the divergence having one lockfile removes.
