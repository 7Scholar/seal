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

TBD.

Recorded now because they constrain any solution:

- **The reference is named and is specification.** Anthropic, OpenAI, Docker and Stripe were supplied by the owner as the standard to match. [docs/UX_RESEARCH.md](../../../../docs/UX_RESEARCH.md)'s **Building against a reference** rules therefore bind this work: match the affordance rather than copy the position, account for what the reference does, and raise a deviation rather than resolve it quietly.
- **Small is the intent.** *"We don't need much"* is a scoping instruction. The failure mode here is a documentation framework whose default site is ten sections wide and eight of them empty, which reads worse than a single good page.
- **Nothing published may contradict the threat model.** [The root intent](../README.md) requires Seal's limits to be stated without softening, and [docs.md](docs.md) holds that line for the README and the security policy. A marketing-shaped site is the likeliest place for that discipline to slip — anything the site claims about what Seal protects against answers to the same bar, and "elegant" is not a licence to soften "a forgotten password is unrecoverable".

# What is missing

All of it. No site exists, nothing is hosted, and no build produces one.

The decisions the Approach must reach, none of which are settled:

- **Content and its source of truth.** Whether the site renders the existing in-repository documents, holds its own content, or both — and how duplication is prevented, given the repository's standing rule that a decision or procedure is never duplicated across documents and the owning document is linked instead. A site that copies the README is a second README to keep true.
- **How it is built and hosted.** GitHub Pages is the owner's candidate, not yet a decision.
- **How it stays true.** [ci.md](ci.md) exists precisely because the repository's claims are verified rather than believed, and every command in the README was run against a clean clone. A published site is a new surface for claims to rot on, and it should not ship without an answer for how it is checked.
- **Screenshots**, per [docs.md](docs.md)'s open thread — whether the site carries them, and how they are kept from going stale. Note the ordering: [manage-surface.md](../desktop/ui/navigation/manage-surface.md) and [palette.md](../desktop/ui/navigation/palette.md) will both change how the application looks, so screenshots taken before those land are stale on arrival.

# Steps

- [ ] Research the named references and how comparable small open-source projects publish, per [docs/UX_RESEARCH.md](../../../../docs/UX_RESEARCH.md).
- [ ] Settle the content boundary against [docs.md](docs.md) — what the site holds, what it links to, and where each fact lives once.
- [ ] Solution the Approach, raising the hosting and content-source forks in `QUESTIONS.md` if research does not settle them.

# Open threads

- Whether this concern stays a plan `.md` or becomes a folder. It is framed as a single plan on the judgement that the site is small by instruction. If the content boundary turns out to be substantial — its own information architecture, its own build, its own checks — it outgrows one working surface and wants promoting, which is a reshape and goes through the user.
- Sequencing against the interface work. Any screenshot or visual claim the site makes depends on [palette.md](../desktop/ui/navigation/palette.md) and [manage-surface.md](../desktop/ui/navigation/manage-surface.md) having landed, so the site's visual content is downstream of those even though its structure is not.
