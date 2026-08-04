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

## What the surface still says with a sentence

Nothing in the layout. The assurances — that confirming encrypts nothing, that files stay where they are, that a rescan changes nothing already managed — stay behind the toggletip the user chooses to open, per [the parent's prose rule](../README.md).

# What exists

All of the Approach, at [ManageFlow.tsx](../../../../../../ui/screens/ManageFlow.tsx) over the tree primitive at [FileTree.tsx](../../../../../../ui/components/FileTree.tsx). The tree's contract is untouched.

The inert-folder guard was confirmed non-vacuous by restoring the defect and watching the covering test fail. That the fixture had to gain a candidate-less folder before the test could catch it at all is why the defect survived a full suite for so long: every directory in the old fixture held a candidate.

The full `first-run` journey passes end to end against a release build — password established, repository added through this surface, file sealed, sealed file verified on disk as standard age.

# What is missing

**The fixed frame does not hold in the running application, and the Approach above overstates what was achieved.** Measured 2026-08-04 by driving a repository of ~80 files at the default window size: `.manage` renders **2630px tall in a viewport far shorter than that**, `.manage__region` reports `scrollHeight === clientHeight` — so the tree region is not the scrolling element at all — and the header sits at `top: 0` with the whole document scrolling instead. Both `.manage__head` and `.manage__actions` therefore leave the viewport, which is precisely the fault the frame was built to fix.

The three-band grid is not wrong; its **height chain is broken**. `.manage` asks for `height: 100%`, but the surface renders through an early return in `App.tsx` that is **outside `.shell`** — and `.shell` is the only element setting `100vh`. Neither `body` nor `#root` establishes a height, so `100%` resolves against auto and the grid expands to its content. This is why the CSS reads as correct and the surface behaves as though it were not.

**The window's title bar is absent from this surface entirely.** Measured in the same run: `document.querySelectorAll("[data-tauri-drag-region]")` returns **nothing** while the manage surface is open. The same early return that breaks the height chain also skips `.shell__titlebar`, so the surface has no drag region and no double-click zoom target, and it starts at `top: 0` **underneath the platform's window controls** rather than below the 5.5rem inset `.shell__titlebar` reserves for them. The product owner met this directly: the page goes under the traffic lights and there is no header to drag.

This is **not only this surface's defect.** Three early returns in `App.tsx` render outside the shell — the manage overlay, the password-change overlay, and the locked/unlock screen — so none of them has a title bar. The owner's instruction is that the header must be present on **every** page, which makes the fix structural rather than local to this node: the shell frame should own the window, and these surfaces should render inside it. Where that fix belongs is a placement question for [the navigation node](README.md), since it owns the shell; this node owns only what the manage surface does within it.

The owner also asked for two changes to this surface's content, neither of which is a defect:

- **The title and subtitle pinned at the top, and Cancel/Manage files pinned at the bottom.** This is what the frame already intends and does not deliver; the fix is the height chain above rather than new chrome.
- **Remove "an environment file".** This is a scan *reason*, not interface copy — `crates/seal-registry/src/scan.rs:201` returns it as the `Confidence::Secret` reason for any env-like name, and the tree renders every reason as `.tree__reason`. It is the single most repeated string on the surface: in the driven run, the first six annotations were all `an environment file`, restating what the filename beside it already says. Removing it means either dropping that reason at the source or having the tree suppress a reason that adds nothing to the name — a decision that touches [scan-shape.md](../repo-layer/scan-shape.md)'s contract and [vocabulary.md](../repo-layer/vocabulary.md)'s words, so it is not unilaterally this node's to make.

The audit's remaining findings, none of which this pass took. They are real and recorded in [_docs/manage-surface-audit.md](_docs/manage-surface-audit.md); the honest statement is that the frame and the two defects the owner met are fixed and the surface is not yet finished:

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
- [ ] Make the fixed frame actually hold: repair the height chain so the tree region is the only scrolling element and the header and footer stay in view. Reproduce first — the measurement above is the reproduction.
- [ ] Drop the "an environment file" annotation, once its owning contracts agree where the change belongs.
- [ ] The filter over the tree, with the binding behaviour [the research](_docs/tree-picker-research.md) states: matches on path, restores prior expansion exactly when cleared, and never touches selection.
- [ ] The remaining audit findings above.

# Open threads

- **Whether a bare row click on a folder holding candidates should keep selecting them.** [The research](_docs/tree-picker-research.md) recommends moving all selection to the checkbox, on the grounds that a click which can queue a directory's secrets for encryption should require aiming at a checkbox rather than landing anywhere on a wide row. That is a good argument and it was not taken here, because the behaviour is asserted by three tests and changing it is a deliberate contract change rather than a defect fix. It wants settling on its own merits rather than as a side effect of closing the dead case.
- The filter and [adopting.md](../repo-layer/adopting.md)'s standing filter thread are the same question and should be closed together.
