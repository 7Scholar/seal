Part of [the publishing plan](README.md).

# Scope

A **hosted documentation website** for Seal: the published, browsable home a stranger arrives at, how it is built, where it is hosted, and how it stays true as the product changes. Out of scope: the in-repository documents themselves ([docs.md](docs.md) owns the README, the security policy, the contributing guide and the licences), the plan tree, which documents the design under its own manual and is not published, and the release mechanics ([packaging.md](packaging.md)).

The relationship to [docs.md](docs.md) needs stating, because "documentation" names both. `docs.md` owns **what the repository says** — the files a reader meets on GitHub. This plan owns **a published site**, which is a different artefact with a different audience arriving by a different route. Whether the site republishes that content, links to it, or supersedes it is the first thing the Approach must settle, and it is exactly the question that decides whether these are one concern or two.

# What & why

The product owner wants Seal maintainable as an **open-source project**, and named a documentation website as part of what that requires — hosted somewhere, with GitHub Pages named as a candidate sufficient for the need.

The owner was equally specific about its character: it should have a **modern feel**, matched against the leaders in software documentation generally rather than against other encryption tools. **Anthropic, OpenAI, Docker and Stripe** were named as the standard. The owner also bounded it — *"we don't need much, but I do want to give the same feel"* — so the target is a small site that reads as considered, not a large one.

Why this is not covered by what exists: [docs.md](docs.md) is complete and its four documents are good, but they are files in a repository. A project that wants strangers to trust it, and contributors to stay, is met somewhere — and the README on a git host is a different experience from a documentation site, in navigability, in discoverability, and in the signal it sends about whether the project is maintained. The owner's framing puts this squarely under maintainability, which [the publishing intent](README.md) already names as its own concern rather than an afterthought.

There is also a standing gap this plan inherits. [docs.md](docs.md)'s open thread records that **the README has no screenshots**, which it calls a real gap for an application whose whole argument is that it is easier than a command-line tool. A documentation site is the natural home for that argument, and the same staleness worry applies with more force to a site than to a README.

# Approach

Built from [_docs/site-research.md](_docs/site-research.md), which studies the four named references and the small open-source projects Seal actually resembles, and surveys the generators realistically available. That document is the design input; this Approach states what follows.

Three constraints bound it. **The named references are specification** — Anthropic, OpenAI, Docker and Stripe — under [UX_RESEARCH.md](../../../../docs/UX_RESEARCH.md)'s reference rules. **Small is the intent**, so the page list below is the deliberate extent rather than a starting point. And **nothing published may soften the threat model**: a marketing-shaped site is the likeliest place that discipline slips, and "elegant" is not a licence to soften *a forgotten password is unrecoverable*.

## Astro Starlight, on GitHub Pages

Starlight's default output already carries the references' vocabulary — sidebar, on-page contents, prev/next, dark mode, static Pagefind search, readable typography — so what remains is the small amount of visual identity that makes the site Seal's, expressed as CSS custom properties rather than theme surgery. Its `splash` template gives a real landing page distinct from the docs body, which is the one structural property all four references share. Its build core is Vite and its deploy action uses Bun natively, so no second package manager or lockfile enters the repository, which [the desktop memory](../desktop/MEMORY.md) requires.

The site publishes from a workflow on push to `main`. It is static, small, and costs nothing; a custom domain attaches later without changing anything.

## Nine pages in four groups, plus a landing page

The landing page states what Seal does in one sentence, a four-card grid, the numbered first-run path, and **a named block carrying the two absolute limits** — not a link to them. The research names SOPS as the negative example here: a direct genre peer whose landing page states capabilities and no threat model at all, which is exactly the relegation this product cannot afford.

**Get started** — *Install*, and *Your first sealed file*. **Guides** — *Using Seal from scripts*, and *Managing files in the application*. **Understand** — *How it works*, and *What Seal does not protect*, the longest page on the site. **Reference** — *Command-line reference*, *Security policy*, *Contributing*.

## Where each fact lives once

The boundary against [docs.md](docs.md), which is this plan's first decision and the thing that stops the site becoming a second README:

- **Rendered from the repository, never retyped.** `SECURITY.md` and `CONTRIBUTING.md` become site pages by the build reading those exact files. A missing source fails the build rather than publishing a page that silently drifted.
- **Held by the site, and moved out of the README.** The scripting and management guides are *moved*, not copied: the README's corresponding sections contract to a sentence and a link, exactly as it already does for `docs/RUNNING.md`. This edits `docs.md`'s content, and belongs in the same change as the site that receives it.
- **Two deliberate duplications, held true by machine.** The install commands and the limits text appear on both surfaces, because a README without install commands is broken and a site that only links to the limits has softened them by relegation. Continuous integration extracts the install commands from one source and diffs them across README, site and CI job, and asserts the limits text byte-identical across the landing page, the README, `SECURITY.md` and the threat-model page. A check that fires when they disagree is what makes the exception safe rather than a licence.
- **Linked, never rendered.** The plan tree, `docs/RUNNING.md`, `docs/RELEASING.md`, the licences, and the releases.

## How it stays true

Four checks in continuous integration, of the kind [ci.md](ci.md) already runs: the install commands diffed across all three surfaces, the limits text asserted identical across all four, links checked over the built site and the repository's Markdown, and the site built on every change with deployment only from `main`. `ci.md`'s standing rule carries over — any check that can be skipped has an environment variable turning the skip into a failure.

# What exists

All of the Approach. The site lives under `site/`, builds to eleven pages with a static search index, and deploys from a workflow on push to `main`.

Its visual identity resolves the **same palette the application uses**, mapped onto Starlight's own tokens, so the two surfaces read as one product rather than as a tool and a separate marketing site.

Two guarantees are enforced by machine rather than by discipline, and each was confirmed non-vacuous by breaking it and watching the check fail:

- **The rendered pages cannot drift.** The security policy and the contributing guide are read from `SECURITY.md` and `CONTRIBUTING.md` at build time. Removing a source file **fails the build** with a message naming the rule, rather than publishing a page that silently vanished or went stale.
- **The limits cannot be softened.** A check asserts both absolute limits are present on the landing page, in the README, in the security policy and on the threat-model page, and that no page claims a protection Seal does not have. Replacing the landing page's forgotten-password statement with a reassuring sentence fails it by name.

The two guides were **moved** out of the README rather than copied, so the README contracted to a sentence and a link for each — which is what stops the site being a second README.

**The link check** covers the two surfaces separately, because a broken link fails differently on each. Over the **built site** it resolves every internal `href` and `src` against the emitted files, which is the only place a route can be checked as it will actually be served, base path included. Over the **repository's Markdown** it resolves relative links against the working tree, which is what a reader following a link on the git host does. Site *sources* are excluded from the second pass deliberately: their links are site routes, already proved by the first pass, and resolving them as file paths reports every one of them broken. Links inside code spans and fences are skipped, since a link written to illustrate the format is not one anybody follows — both live instances are in this tree's own manual, teaching the trigger-plus-link shape.

Wiring it caught the site's own first casualty: **every page requested a `favicon.svg` that did not exist**, Starlight emitting the tag by default and the repository never supplying the file, so all eleven pages carried a 404 for their icon. The mark now drawn there is the seal itself — the product's namesake, a single-stroke silhouette on the application's tile, in the palette's accent — and the same file renders the desktop icons via `bun run brand:icons`, so the tab, the dock and the window are one asset rather than three drifting ones. It is a real defect the build was structurally unable to notice: a missing asset in `public/` is not a build error, and the claim check reads prose rather than routes.

The check fails rather than skips when `site/dist` is absent, exiting non-zero with the command that fixes it. That is `ci.md`'s standing rule holding here: a link check that quietly passes on an unbuilt site would report success having verified nothing, which is the one failure mode that makes a check worse than no check.

# What is missing

- **Screenshots.** The site launches with none, and the sequencing that justified deferring them is now spent: [palette.md](../desktop/ui/navigation/palette.md) and [manage-surface.md](../desktop/ui/navigation/manage-surface.md) have both landed, so images taken now would no longer be stale on arrival. This is the next thing the site wants, and [docs.md](docs.md)'s standing open thread is the same gap.
- **The site has never been seen deployed.** The repository now has an origin, and the workflow ran on the first push: the build job passed and the **deploy job failed**, because GitHub Pages refuses a **private** repository on the organisation's plan — *"Your current plan does not support GitHub Pages for this repository"*. The owner has settled the direction: the repository **goes public**, which makes Pages free on every plan and matches the root intent's aim of an open-source project. What remains is the owner's own visibility change, then enabling Pages with **Source: GitHub Actions**, and a first deployment observed rather than assumed.

# Steps

- [x] Research the named references and how comparable small open-source projects publish, per [docs/UX_RESEARCH.md](../../../../docs/UX_RESEARCH.md).
- [x] Settle the content boundary against [docs.md](docs.md) — what the site holds, what it links to, and where each fact lives once.
- [x] Build the site: the landing page, the nine pages, and the visual identity drawn from the application's palette.
- [x] The checks that hold the boundary: the build failing on a missing rendered source, and the claim check across all four surfaces.
- [x] The link check over the built site and the repository's Markdown.
- [ ] Screenshots, now that the interface work they waited on has landed.
- [~] Publish the site: the repository goes public, Pages is enabled with **Source: GitHub Actions**, and the first deployment is observed rather than assumed.

# Open threads

- Whether this concern stays a plan `.md` or becomes a folder. It is one working surface today; if the site grows its own information architecture beyond the nine pages, it wants promoting, which is a reshape and goes through the user.
- The site introduces a second `bun.lock`, under `site/`. [The publishing memory](MEMORY.md) forbids a *second package manager*, on the grounds that the lockfile continuous integration does not read is the one that goes stale — and this one is read by its own workflow on every change, so the rule's reason is satisfied. Worth revisiting if the two ever need to share dependencies.
