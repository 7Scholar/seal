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

## The page shell, and the Markdown route under it

The shell is Bun's, studied from the live site and recorded in [_docs/bun-docs-anatomy.md](_docs/bun-docs-anatomy.md): a fixed header carrying the mark on the left, the search control in the middle and the theme control on the right; a fixed left sidebar of two-level groups whose active state is held on the list item; a title row whose page-actions control floats to its right; and the on-page contents to the right of the prose. Bun's own navigation top bar is excluded — with eleven pages there is nothing to partition, which is the same reason [_docs/site-research.md](_docs/site-research.md) excluded Anthropic's tabs.

It is reached by **overriding Starlight's components** rather than by replacing the generator, so Pagefind search, the on-page contents and the rendered-source mechanism all keep working underneath — and the four checks that hold this plan's guarantees keep passing rather than being rebuilt. Six components are replaced: `Header`, `PageTitle` and `Sidebar` carry the shape; `Pagination` replaces the default's shadowed cards with the quiet direction-cued rows the reference sites use; and `ThemeSelect` with `ThemeProvider` carry the theme control.

**The theme control is a single button that cycles system → light → dark**, showing the icon of the theme in force rather than the one it would move to. Starlight's default wraps a native `<select>`, which opens the operating system's menu and reads as foreign against everything else on the page. The accessible name is stable and a visually-hidden live region announces each change, which is what the accessibility guidance asks for where a three-state control cannot use `aria-pressed`. It keeps Starlight's `starlight-theme` storage key, so a preference set before this change survives it, and the no-flash inline script sets the selection alongside the resolved theme so the button's icon is correct before paint rather than after hydration.

**Radii, focus rings and the palette are named tokens.** A one-off literal anywhere in the site's styles is a defect: the scale is a pill, a control and a container radius, and Pagefind's own radius variable resolves to the same container value so the search modal is not a second design system.

**Every page is also served as Markdown, and that route is what the page actions are built on.** `/<slug>.md` emits the page as `text/markdown`, and `/llms.txt` indexes all of them. The three actions are each one line over that one artefact: *Copy page* fetches it, *View as Markdown* opens it, and *Open in Claude* passes its URL to `claude.ai/new?q=`. Building the route first is what keeps the menu from being three separate mechanisms. The pages rendered from `SECURITY.md` and `CONTRIBUTING.md` resolve their source the same way the HTML does, so the Markdown surface cannot drift from the page beside it.

The menu is **three items, not Bun's five.** Bun's remaining two install an MCP server, and Seal publishes none; a menu item pointing at a server that does not exist is a claim, which this plan's fourth rule forbids.

**Each menu item's icon is framed, and is the real mark rather than a stand-in.** The reference draws the glyph inside its own bordered, rounded box, which is what stops it reading as a loose mark beside two lines of text; the same treatment the landing tiles already give their icons. The glyphs are the **Markdown badge** and the **Anthropic mark**, not a generic document page and a speech bubble — an approximation of an icon is a different control wearing its place ([UX_RESEARCH.md](../../../../docs/UX_RESEARCH.md), **match the affordance**). Both items open a new tab, so both labels carry an external-link arrow rather than leaving the reader to find out by clicking.

**The actions degrade rather than break.** Without JavaScript the split button is not rendered at all: what ships in the HTML is a plain *View as Markdown* anchor, and the copy and Claude controls replace it only once the element upgrades. A reader with JavaScript blocked meets a working link rather than a dead button — which is the degraded state [_docs/site-research.md](_docs/site-research.md) names as a hard requirement rather than a nicety, and the reason the anchor is the markup's default rather than its fallback.

## Nine pages in four groups, plus a landing page

The landing page states what Seal does in one sentence, a four-tile grid, the numbered first-run path, and **a named block carrying the two absolute limits** — not a link to them. The research names SOPS as the negative example here: a direct genre peer whose landing page states capabilities and no threat model at all, which is exactly the relegation this product cannot afford.

**Each tile is itself the link.** Starlight's `Card` is an article holding a link, so only the few words of the link were clickable while the rest of the tile looked pressable and was not — the gap between what a surface offers and what it accepts. A tile is an anchor wrapping the whole surface, ending in a *Get started with …* line that names where it goes, and its hover state is the reference's two changes together: the **border and that line both take the accent**, background unchanged. The call to action lives inside the anchor rather than beside it precisely so one hover drives both.

**Get started** — *Install*, and *Your first sealed file*. **Guides** — *Using Seal from scripts*, and *Managing files in the application*. **Understand** — *How it works*, and *What Seal does not protect*, the longest page on the site. **Reference** — *Command-line reference*, *Security policy*, *Contributing*.

**A tenth page answers a stale address.** The 404 is written rather than inherited: Starlight's default is a splash-template page with no sidebar, and the research requires a real page in the site's own layout carrying the sidebar and search, because a stranger arriving at a dead link is a stranger the site can still convert. It names the pages most linked from elsewhere and asks a reader who arrived from an internal link to report it.

**The command-line reference is verified against the binary rather than written from memory.** It documents every subcommand `clap` defines, every exit code the `exit` module names, and the environment variable the binary actually reads — a reference page claiming completeness is a claim, and this repository's fourth rule does not exempt it.

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

The shell is the one the Approach describes, built from three component overrides and a Markdown route. Each behaviour was confirmed by driving the built site rather than by reading the markup: the split button opens its menu and sets `aria-expanded`; *Copy page* fetches the page's Markdown and writes 4,987 characters of it to the clipboard, flipping the label and the icon; *Open in Claude* produces the `claude.ai/new?q=` URL with the `.md` address encoded into it; and the `.md` route answers `200` with `text/markdown`.

A later pass took every component to the same bar, and each change was measured in the running site rather than read off the markup. The header's contents sat **6.25px below its centre** — Starlight pads `header.header` on the block axis and the inner grid was sized to the padded box, so brand, search, socials and theme control all centred at 34.25 against a header centre of 28; with the padding dropped and the grid taking the nav height, all five agree at 28. The theme control was driven through all three states: the icon, the stored key and the resolved theme follow auto → light → dark → auto, and `starlight-theme` is cleared rather than set on auto. The page-actions menu answers the arrow keys, Home, End and Tab, and Escape returns focus to the trigger rather than dropping the reader at the top of the document. *Copy page* wrote 3,172 characters of the page's Markdown with the clipboard stubbed. With scripting disabled the *View as Markdown* anchor is visible and addressed, copy and the menu stay hidden, and all nine sidebar links, four code blocks and 505 words remain.

**The landing page was not centred, and two separate causes had to be found.** It read as one symptom — the whole page pushed against the left edge — but the prose measure and the hero were each doing half of it. `.sl-markdown-content` was clamped to `68ch` unconditionally, which is right for a documentation page and wrong for a landing page laid out in a container half again as wide: the clamp is a maximum, not a centring, so the content sat at the container's left edge with the remainder empty. And Starlight's hero reserves a `7fr 4fr` grid for a hero image **this page does not have**, confining the title, tagline and actions to the left 63% of the same container. The measure is now scoped to `:root:not([data-has-hero])`, the hero's image column is dropped, and the landing column is centred at a width the cards actually want. Measured rather than eyeballed: at a 1440px viewport the container sits 240px from both edges.

Two of those runs are worth keeping, because both look like defects and are not. **A headless browser refuses `clipboard.writeText` whatever permissions are granted it**, so the copy path can only be exercised there with the clipboard call stubbed — the refusal drove the button into its failure branch, which named the failure and opened the file instead of silently doing nothing, which is the copy-failed state the research asks for. And **an Astro `<script>` carrying TypeScript syntax is dropped from the build without an error**, so the menu shipped inert until the block was written as plain JavaScript.

The link check earned its place again during this work: the header's mark was written with a base path that collapsed to `/sealfavicon.svg`, and every page carried it. The build treats a missing asset as no error, so nothing else on the site could have caught it.

Two guarantees are enforced by machine rather than by discipline, and each was confirmed non-vacuous by breaking it and watching the check fail:

- **The rendered pages cannot drift.** The security policy and the contributing guide are read from `SECURITY.md` and `CONTRIBUTING.md` at build time. Removing a source file **fails the build** with a message naming the rule, rather than publishing a page that silently vanished or went stale.
- **The limits cannot be softened.** A check asserts both absolute limits are present on the landing page, in the README, in the security policy and on the threat-model page, and that no page claims a protection Seal does not have. Replacing the landing page's forgotten-password statement with a reassuring sentence fails it by name.

The two guides were **moved** out of the README rather than copied, so the README contracted to a sentence and a link for each — which is what stops the site being a second README.

**The link check** covers the two surfaces separately, because a broken link fails differently on each. Over the **built site** it resolves every internal `href` and `src` against the emitted files, which is the only place a route can be checked as it will actually be served, base path included. Over the **repository's Markdown** it resolves relative links against the working tree, which is what a reader following a link on the git host does. Site *sources* are excluded from the second pass deliberately: their links are site routes, already proved by the first pass, and resolving them as file paths reports every one of them broken. Links inside code spans and fences are skipped, since a link written to illustrate the format is not one anybody follows — both live instances are in this tree's own manual, teaching the trigger-plus-link shape.

Wiring it caught the site's own first casualty: **every page requested a `favicon.svg` that did not exist**, Starlight emitting the tag by default and the repository never supplying the file, so all eleven pages carried a 404 for their icon. The mark now drawn there is the seal itself — the product's namesake, a single-stroke silhouette in the palette's accent. It is a real defect the build was structurally unable to notice: a missing asset in `public/` is not a build error, and the claim check reads prose rather than routes.

**The mark is drawn twice, because a tab and a dock want opposite things.** `src-tauri/icons/icon.svg` carries the opaque rounded tile and is what `bun run brand:icons` renders the desktop icons from; a dock icon is composited against whatever is behind it, so a bare silhouette reads there as broken. The site's `favicon.svg` draws the same seal with **no tile at all**, because a browser tab supplies its own background and the tile becomes a dark square sitting in it — which is what the shipped icon looked like. The two files are deliberately separate rather than one asset serving both, and the icons' `README` says so, since the tempting cleanup is to re-point one at the other.

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
- [x] The page shell matched to Bun's, and the Markdown route the page actions are built on.
- [ ] Screenshots, now that the interface work they waited on has landed.
- [~] Publish the site: the repository goes public, Pages is enabled with **Source: GitHub Actions**, and the first deployment is observed rather than assumed.

# Open threads

- Whether this concern stays a plan `.md` or becomes a folder. It is one working surface today; if the site grows its own information architecture beyond the nine pages, it wants promoting, which is a reshape and goes through the user.
- The site introduces a second `bun.lock`, under `site/`. [The publishing memory](MEMORY.md) forbids a *second package manager*, on the grounds that the lockfile continuous integration does not read is the one that goes stale — and this one is read by its own workflow on every change, so the rule's reason is satisfied. Worth revisiting if the two ever need to share dependencies.
