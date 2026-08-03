# UX research: a hosted documentation website

Produced by following [the research procedure](../../../../../docs/UX_RESEARCH.md). This document is the design input for [the site plan](../site.md). It settles the content boundary against [docs.md](../docs.md), recommends one generator, and states the exact page list for a site that is small on purpose.

# Concern

**The surface.** A hosted documentation website for Seal: the place a stranger who has never seen the repository lands, decides within a screen whether the project is real and whether it is for them, installs it, and understands what it does not protect them from. It is reached by a link — from a search result, a Hacker News comment, a colleague — rather than by browsing a git host, which is the route [docs.md](../docs.md)'s four documents already serve.

**The context.** Seal is a Tauri desktop application plus a command-line tool that encrypts secret files in place inside local git repositories, unlockable only by a password that exists nowhere on the machine. It has no code-signing identity, so the command-line tool installs by Homebrew or an installer script and the desktop application is built from source. The repository already holds a README, a security policy, a contributing guide, two licence texts, and two operating procedures under `docs/`, all current and all verified. The frontend toolchain is Bun as package manager and script runner, Vite as bundler, Vitest as test runner, and continuous integration runs on both macOS and Linux.

**The constraints this site cannot design around.**

- **The named references are specification.** Anthropic, OpenAI, Docker and Stripe were supplied by the product owner as the standard for feel. Per **Building against a reference**, each of their elements is accounted for as built, adapted with a reason, or excluded with a reason — never silently dropped.
- **Small is the instruction.** *"We don't need much, but I do want to give the same feel."* The failure this bounds is a generator's default site that is ten sections wide with eight of them empty, which reads worse than one good page. Feel is the thing to match at full fidelity; scope is the thing to cut.
- **Nothing published may contradict or soften the threat model.** [The root intent](../../README.md) states two absolute limits: a forgotten password is unrecoverable with no escrow, recovery key or backdoor, and sealing cannot reach backwards over an already-exposed secret. Both are stated as limits rather than caveats in the README and [SECURITY.md](../../../../../SECURITY.md). A site is the likeliest surface for that discipline to slip, because a landing page's grammar is superlatives and a threat model's grammar is refusals.
- **A fact lives in exactly one document.** The repository's standing rule: a decision, rule or procedure is never duplicated across documents; the document that owns it is linked. A site that copies the README is a second README to keep true, and the second copy is the one that rots.
- **Claims are verified rather than believed.** Every README command was run against a clean clone, continuous integration asserts the packaging claim, and the interoperability proof cannot report success without having run. A published site inherits that bar rather than being exempt from it.
- **The application's appearance is about to change.** [palette.md](../../desktop/ui/navigation/palette.md) restyles every surface and [manage-surface.md](../../desktop/ui/navigation/manage-surface.md) rebuilds a screen. Any screenshot taken now is stale on arrival.

**The family it must mirror.** This surface's siblings are not other screens in the application — they are the repository's own documents, whose voice is the established language here: plain declarative sentences, limits stated at length without softening, no marketing superlatives, no exclamation, and an installation section placed first because it is what a stranger came for. The site's typography and layout will be new; its **voice must be the README's**, because a site whose tone diverges from the repository reads as a marketing wrapper around a project that is more honest than its wrapper.

# Sources surveyed

**Stripe's documentation** is the reference implementation and the most-copied developer-docs layout in existence. Its distinctive contribution is the **three-column page** — product navigation left, prose centre, runnable code samples right — where the code pane tracks the prose as you scroll, so the reader is never looking at a concept without its implementation or at code without its explanation. Language selection is a **global, remembered preference** rather than a per-block tab: pick Python once and every page on the site is Python. The information architecture is ordered by the questions a developer asks in the order they ask them rather than by Stripe's internal product hierarchy, and the landing page is a set of task-shaped entry points ("Accept payments online") over a product-category browse, not a feature tour. Authored in Markdoc, a Markdown superset, so the components are content-level rather than page-level.

**Anthropic's documentation** contributes the **card-grid landing page** and a disciplined use of a small component vocabulary. The home page is not prose: it is a numbered `Steps` sequence naming the recommended path for a new developer — first API call, core API, choose a model, explore features — over `CardGroup` grids of two and three cards each carrying an icon, a title and one line. Top-level navigation is tabs; the sidebar under each tab is two levels and no more. It carries an **AI-readable surface as a first-class output**: `llms.txt`, an equivalent full-text index, and a per-page "copy as Markdown" affordance, on the premise that a meaningful share of documentation traffic is now agents rather than people. Callout components (`Tip`, `Note`) carry the asides that would otherwise interrupt the prose.

**OpenAI's platform documentation** contributes the **quickstart as the front door**: the landing surface is an overview whose job is to get a first successful call made, with conceptual material deliberately downstream of it. Its recent navigation rework moved toward fewer top-level entries with more inside each, which is the same instinct as Anthropic's tabs. Its page density is tighter than Stripe's, with compact headings inside panels rather than generous whitespace — a legitimate second answer to the same problem, and the one that suits a reference-heavy site.

**Docker's documentation** contributes the **four-way split by document type**, which is the clearest information architecture of the four: Getting Started (fundamentals), Guides (task-focused), Manuals (product and configuration), Reference (technical specification). This is the Diátaxis distinction made navigable — a reader who knows whether they want to learn, to do, to configure or to look something up lands correctly on the first click. Its landing page adds two things the others do not: **Featured topics**, six curated links that are editorial rather than structural, and **Common questions**, eight FAQ-shaped links. Both exist because a landing page's real job is to short-circuit navigation for the majority who want one of a small number of things.

**Ghostty's documentation site** is the closest analogue to Seal in size and posture: a fast native desktop application with an opinionated author. Its docs are **short by design** — roughly eight flat top-level sections (About, Install, Configuration, Linux, Features, Terminal API, Help), sidebar depth of one to two, no deep tree — and the site states that shortness as a property rather than apologising for it. Its docs home is a small featured-documentation grid of four cards, and its marketing landing page at the root is a separate surface from `/docs`. It demonstrates that the card-grid vocabulary scales *down* to a tiny site without reading as a stub.

**Zed's documentation** contributes the opposite lesson to Ghostty's on chrome and the same one on scope: a flat, dense, mdBook-shaped site with modest visual identity, sitting under a highly designed marketing domain. It also publishes `llms.txt`. The gap between how considered `zed.dev` looks and how plain `zed.dev/docs` looks is the specific failure Seal should avoid, and it argues for the docs and the landing page sharing one visual system rather than being two projects.

**SOPS's site** is the direct genre peer — a secrets tool, CNCF-hosted, Hugo-built — and it is the **negative example on honesty**. Its landing page is six feature blocks naming capabilities (AES256-GCM, many key stores, many formats, post-quantum) and it states no threat model at all: what SOPS does not protect against is absent from the surface a stranger meets, deferred entirely to documentation they must click into. It also defers install instructions behind a button. Both are precisely the drift Seal's constraint forbids, and seeing a respected tool commit it is the argument for making the limits a named landing-page section rather than a page a reader may never reach.

**age's site** contributes the most extreme scoping answer available: `age-encryption.org` redirects to the GitHub repository, with the format specification hosted separately. The tool Seal's format is built on ships **no documentation site at all** and is not less trusted for it. This is the honest floor of the design space and the reason the site must justify itself by what it adds — navigability, discoverability, a first-run visual argument — rather than by existing.

**Diátaxis and documentation-typography guidance** supply the invariants the individual sites embody without stating. Content divides by what the reader is doing — learning, achieving a goal, understanding, or looking something up — and mixing those in one page is the most common structural fault. Body measure sits between 50 and 75 characters, with 66 the commonly cited target, which a `max-width` in `ch` units enforces; the failure mode on a modern wide display is a full-width paragraph, not a narrow one. Navigation depth beyond three levels stops being an aid, which is what every source above independently converges on.

**Verification tooling for published documentation.** Link checking over built HTML and Markdown is a solved, fast CI job (lychee, Rust, caching, a full site in about a minute). Screenshot freshness is solved by generating images from a driven application in CI rather than by taking them by hand — the discipline is deterministic capture (same seeded state, same viewport, same route) with a diff step that either fails the run for review or commits the new image.

# Findings

## Tier 1 — table stakes

- **A landing page distinct from the documentation body.** All four named references have one, Ghostty has one, and Zed's absence of one is visible as a seam. Without it the site's first screen is a table of contents, which answers "where is everything" before it has answered "what is this and is it real".
- **Search, on the site, with a keyboard shortcut.** Universal across all four references. Its absence on a docs site reads as unfinished; for Seal it also carries a specific load, because the questions people will arrive with — "what happens if I forget the password", "is it signed" — are phrased in words, not section names.
- **Dark mode, following the system preference with a manual override.** Universal, and doubly expected for a developer tool. The application itself already ships light, dark and system themes, so a light-only site would contradict the product.
- **A left sidebar over a centred prose column, with the current page marked.** The invariant page shape across every source. Depth of two levels; three at the absolute maximum.
- **Copy buttons on every code block, copying raw text with no prompt characters, no line numbers and no gutter.** Every source has this. For Seal it is load-bearing rather than cosmetic: the install instruction is a command someone pipes to a shell, and a copy that silently includes a `$` produces a confusing failure at exactly the worst moment.
- **Syntax highlighting as enhancement, never a gate.** Every command must be readable and copyable with the highlighter absent or failed.
- **An on-page table of contents for anything longer than a screen.** Present on all four; the threat-model page will be the longest page on the site and needs it most.
- **An "edit this page" link and a visible last-updated stamp.** Standard across open-source docs, and the cheapest available signal that the project is maintained — the exact signal [site.md](../site.md) names as a reason the site exists.
- **A responsive layout with the sidebar collapsing to a menu.** Table stakes; a docs site read on a phone from a link in a chat is the common arrival.
- **Full keyboard operability with a visible focus ring**, carried from the repository's existing interface rules.

## Tier 2 — strong, high-value

- **A card grid on the landing page, three or four cards, each with an icon, a title and one line.** Anthropic's and Ghostty's shared vocabulary, and the single element that most produces the "considered" feel at small scale — because a grid of four cards is complete at four, whereas a sidebar of four sections looks like a sidebar missing six.
- **A numbered path for the first-time reader**, as Anthropic's `Steps` does. Seal's is short and real: install, point it at a repository, seal a file, resolve it from a script. It converts a landing page from a menu into an argument.
- **Docker's split by document type, reduced to what Seal actually has.** Seal has a getting-started, a small number of tasks, one conceptual page and one reference page. Naming those four groups keeps a reader oriented at a scale where a flat list would also work — and, critically, it means the site can be small without looking truncated, because each group is genuinely complete.
- **A named, prominent "What Seal does not protect" section reachable from the landing page**, not buried in a security page. This is where Seal deliberately diverges from all four named references, none of which has an equivalent — and from SOPS, which had the opportunity and did not take it. It is the single most important adaptation in this document.
- **Callout components for warnings and notes**, matching Anthropic's `Note`/`Tip` vocabulary. Seal's asides are consequential (the unsigned-download consequence, the macOS `source <(…)` trap) and a visually distinct callout is how a reader who skims still meets them.
- **`llms.txt` and per-page Markdown access.** Anthropic and Zed both publish it; Stripe is cited for the same pattern. It costs approximately nothing on a small site, and for a tool whose stated premise is that agents work in the user's codebase, being legible to agents is thematically exact.
- **An install page whose commands are the same strings continuous integration proves.** Stripe's runnable-code principle, adapted: Seal cannot make its samples executable in the browser, but it can make them the literal commands a CI job runs.
- **A screenshot of the application, once the interface is stable**, carrying the argument [docs.md](../docs.md)'s open thread names — that Seal is easier than a command-line tool. This is Tier 2 rather than Tier 1 only because of sequencing, not importance.

## Tier 3 — out of scope, with reasons

- **Stripe's three-column layout with a tracking code pane.** The affordance solves a problem Seal does not have: it exists for API reference pages where every prose paragraph has a corresponding request in eight languages. Seal's code samples are shell commands, one language, usually three lines. A third column would be empty on most pages, which is the ten-sections-eight-empty failure in another shape.
- **Stripe's global remembered language preference.** Same reason — there is one language, `bash`.
- **Docker's "Manuals" tier and its multi-product navigation.** Seal is one product with two binaries. A tier that exists to separate Docker Desktop from Docker Engine has nothing to separate here.
- **Anthropic's top-level tab bar.** Tabs exist to keep several large sidebars from becoming one enormous one. With roughly nine pages there is nothing to partition, and an empty second tab is worse than no tabs.
- **Docs versioning.** Docusaurus's headline feature and a real need for a library with published API compatibility ranges. Seal has not made its first tagged release; versioned documentation before version one is scaffolding for a problem that does not exist.
- **Internationalisation.** Available free in Starlight, and still out of scope — a second locale is a second set of claims to keep true, and this document's entire content-boundary argument is against second copies.
- **A blog or changelog on the site.** GitHub Releases already owns release notes, and [packaging.md](../packaging.md) owns how a tag becomes a release. A changelog page would be a second copy of the release notes, and the copy that goes stale.
- **An interactive or in-browser demo.** Seal's whole value is that the password never leaves the user's head and the plaintext never leaves the machine; a hosted playground would be a surface that contradicts the product to demonstrate it.
- **AI-powered "ask the docs" search.** Present on Anthropic's and Stripe's sites, requires a hosted service, and the corpus is nine pages — full-text search finds everything in it.
- **A community or showcase section.** Nothing to show yet, and an empty one is the failure mode named in the frame.
- **Analytics.** A site for a tool that exists to keep an adversary from reading the machine should not ship third-party tracking to the people evaluating it. Absence is a statement consistent with the product.
- **A custom domain.** `7scholar.github.io/seal` is sufficient and costs nothing; a domain can be attached later without changing anything the site is.

# States

The site is several surfaces, each with its own state list. Where a state cannot occur, that is stated with the reason rather than omitted.

## The landing page

- **Populated.** The only state it has, and it is populated by construction because its content is written rather than generated. One sentence naming what Seal does, a card grid, a numbered first-run path, and the named limits section. It never has an empty state, and this is the reason to hand-write it rather than let a generator's home template render whatever the sidebar happens to contain.
- **Excessive.** Unreachable: the card count is fixed at four by the page's own design, not derived from a page count.
- **Loading.** Static HTML from a CDN. No spinner exists, and none should be introduced.
- **Degraded.** JavaScript unavailable or blocked: every word, every link and every command remains present and readable. Only search and the theme toggle are lost. This is a hard requirement, not a nicety — a reader evaluating a security tool with a locked-down browser is exactly the reader this site must convince.

## The documentation body

- **Populated.** Sidebar, prose column at a 66-character measure, on-page table of contents, prev/next at the foot.
- **One.** A group holding a single page renders as a single link, never as a collapsible group with one child inside it. A disclosure triangle that reveals one item is the specific tell of a template running on content it does not have.
- **Empty — the state that must never exist.** A stub page with a heading and a "coming soon", or a sidebar group whose pages are unwritten, is the failure this whole plan is scoped against. The rule is absolute: **a page exists on the site only when it is complete; a group exists only when every page under it is complete.** There is no placeholder state to design, because a placeholder is a defect. The site launches with fewer pages rather than with any page in this state.
- **Excessive.** A page longer than roughly three screens is the signal to split it, not to add a longer table of contents. The threat-model page is the one at risk and is allowed to be long, because splitting a set of limits across pages is how a reader meets three of four.
- **Loading.** Static; navigation between pages is instant on a prebuilt site and needs no transition.
- **Error — a 404.** A real designed page in the site's own layout, carrying the sidebar and search rather than a bare browser error, with links to the landing page and the install page. A stranger who arrives at a stale link is a stranger the site can still convert.
- **Degraded.** Search unavailable (index failed to build, or JavaScript off): the sidebar and the table of contents still navigate the entire site. Search is never the only route to a page.
- **Forbidden or unavailable.** Not reachable — everything published is public, there is no authentication, and nothing is gated.

## Search

- **Empty query.** The field shows its placeholder and a hint of the keyboard shortcut. No speculative "popular searches" list, which on a nine-page site would be a fabrication.
- **No results.** Says so plainly and offers the same two links a 404 offers, in the site's own visual language rather than as a bare line of grey text.
- **Populated.** Results as titled rows with the matched context beneath, keyboard-navigable, Enter to open, Escape to dismiss.
- **Loading.** The index is a static asset; if it has not arrived, the field is disabled with the reason visible rather than accepting keystrokes that go nowhere.
- **Degraded.** Covered above: absence of search is survivable; absence of the sidebar is not.

## Code blocks

- **Populated.** Highlighted, with a copy button in the corner that copies raw text only.
- **Copy succeeded.** The button confirms in place for a moment and returns. No toast, no overlay.
- **Copy failed** — clipboard permission denied, which real browsers do refuse: the text remains selectable and the failure is visible rather than a button that silently does nothing.
- **Degraded.** No highlighting, no copy button: the command is still complete, readable and selectable. The highlight is enhancement, exactly as the repository's existing interface rules state.
- **Excessive.** A block wider than the column scrolls horizontally within itself and never widens the page or wraps a command into something that is no longer the command.

## Screenshots

- **Absent — the state at launch.** The site ships with no screenshots and does not reserve space for them, because the palette and the manage surface both land after this site is built and any image taken now shows an interface that will not exist. There is no "screenshot coming" placeholder; the page is written to be complete without one.
- **Populated.** Once the interface work has landed, each image sits at its natural width in the prose column with a caption naming what it shows, and carries alt text that states the screen's content rather than repeating the caption.
- **Stale — the state that must be unreachable rather than designed.** Handled by generation rather than by discipline; see the proposal.

# Best-practice rules

1. **A fact lives in exactly one document, and the site links to it rather than restating it.** The test is mechanical: if changing a fact would require editing two files, one of them is wrong.
2. **A limit is stated as a limit.** "A forgotten password means the data is gone" never becomes "be sure to remember your password", and "sealing cannot reach backwards" never becomes "for best results, seal early". No superlative, no "military-grade", no "unbreakable", and no claim of protection the threat model does not grant.
3. **The limits are reachable from the landing page in one click, and named on it.** A reader who bounces after one screen has still met them. This is where the site outperforms all four named references rather than imitating them.
4. **Every command the site shows is a command that is run somewhere automatically.** A command on the site that no job executes is a claim, and this repository does not publish claims.
5. **Copy copies the raw command** — no prompt character, no line number, no gutter, no trailing prose.
6. **Syntax highlighting is enhancement.** Every page is complete and usable with CSS and JavaScript unavailable.
7. **A page ships complete or does not ship.** No stub, no "coming soon", no sidebar entry pointing at an unwritten page.
8. **A group with one child renders as one link, never as a group.**
9. **Search is an accelerator, never the only route.** Every page is reachable by navigation alone.
10. **Navigation depth stops at two levels.** A third level is the signal that the site has outgrown the instruction it was built under, and is raised as a question rather than absorbed.
11. **Body measure stays near 66 characters** regardless of viewport width.
12. **Dark mode follows the system by default**, with a manual override, matching what the application itself does.
13. **The site's voice is the repository's voice.** Plain declarative sentences; no exclamation; the installation route first because it is what a stranger came for.
14. **No third-party analytics, no tracking, no external fonts fetched at runtime.** A site evaluated by people who care about what reads their machine ships nothing that reads theirs.
15. **A screenshot is generated by a driven application or it is not published.** A hand-taken image is a claim with no verifier.

# Synthesis / proposal

## The generator: Astro Starlight

**Recommended, and this is the decision.** Reasons, in the order they carry weight:

- **Its default output already looks considered at small scale.** Sidebar, on-page table of contents, prev/next, edit link, last-updated stamp, dark mode, full-text search via Pagefind, readable typography and syntax highlighting all ship without configuration. What is left to do is the small amount of visual identity that makes it Seal's rather than Starlight's, which is CSS custom properties rather than theme surgery.
- **Its landing surface is a separate page template rather than a generated index.** `template: splash` gives a full-width hero-and-cards page with no sidebar, which is exactly the landing-page-versus-docs-body distinction all four named references have. VitePress's home layout is comparable but is more strongly associated with one look, and its `hero` plus `features` frontmatter is the most recognisable "this is a VitePress site" signature on the web — which matters when the brief is "considered, not templated".
- **It shares the repository's toolchain where it counts.** Astro's build core is Vite, the same bundler the application's frontend uses, and the deploy action detects `bun.lock` and uses Bun natively. The team already knows this build, the CI runner already installs Bun, and no new package manager or lockfile enters the repository — and [MEMORY.md](../MEMORY.md) is explicit that `bun.lock` is the only lockfile.
- **Search is static and self-hosted.** Pagefind builds an index at build time and needs no service, no account and no API key, which suits both the hosting choice and the no-third-parties rule.
- **It deploys to GitHub Pages cleanly** with the official Astro action, one workflow file, and a `base` of `/seal/`.
- **It scales down without looking truncated.** Groups are declared explicitly, so a site with four groups shows four groups rather than a framework's opinion of what a site should contain.

**The alternatives, and why not.** VitePress is the closest call and would work — the same Vite lineage, an excellent default theme, the fastest dev loop — and it is rejected on two specific points rather than on quality: its home layout is visually the most identifiable default in the category, and Vue is a second frontend framework in a repository that is React throughout. Docusaurus is rejected because its headline advantages are versioning and a deep plugin ecosystem, neither of which this site needs, and its default site is the widest of the four — the exact shape the scoping instruction is aimed at. mdBook is rejected because its output is the plain, chrome-light book layout Zed ships, which cannot reach the feel the reference sites set. Zola is rejected because its themes are community-maintained with no equivalent default. A hand-rolled site is rejected because search, the table of contents, the theme toggle and the mobile navigation would each be built and maintained by hand to arrive at what Starlight ships configured.

## Hosting

**GitHub Pages**, from a workflow on push to `main`, publishing to `https://7scholar.github.io/seal/`. The owner named it as a candidate and nothing in this research argues against it: the site is static, the traffic is small, the deployment is one workflow file, and it costs nothing. A custom domain attaches later without changing anything.

## The page list — nine pages, four groups

The whole site. Not a starting point to grow from; the deliberate extent.

**Landing page** (`/`, no sidebar). One sentence stating what Seal does, in the README's opening voice. A four-card grid: *Install*, *How it works*, *What Seal does not protect*, *Contribute*. The numbered first-run path — install the tool, open the application, point it at a repository, seal a file, resolve it from a script. A short, plainly styled block naming the two absolute limits with a link to the page that holds them, and one line stating that Seal is not code-signed with a link to what that means. No feature grid, no testimonial, no superlative.

**Get started** — two pages.

1. **Install.** The Homebrew command, the installer-script command, the source build for the application, and what unsigned means for the reader. This is the site's most-visited page and the one whose commands must be identical to what CI proves.
2. **Your first sealed file.** The end-to-end path in order: open the application, choose a master password, point it at a repository, seal a file, resolve it from a script. This is the one genuinely new document on the site — the README states the pieces but never walks the path, and this page is the tutorial neither the README nor the plans own.

**Guides** — two pages.

3. **Using Seal from scripts.** `seal resolve`, loading a whole env file, the exit-code table, `--passphrase-fd` for automation, and the macOS `source <(…)` trap.
4. **Managing files in the application.** What the manage flow does, why only likely secrets are pre-selected, the env-file editor, and that non-env files are stored as-is and never edited.

**Understand** — two pages.

5. **How it works.** Sealed files are standard age files with a passphrase; the recovery story does not depend on Seal existing; atomic replacement preserves permissions; the password exists only in the user's head.
6. **What Seal does not protect.** The threat model in full: what it defends against, what it does not, the two absolute limits at length, the size-leak, the swap dependency on full-disk encryption, and files already open by another process. The longest page on the site, and the one the landing page links to by name.

**Reference** — three pages.

7. **Command-line reference.** Every subcommand, every flag, every exit code.
8. **Security policy.** The reporting route, what is in and out of scope.
9. **Contributing.** The conventions a newcomer would otherwise violate, and where the plans live.

## The content boundary — where each fact lives once

This is the decision [site.md](../site.md) names as the first thing to settle. Three mechanisms, applied by category:

**Rendered from the repository, never retyped.** `SECURITY.md` and `CONTRIBUTING.md` become site pages 8 and 9 by the build reading those exact files from the repository root and rendering them into the site's layout. The file stays where GitHub expects it, the site is a second presentation of one text, and there is no second copy to keep true. If the build cannot resolve the source file, the build fails rather than publishing a page that silently drifted or vanished.

**Held by the site, and moved out of the README.** Pages 2, 3 and 4 — the first-sealed-file walkthrough, the scripting guide, the management guide — are the site's own content. Pages 3 and 4 are **moved** from the README rather than copied: the README's "Resolving a secret in a script" and "Managing files in the application" sections contract to one sentence and a link, exactly as the README already does for `docs/RUNNING.md` and `docs/RELEASING.md`. This is the only part of the proposal that edits an existing document, and it is what stops the site from being a second README. It is a change to `docs.md`'s content and belongs in the same commit as the site that receives it.

**Held by the site, with the README keeping its own copy — the two deliberate exceptions.** The install commands and the two absolute limits appear on both surfaces. The rule is not being broken here so much as bounded: a README with no install commands is a broken README, and a site that only links to the limits has softened them by relegation. Both duplications are held true by machine rather than by discipline — the install commands are extracted from one source and checked identical on both surfaces by CI, and the limits are a fixed short text asserted present and byte-identical on the landing page, in the README, in `SECURITY.md` and on page 6. A check that fires when the four disagree is what makes this exception safe rather than a licence.

**Linked, never rendered.** The plan tree, `docs/RUNNING.md`, `docs/RELEASING.md`, the licence texts, GitHub Releases, and the repository itself. These are for people already inside the project; the site points at them and holds none of their content.

**Held by neither — the README's own remaining job.** After the move, the README keeps the status, the installation section, the unsigned explanation, the two limits, and pointers to the site and the plans. It stays the document a reader meets on GitHub and stops being the document that carries every task.

## How it stays true

Four checks, all in continuous integration, all of the kind this repository already runs:

- **The install commands are extracted and diffed.** One source of truth for the command strings; the job asserts the README, the site's install page and the CI installation job carry the same text. A drift is a failed build rather than a stranger's failed install.
- **The limits text is asserted present and identical** across the landing page, the README, `SECURITY.md` and the threat-model page. This is the check that makes the softening failure mechanically impossible rather than a matter of reviewer attention.
- **Links are checked** over the built site and the repository's Markdown, catching both a dead external link and an in-repo link broken by a file move — a real risk given that two site pages are rendered from repository files.
- **The site builds on every change**, so a broken page is caught at merge rather than at deploy. Deployment runs only on `main`.

The bar carried over from `ci.md` applies unchanged: any of these checks that can be skipped has an environment variable that turns the skip into a failure, and CI sets it.

## Screenshots, and the sequencing

**The site launches with none.** [palette.md](../../desktop/ui/navigation/palette.md) restyles every surface and [manage-surface.md](../../desktop/ui/navigation/manage-surface.md) rebuilds a screen, so an image taken now is stale before it is published — and a stale screenshot on a site that exists to signal the project is maintained does the opposite of its job. The site's structure is not blocked by this; only its images are. Pages 2 and 4 are written to be complete in prose, with no reserved gap and no placeholder.

**When they arrive, they are generated rather than taken.** The repository already drives the real application end to end with WebdriverIO against a release build, through a harness that creates a fresh home directory and a fresh repository per run — which is deterministic seeded state, the exact precondition automated screenshots need. A capture step added to the existing journey specs, at a fixed window size, produces the site's images from the same run that proves the journey works. A screenshot then cannot show an interface that does not exist, because the run that produced it would have failed first. This is the same move `ci.md` makes everywhere else: verify rather than believe.

**The one screenshot that carries the argument** is the repository's managed-file view — the surface that makes [docs.md](../docs.md)'s point that Seal is easier than a command-line tool. If only one image is ever published, it is that one.

## Load-bearing versus rounding-out

**Load-bearing** — cut anything else before these. The landing page with its four cards and its named limits section; the install page with commands identical to what CI proves; the threat-model page; the two checks that hold the install commands and the limits text identical across surfaces; dark mode; and the rule that no page ships incomplete.

**Rounding-out** — real value, safely deferred. Search (a nine-page site is navigable without it, though it ships free with Starlight); `llms.txt` and per-page Markdown; the designed 404; the edit link and last-updated stamp; screenshots; and any visual identity beyond typography, spacing and the palette's colours.

## What the reference gave, and what was adapted

Accounted for element by element, per **Building against a reference**:

- **Built as shown** — the landing page distinct from the docs body (all four); the card grid with icon, title and one line (Anthropic, Ghostty); the numbered first-run path (Anthropic's `Steps`); the split by document type (Docker); the quickstart as the front door (OpenAI); search with a keyboard shortcut, dark mode, copy buttons, on-page table of contents (all four); `llms.txt` and Markdown access (Anthropic, Zed).
- **Adapted, with the reason** — Docker's four-way split reduced from four large trees to four small groups totalling nine pages, because that is the honest extent of Seal's content; Stripe's runnable code samples reduced to commands that are literally the ones CI runs, because a shell command cannot run in a browser and should not pretend to; Docker's Featured topics and Common questions collapsed into the four landing cards, because six curated links plus eight questions over nine pages would exceed the site.
- **Excluded, with the reason** — Stripe's third column and its language switcher; Anthropic's tab bar; Docker's Manuals tier; versioning; internationalisation; AI search; a blog; a demo; analytics. Each is in Tier 3 with its reason, on record rather than overlooked.
- **The deliberate divergence** — none of the four references carries a prominent statement of what the product does not do, and one genre peer, SOPS, has the same opportunity and omits it. Seal's landing page names its limits. This is a departure from the reference, it is deliberate, and it is raised here rather than resolved silently: the threat model outranks the reference where they conflict, per the constraint [site.md](../site.md) already records.

# Open threads

- **Whether page 2's walkthrough should show the application or the command-line tool first.** The application is the product's argument and the command-line tool is what actually works today. The current status section says so plainly; the walkthrough must not imply a smoother application experience than exists. Resolved when the remaining journeys are driven.
- **How `SECURITY.md` and `CONTRIBUTING.md` are read from the repository root at build time.** The mechanism is a build-time read rather than a copy, but the exact form — a content-collection loader pointed outside the docs directory, a build-step import, or a checked symlink — is a build decision, and the Windows symlink caveat argues against the symlink. It is not settled here beyond the requirement that a missing source file fails the build.
- **Whether the install commands' single source is a file the site, the README and CI all read, or three copies plus a diffing check.** The check is the requirement; the shape is a build decision.
- **Whether page 7's command-line reference is written or generated from the CLI's own help output.** Generated is better and is the pattern this repository would normally choose; whether the CLI's help text is currently structured enough to generate from is unverified.
- **Whether the site outgrows one plan.** [site.md](../site.md) raises this. On this proposal it does not: nine pages, one generator, one workflow, four checks. If the verification checks turn out to want their own home, they belong with [ci.md](../ci.md) rather than justifying a new plan folder.
