Part of [the navigation plan](README.md).

# Scope

The **manage surface** — the screen a user meets when adding a repository or rescanning a known one — carried to the depth the repositories grid now has. It owns that surface's **layout, its chrome, and every state it can occupy**: how the surface fills the window, what stays fixed while the tree scrolls, and how the tree reads and responds as an object the user works with.

Out of scope, and deliberately: the **tree's contract**, which [repo-layer/adopting.md](../repo-layer/adopting.md) owns and which this node does not reopen — the row anatomy, the two visual channels, the folder-scoping invariant, computed expansion, and the assistive-technology model are settled and correct. This node changes how that contract is *presented and felt*, never what it guarantees. Also out of scope: what the scan returns ([repo-layer/scan-shape.md](../repo-layer/scan-shape.md)) and the words on the surface ([repo-layer/vocabulary.md](../repo-layer/vocabulary.md)).

# What & why

The product owner reviewed the running application and judged this surface **amateur — that it reads as a school project rather than a production interface**. That verdict is the input to this plan, and it is not a matter of taste: this is the screen a user meets at the exact moment they decide whether to trust Seal with a credential, and [adopting.md](../repo-layer/adopting.md) already states that it "decides whether the product reads as a layer". A surface that undermines confidence at that moment fails at its actual job, whatever its tree guarantees.

The owner named the standard directly: **a production interface in 2026 shows elegance and minimalism while still exposing every operation the surface's subject affords.** Those pull against each other on purpose — the failure mode on one side is a cluttered panel, on the other a surface so spare the user cannot act. The manage surface is currently neither elegant nor complete.

The owner named three faults and stated explicitly that **finding the rest is this plan's job rather than theirs** — the named ones are examples of a class, not the list.

**Fault 1 — the tree does not respond.** *"I can click on a folder and nothing happens."* This is a real defect, not a perception, and it is reproducible from the source: a row's click handler [FileTree.tsx:240-250](../../../../../../ui/components/FileTree.tsx#L240-L250) toggles selection of the candidates beneath a directory, but a directory containing **no** candidates computes `candidates.length === 0`, returns without acting, and is also `selectable: false`, so it draws no checkbox. Clicking such a folder anywhere except its twisty is inert — no expansion, no selection, no feedback. Since the tree draws the *whole* repository and expansion is deliberately narrow, most folders a user sees and clicks are exactly this kind. The user's mental model — *click a folder to open it* — is the one thing the surface refuses.

Whether the fix is click-to-expand, a hit target that reaches the twisty, or an explicit affordance is a design question this plan answers; that the current behaviour is wrong is not.

**Fault 2 — the surface does not fill the window.** `.manage` is `max-width: 72rem` centred with uniform padding ([styles.css:390](../../../../../../ui/styles.css#L390)), so on a real window the repository tree — the object the user came to work with — sits in a column with dead space beside it. The owner's words: *"things like not filling the screen are making it feel very amateuristic."*

**Fault 3 — the chrome scrolls away with the content.** The surface is one flowing block: heading, path, tree, then a `<footer>` in normal flow. So **Cancel and the confirm button scroll out of view**, and so does the repository being added. On any repository whose tree is longer than the window — which is every real one — the user loses both the primary action and the statement of what they are acting on. The confirm button carries the selection count, which is the surface's blast-radius statement; scrolling it away is worse than cosmetic. **The repository identity belongs in a fixed header and the two actions in a fixed footer**, with only the tree scrolling between them.

Why this is one plan and not a batch of tweaks: the three named faults share a cause. The surface was built as a document that flows rather than as an **application surface with a fixed frame and one scrolling region**, and each fault is that decision surfacing somewhere different. Fixing them individually would leave the cause in place.

# Approach

Built from two documents: [_docs/manage-surface-audit.md](_docs/manage-surface-audit.md), which records fifteen findings against the running application, and [_docs/tree-picker-research.md](_docs/tree-picker-research.md), which surveys VS Code, GitHub, the git clients, the backup tools, Finder and the ARIA practices. Those are the design input; this Approach states what follows.

## The surface is a frame, not a document

The single cause behind the owner's three faults: the surface was built as a document that flows, so its chrome scrolled with its content and its tree was a box sitting in a column.

It is a **three-band grid at full window height** — `auto` header, `minmax(0, 1fr)` region, `auto` footer — and the tree region is the **only scrolling thing on the surface**. Both of the caps that held it back are gone: the surface's own `max-width`, and the tree's `max-height`, which was the worse of the two. Measured before the change, the tree was a fixed 416px box regardless of window size, leaving 362px of dead space below the footer at 1280×720 and using half the window — and getting worse as the window grew, which is the opposite of what enlarging a window should do.

The grid gets the window's height from **the shell**, which [the navigation node](README.md) makes unconditional: this surface is content inside the shell's main region rather than a screen that replaces it. That is the whole of the height chain — the surface claims its region as a flex child and the region cannot exceed the window, so the two `auto` bands are pinned and the `1fr` band is what absorbs a tree of any size.

The **repository identity is in the fixed header** and **both actions are in the fixed footer**, so the confirm button's count — the surface's blast-radius statement — is visible at every scroll position rather than scrolling out of reach on any repository whose tree is longer than the window.

The chrome's dividers appear **only when content has scrolled beneath them**, so a surface with nothing to scroll does not draw a bar that looks stuck.

## Every row that claims to be clickable responds

The rule, stated as an invariant: **a row that draws `cursor: pointer` responds to a click, and a row that cannot act does not claim it can.**

A folder holding no detected files was inert — the click handler returned having called nothing — while the row drew a pointer cursor and highlighted on hover. It made two false statements and then refused. This is not an edge case: measured, **four of nine directories** in an ordinary repository, and **every directory on the surface** in the nothing-recognised case, where the surface simultaneously invited the user to choose any file.

Such a folder now **expands**, which is the act the user was reaching for. A folder that *does* hold candidates keeps selecting them on a row click, because that is a documented behaviour with tests asserting it; the fix closes the dead case rather than redefining the live one. Expansion remains separate from selection in both paths, so browsing still cannot queue a file for encryption.

Rows that genuinely cannot act — a pruned directory, an already-managed file — carry an inert marker and lose the pointer cursor.

## The surface owns its own scan

The overlay **opens first and scans second**. It previously did the reverse, fully awaiting the scan before constructing the surface, which meant a loading state could not render at all: the audit measured a **42-second scan** spent on the previous screen with no acknowledgement that the folder choice had registered.

- **Scanning** names the repository being read, and is delayed past the point where it would flash on the measured 0.09-second case.
- **Failure** is an alert *inside the surface*, with the retry beside it acting on the folder the user already chose. Previously a failed scan never reached this surface: it was routed to the global banner on the screen the user had just left, so the choice evaporated with its error attached somewhere else.
- A session expiring mid-scan still relocks, rather than being reported as a scan failure.

The header states the repository's **size**, which the excessive case had no way to say at 1,097 rows, and the footer states the selection as a tally beside the button.

## An annotation earns its place or is not drawn

The tree annotates a file with the scan's reason for flagging it. That reason is worth a column only where it says something **the filename does not**: `id_ed25519` is *a private key*, `credentials.json` is *a well-known credential file*, and `.env.example` is *conventionally committed as an example rather than holding real values* — a user cannot read any of those off the name.

An env file was the exception, annotated *an environment file* beside a row already named `.env`. It was the most repeated string on the surface — in the driven run the first six annotations were identical — and it restated its own row, which is worse than saying nothing: it fills the channel a reader learns to scan with the one entry that never rewards scanning.

So **the classifier gives no reason where the name is the reason**, rather than the tree suppressing one it was given. The scan is what knows why a file was flagged, and only it can know that the answer adds nothing; a tree filtering strings would be guessing at the classifier's intent. The reason was already optional at the boundary and in the interface — `NodeView` carried `Option<&'static str>` and the tree already drew nothing for a null — so the change is the classifier returning `None`, and the plumbing that was always there finally being used.

Confidence is unaffected: an env file is still `Secret` and still preselected. What is dropped is the sentence, not the judgement.

## What the surface still says with a sentence

Nothing in the layout. The assurances — that confirming encrypts nothing, that files stay where they are, that a rescan changes nothing already managed — stay behind the toggletip the user chooses to open, per [the parent's prose rule](../README.md).

# What exists

All of the Approach, at [ManageFlow.tsx](../../../../../../ui/screens/ManageFlow.tsx) over the tree primitive at [FileTree.tsx](../../../../../../ui/components/FileTree.tsx). The tree's contract is untouched.

The inert-folder guard was confirmed non-vacuous by restoring the defect and watching the covering test fail. That the fixture had to gain a candidate-less folder before the test could catch it at all is why the defect survived a full suite for so long: every directory in the old fixture held a candidate.

**The frame holds in the running application**, which it did not when this plan last claimed it. Driven at the default window size: the surface is 673.6px in a 720px viewport, its tree region scrolls 2180px of content through a 519px window while the document does not scroll at all, and with the tree at its end the header is still below the window controls and the footer still on the window's bottom edge. The height chain it depends on is [the navigation node](README.md)'s unconditional shell; the measurement, the reproduction and the driven check are recorded there.

**The annotation rule is guarded in both directions.** One test asserts that no env-like name carries a reason and that the six names whose reason is informative still explain themselves. Confirmed non-vacuous by restoring `an environment file` and watching it fail naming the row. Nothing had asserted a scan reason before — the classification test discarded the reason and matched only confidence, which is why the most repeated string on the surface was never covered by anything.

The full `first-run` journey passes end to end against a release build — password established, repository added through this surface, file sealed, sealed file verified on disk as standard age.

# What is missing

The audit's remaining findings, none of which this pass took. They are real and recorded in [_docs/manage-surface-audit.md](_docs/manage-surface-audit.md); the honest statement is that the frame, the annotation channel and the two defects the owner met are fixed and the surface is not yet finished:

- **A filter over the tree.** [The research](_docs/tree-picker-research.md) argues it is table stakes rather than a refinement, and the argument is structural: expansion follows the *detected* files, so every undetected file — the entire reason undetected files are selectable — is reachable only by hand-opening its chain, which at 1,097 rows is a directory-by-directory hunt for a file the user can already name.
- **The degraded state.** A partially-walked repository is drawn exactly like a fully-walked one, with nothing at surface level saying the picture is incomplete.
- **Density and alignment.** Directory and file names misalign by 1px, and the annotation channel has no column at all — measured starting anywhere between x=190 and x=303.
- **The idle lock discards a live selection**, met by accident during the audit on the one surface designed for slow deliberation.
- **The confirm gives no account of already-managed files** in a rescan.

# Steps

- [x] Audit the surface against the running application, per [SURFACE_AUDIT.md](../../../../../../docs/plans/SURFACE_AUDIT.md) — every state, every interaction, the full finding set the owner asked for rather than the three named faults.
- [x] Research the prior art for a tree-picker surface with fixed chrome, per [docs/UX_RESEARCH.md](../../../../../../docs/UX_RESEARCH.md), and produce the design input.
- [x] The frame: the three-band full-window shape, fixed chrome, and the tree as the only scrolling region.
- [x] Every row that draws a pointer responds, and rows that cannot act stop claiming they can.
- [x] The scanning state and the surface's own failure state, which required the overlay to open before the scan.
- [x] Make the fixed frame actually hold: repair the height chain so the tree region is the only scrolling element and the header and footer stay in view. Reproduce first — the measurement above is the reproduction.
- [x] Drop the "an environment file" annotation, once its owning contracts agree where the change belongs.
- [ ] The filter over the tree, with the binding behaviour [the research](_docs/tree-picker-research.md) states: matches on path, restores prior expansion exactly when cleared, and never touches selection.
- [ ] The remaining audit findings above.

# Open threads

- **Whether a bare row click on a folder holding candidates should keep selecting them.** [The research](_docs/tree-picker-research.md) recommends moving all selection to the checkbox, on the grounds that a click which can queue a directory's secrets for encryption should require aiming at a checkbox rather than landing anywhere on a wide row. That is a good argument and it was not taken here, because the behaviour is asserted by three tests and changing it is a deliberate contract change rather than a defect fix. It wants settling on its own merits rather than as a side effect of closing the dead case.
- The filter and [adopting.md](../repo-layer/adopting.md)'s standing filter thread are the same question and should be closed together.
