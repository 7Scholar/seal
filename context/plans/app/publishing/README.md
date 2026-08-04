# Intent

## What & why

Everything around the code that turns a working application into one a stranger can trust, install, and change. The root intent is explicit that this is planned work rather than an afterthought: the documentation someone needs to understand and trust the project, the README with installation and getting started, packaging and signing so the application installs without the platform refusing it, the release process, the licence and contribution guidance, and the maintainability that keeps all of it true a year from now.

It is done when someone who has never seen this repository can install Seal, understand what it does and does not protect them from, use it, and — if they want to — build it, test it, and send a change with the project's standards visible rather than folklore.

## Approach

Five concerns, each with its own plan: the checks that keep the repository's claims true (`ci.md`), the documents a stranger needs (`docs.md`), getting builds into someone's hands (`packaging.md`), the build scripts a developer working on Seal runs (`tooling.md`), and a hosted documentation site (`site.md`).

`docs.md` and `site.md` divide one word between them. `docs.md` owns **what the repository says** — the files a reader meets on the git host. `site.md` owns **a published site**, a different artefact reached by a different route. Where each fact lives once, given both exist, is the boundary `site.md` must settle before it builds anything.

One decision shapes the whole tree: **the project has no code-signing identity**, which was settled deliberately rather than deferred. That is not merely a missing nicety on macOS — an unsigned artefact is killed behind a malware dialog with no override — so it determines what is distributed and how. The command-line tool is the released artefact, shipped as a tarball because quarantine survives zip extraction but not tar. The desktop application is build-from-source, stated plainly rather than shipped as a download that fails on first run.

Everything the documentation claims is verified rather than believed: the README's commands were run against a clean clone, and the release's own packaging assumption is asserted in continuous integration.

# Plans

- [x] ci.md -> the automated checks that keep every claim in the repository true
- [x] docs.md -> the README and the documents a stranger needs to trust and contribute
- [x] packaging.md -> bundling, distribution, and the release process
- [x] tooling.md -> the developer-facing build scripts that encode the procedures a rebuild must follow
- [~] site.md -> a hosted documentation website, matched against the leaders the owner named. **Built and checked, link check included; screenshots remain, and publishing awaits the repository going public.**

# Cursor

Freshly framed, with `ci.md` already complete because the gap it closed was real and immediate: seventy-six interface tests and a typecheck existed that **no automated run executed at all**.

`docs.md` is complete: the README now covers the application as well as the command-line tool, and every command it gives was verified against a clean clone — which caught a gitignored lockfile that would have made `bun install` impossible. The security policy, contributing guide and both licence texts are in place.

`packaging.md` is complete, and now covers installation rather than only what gets built. Its earlier state settled the signing question but left the tool as a tarball a user had to find, extract and move by hand — from a workflow that published its artefacts nowhere a stranger could reach.

The correction came from separating two macOS gates that had been conflated: the Apple Silicon execution gate, satisfied by a **free** ad-hoc signature, and Gatekeeper, which fires only on quarantined files and needs the paid identity. Since quarantine is set by the delivery mechanism rather than the artefact, a Homebrew tap and an installer script both give the command-line tool a clean one-command install with no signing identity at all. That was measured, not assumed: an ad-hoc-signed binary, tarred, quarantined to simulate a browser download, and installed through a real formula, arrives unquarantined and runs.

The same route stays closed to the desktop application, which remains build-from-source with its build documented. Signing and notarisation slot into the same workflow whenever the project takes on an identity.

Being a plain binary rather than a bundle grants no exemption: an unsigned command-line tool that arrives quarantined is killed behind the same malware dialog, with no override button where a bundle would at least offer right-click-to-open. Only the delivery mechanism saves it, which is why the release ships tarballs and continuous integration asserts that a quarantined tarball still yields a runnable binary — verified to accept a tarball and reject a zip.

`tooling.md` is complete, and it closed a gap rather than adding a nicety: two of this repository's build rules fail silently, both presenting as "my change did nothing" — a frontend rebuilt after the binary that embeds it, and a `seal` launcher resolving to somewhere the rebuild never touched. The script encodes the first and warns about the second.

`site.md` is **built**: Astro Starlight on GitHub Pages, eleven pages in four groups plus a landing page, matched for feel against Anthropic, OpenAI, Docker and Stripe, and deliberately small. Its identity resolves the same palette the application now uses, so the two surfaces read as one product.

Its content boundary against `docs.md` is the decision it existed to settle, and it is **enforced rather than agreed**. The security policy and the contributing guide are rendered from `SECURITY.md` and `CONTRIBUTING.md` at build time, so no second copy exists to go stale; removing a source fails the build. The two task guides were **moved** out of the README rather than copied, so the README contracted to a sentence and a link for each — which is what stops the site being a second README. The install commands and the two absolute limits are deliberate duplications, held identical across four surfaces by a check that refuses any page claiming a protection Seal does not have.

Both guarantees were confirmed non-vacuous by breaking them.

**The link check is now the third**, covering the built site's routes and the repository's Markdown as two passes because a broken link fails differently on each. It was proved non-vacuous on both, and it immediately found what neither of the other two could see: every page requested a `favicon.svg` the repository never supplied, so all eleven carried a 404 for their icon — invisible to a build that treats a missing asset as no error, and to a claim check that reads prose rather than routes.

**The repository now has an origin, and publishing turned out not to be a setting.** The workflow ran on the first push, built the site, passed its checks, and failed at deploy: Pages refuses the repository because it is **private** on a plan without Pages for private repositories. The owner settled it by taking the repository **public**, which makes Pages free on every plan and is where the root intent was always headed. Two session-scaffolding documents left the repository in the same move — a to-do sheet addressed to the owner and a handoff note whose git instructions ("no origin", "never push") the origin had made false — since neither is project documentation and both would have met a stranger beside the README. Screenshots remain, and are unaffected.

# Open threads

- Windows is unaddressed: no target is built and no install route exists. Linux is covered by both routes.
- **Tooling friction to raise:** `set_boundary` routes its `--include` patterns through the same path resolver that coverage arguments use, so a boundary pattern naming a file that also exists under `context/_scripts/` — `README.md` is the live case — is rejected as ambiguous even though a boundary pattern is unambiguously repo-relative. Absolute paths work around it. The resolver is right for coverage arguments and wrong here; the fix belongs in the script rather than in every caller.
