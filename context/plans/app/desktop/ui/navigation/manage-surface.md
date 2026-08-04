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

Rows that genuinely cannot act — a pruned directory, an already-managed file — carry an inert marker, lose the pointer cursor, **and do not light up on hover**. The hover rule was unqualified, so an inert row highlighted exactly like an actionable one and then refused: the same false promise the pointer cursor was making, in the channel a user actually reads first.

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

## Finding a file the scan did not detect

The tree expands to follow the *detected* files, so an undetected one — the entire reason undetected files are selectable — is reachable only by hand-opening the chain to it. The filter is what makes that case tractable, and its behaviour is binding rather than a matter of taste:

- It matches **case-insensitively on the path**, not the leaf name, so naming a folder reveals everything under it.
- It **prunes to matches and keeps their ancestors** for context, and the pruned tree is what the tree renders — a collapsed branch still renders none of its children, so the filter cannot reintroduce the cost the collapse avoids.
- Clearing it **restores exactly the expansion in force before the first keystroke**, which is captured on entry rather than recomputed. A branch the filter opened closes again; a branch the user had opened stays open.
- It **never touches the selection**, in either direction. The tally and the confirm button keep stating the whole selection while a filter is active, because that count is the surface's blast-radius statement and narrowing it to the visible set would understate what confirming does.
- With no match the region says so in its own language and offers to clear the field, rather than showing an empty tree.

**The tree stays operable while filtered.** Expansion during a filter is a union — the revealed ancestors are added to the user's expansion rather than replacing it — so a folder can still be collapsed and reopened by hand. Driving the first implementation caught the alternative: passing the revealed set directly as the expansion made every twisty inert, because a toggle wrote to state the render ignored. That is the same defect class the whole surface was rebuilt to remove, reintroduced by the filter.

## A rescan says on its face that it is one

A rescan and a first add drew identically — same heading, same path, same tree, same two buttons — with the one fact that changes what confirming means (*nothing already managed is changed*) reachable only by opening the toggletip. The surface now says it where the user is already looking: the heading reads **More files in `<repository>`** rather than *Seal in*, a small **Already managed** marker sits beside it, and the footer states what the confirm will leave alone — *"3 files selected · 2 already managed, left as they are"* — beside the count of what it will act on. The toggletip keeps its fuller sentence; what changed is that the visible surface no longer depends on it.

Already-managed rows are marked in the accent rather than in the same muted grey as *not looked in*. The two notes had one treatment for facts with opposite consequences: *Seal already covers this* and *Seal did not look here*.

## The two channels are columns, and neither grows a row

The row has exactly two channels — the **name** and the **annotation** — and each is a column rather than a position that happens to fall where the previous thing ended.

The name takes the row's remaining width and **truncates with an ellipsis**; it never wraps. The annotation and the *already managed* note sit at the row's **trailing edge**, so their edges line up down the tree and the eye reads them as one column. Before this they were plain flex siblings starting wherever the name ended: measured across an ordinary repository, their right edges spanned **361px** and their left edges 52px, so the surface's account of *why Seal proposes this file* had no edge to scan at all.

**Every name starts at the same place for its depth, whichever kind of row it is.** The 1px offset between directory and file rows was not the two fonts — file names are monospaced and directory names proportional, which [the research](_docs/tree-picker-research.md) keeps deliberately so the kinds are separable without a badge. It was the **checkbox placeholder**, declared a pixel wider than the real checkbox it stands in for, so every directory row sat one pixel right of every file row. The placeholder now takes its width from the control.

Row height is therefore a property of the row rather than of its longest name: a 242-character name truncates inside its column instead of wrapping to three lines.

## The scan says where it did not look

The scan deliberately skips build output and installed dependencies — `node_modules`, `target`, `dist`, `.git` and their kind — which is correct, because a user's own secrets do not live there and walking them costs the scan its speed. The surface never said so, and that silence is the degraded state: a user looking for a file inside one of those folders had no way to learn why it was not listed.

The surface now states it as a fact beside the size it already carries — **`node_modules not searched`**, or a count once there are several — and the toggletip names every skipped folder and says why, which is where the surface's fuller accounts already live. This is a statement of what the scan did, not an apology for it: the per-row *not looked in* note stays, and what is new is that the incompleteness is legible without finding a pruned row.

## A live selection outlives a background lock

The selection is the user's work, and the surface does not discard it on the strength of something happening behind it. The background re-observation poll is the only thing calling into the session while the overlay is up, and a lock reported there **does not relock the window** — the selection, the expansion and the filter all stand.

The selection is lost in exactly one case, and it is the case where keeping it would be a lie: **the confirm itself fails with a locked session.** The act the selection existed for cannot happen, so the surface relocks and the user unlocks before adding anything.

## What the surface still says with a sentence

Nothing in the layout. The assurances — that confirming encrypts nothing, that files stay where they are, that a rescan changes nothing already managed — stay behind the toggletip the user chooses to open, per [the parent's prose rule](../README.md).

# What exists

All of the Approach, at [ManageFlow.tsx](../../../../../../ui/screens/ManageFlow.tsx) over the tree primitive at [FileTree.tsx](../../../../../../ui/components/FileTree.tsx). The tree's contract is untouched.

The inert-folder guard was confirmed non-vacuous by restoring the defect and watching the covering test fail. That the fixture had to gain a candidate-less folder before the test could catch it at all is why the defect survived a full suite for so long: every directory in the old fixture held a candidate.

**The frame holds in the running application**, which it did not when this plan last claimed it. Driven at the default window size: the surface is 673.6px in a 720px viewport, its tree region scrolls 2180px of content through a 519px window while the document does not scroll at all, and with the tree at its end the header is still below the window controls and the footer still on the window's bottom edge. The height chain it depends on is [the navigation node](README.md)'s unconditional shell; the measurement, the reproduction and the driven check are recorded there.

**The annotation rule is guarded in both directions.** One test asserts that no env-like name carries a reason and that the six names whose reason is informative still explain themselves. Confirmed non-vacuous by restoring `an environment file` and watching it fail naming the row. Nothing had asserted a scan reason before — the classification test discarded the reason and matched only confidence, which is why the most repeated string on the surface was never covered by anything.

**The filter is built and driven**, five checks green in the real webview (`bun run e2e:filter`) against a repository holding a file the scan does not detect, three directories deep in a chain nothing expands. What is measured there is exactly the case the filter exists for: the file is absent from the tree, naming it reveals it without a single folder being opened, naming its *folder* reveals it too, the tally and the confirm button keep stating the whole selection while filtered, and clearing restores the tree without leaving the filter's own expansion behind. Confirmed non-vacuous by disabling the pruning and re-driving — the two checks that depend on it fail while the three that do not still pass.

**The rescan now reads as a rescan**, guarded by three unit tests and driven in the `settling-in` scenario, which asserts the visible heading or marker *and* the footer's account of what will be left alone. Confirmed non-vacuous by restoring the shared heading and dropping the footer clause, which fails exactly those checks.

Six unit tests cover the filter, and the restore guard among them was **rewritten after being caught vacuous**: the first version passed with the restore deleted, because it never expanded anything while filtering and so had nothing to restore. It now collapses and reopens a branch under an active filter, and fails when the restore is removed.

The full `first-run` journey passes end to end against a release build — password established, repository added through this surface, file sealed, sealed file verified on disk as standard age.

**The two channels and the degraded state are built and driven** (`bun run e2e:density`), four checks green in the real webview against a repository holding a pruned folder, an unreasonable name, and rows of both kinds at the same depth. What is measured there is the geometry rather than the markup: the annotations' right edges within 1px of each other, every name at one x per depth, a 242-character name one line tall and genuinely clipped, and the surface stating what it did not search.

Confirmed non-vacuous by restoring each defect and re-driving — the ragged channel and the 1px offset each fail their own check. **The truncation guard was caught vacuous twice and rewritten both times**: first it measured the *row's* height, which `min-height` and `align-items: center` hold constant while the name overflows, so it passed with truncation deleted; then its 92-character name turned out to fit the column, so it proved nothing. It now measures the name's own height against its line height and asserts the name is actually clipped — which is what made the second vacuity visible rather than silent.

The degraded state's two halves are guarded separately in unit tests, each confirmed by deleting the other's code.

# What is missing

Nothing. The last audit finding was pursued to a reproduction and **the defect it described does not exist as stated** — see below.

## The relock that discards a live selection

The audit recorded that a relock arriving while the manage surface is open destroys the selection. Driven against the real component tree, **no reachable trigger does that while a selection is live**, and the reason is structural rather than incidental.

`relock` does clear the overlay, and `ManageFlow` does hold `selected` in local state, so *if* a relock arrived the selection would indeed be lost. The finding is wrong about the antecedent: nothing delivers one.

- **The surface's own two calls cannot carry a lock.** `scan_folder` and `manage` lock only the registry, whose failure is `Kind::Registry`; neither takes the session guard, so neither can return `Kind::Locked`. A locked session is therefore invisible to the manage surface's own traffic.
- **The one concurrent caller that checks the session discards its answer.** `reobserve` returns `Kind::Locked` when the session is not unlocked, and it is the only thing polling while the overlay is up — but its caller swallows every error, so the lock never reaches `relock`. This is what makes the case unreachable in practice, and it is deliberate: a background poll that relocked the window would take the surface away from a user who is mid-task on the strength of a transient failure.
- **The explicit lock is unreachable from the surface.** The overlay returns before the shell's chrome renders, so the Lock button does not exist while the manage surface is up.
- **The session has no expiry.** The audit's stated cause — a 15-minute session lifetime — is not a mechanism at all; that deadline is per held file, refreshed on every read, and its expiry surfaces as `stillHeld: false` rather than as a lock.

What remains are a poisoned session mutex and an unreadable clock. Both are process-level faults that leave every subsequent command returning `locked` until restart, so the discarded selection is the least of their consequences and neither is fixable at this surface.

**The reachable path is confirming.** `manage` failing with a lock does relock and discard the selection — but that is the correct behaviour, not the defect: the confirm has failed, the session is gone, and the user must unlock before anything can be added. Both behaviours are guarded, each confirmed non-vacuous by breaking the code beneath it: making the poll relock fails the first, and removing `fail`'s locked branch fails the second.

# Steps

- [x] Audit the surface against the running application, per [SURFACE_AUDIT.md](../../../../../../docs/plans/SURFACE_AUDIT.md) — every state, every interaction, the full finding set the owner asked for rather than the three named faults.
- [x] Research the prior art for a tree-picker surface with fixed chrome, per [docs/UX_RESEARCH.md](../../../../../../docs/UX_RESEARCH.md), and produce the design input.
- [x] The frame: the three-band full-window shape, fixed chrome, and the tree as the only scrolling region.
- [x] Every row that draws a pointer responds, and rows that cannot act stop claiming they can.
- [x] The scanning state and the surface's own failure state, which required the overlay to open before the scan.
- [x] Make the fixed frame actually hold: repair the height chain so the tree region is the only scrolling element and the header and footer stay in view. Reproduce first — the measurement above is the reproduction.
- [x] Drop the "an environment file" annotation, once its owning contracts agree where the change belongs.
- [x] The filter over the tree, with the binding behaviour [the research](_docs/tree-picker-research.md) states: matches on path, restores prior expansion exactly when cleared, and never touches selection.
- [x] The two channels as columns, with names truncating rather than wrapping, and the degraded state stating where the scan did not look.
- [x] Reproduce the relock that discards a live selection — pursued to a mechanism and closed: no reachable trigger discards a live selection, and the one path that does is the confirm failing, which is correct.

# Open threads

- **Whether a bare row click on a folder holding candidates should keep selecting them.** [The research](_docs/tree-picker-research.md) recommends moving all selection to the checkbox, on the grounds that a click which can queue a directory's secrets for encryption should require aiming at a checkbox rather than landing anywhere on a wide row. That is a good argument and it was not taken here, because the behaviour is asserted by three tests and changing it is a deliberate contract change rather than a defect fix. It wants settling on its own merits rather than as a side effect of closing the dead case.
Note that the filter thread this node shared with [adopting.md](../repo-layer/adopting.md) is closed on both sides: the filter is built, driven, and holds the two requirements that thread set.
