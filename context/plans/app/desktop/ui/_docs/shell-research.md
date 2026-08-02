# UX research: the application shell — sidebar, repository detail, and disclosure

Produced by following [the research procedure](../../../../../../docs/UX_RESEARCH.md). This document is the design input for the shell that hosts every screen in `ui/`. It sits beside [ux-research.md](ux-research.md), which researched the three surfaces themselves; this one researches **where those surfaces live and how the user moves between them**, which that document did not cover.

# Concern

Seal's screens exist but its **shell** does not. Today the application is a stack of full-screen replacements: a single scrolling column lists every repository with all of its files inline, and opening a file swaps the entire screen for an editor. There is no persistent navigation, no sense of place, and no way to see one repository without seeing all of them.

The surface to design is a **persistent left sidebar listing the registered repositories, with a detail surface for the selected one**. Everything else about the interface is open, under one governing principle stated by the product owner:

> The user should only see, or at least be pointed to, the UI that is most important on that screen at that time. Everything extra should be expandable, but collapsed by default.

That principle is **progressive disclosure**, and it is the yardstick every finding below is judged against.

## Constraints this shell cannot design around

Inherited from [the interface research](ux-research.md) and the layers beneath, and non-negotiable here:

- **The frontend never holds plaintext.** Values arrive masked; one crosses only on an explicit per-row reveal. No shell affordance may batch, preview, or aggregate secret values — a sidebar that previewed contents would defeat the architecture.
- **The window persists nothing.** The webview store is memory-only, so **no shell state survives a restart** — not sidebar width, not the selected repository, not which disclosures were left open. Every product surveyed below persists exactly these; here that is foreclosed, and the design must be good on a cold start every time.
- **Only env files are editable.** Every other managed file opens opaque.
- **The exposed-file alert is resolved, never dismissed**, and its chrome scales to the count including to zero.
- **Friction is spent exactly twice** — the first-seal acknowledgement and the password change. The shell must not add a third.
- **The visual family is already established** by the existing screens: dark, flat, one accent, monospace for paths, generous quiet. The shell mirrors it rather than introducing a second language.

## The tension this research must resolve

Progressive disclosure and the product's security posture pull in opposite directions on one axis. Disclosure says *hide what is not needed now*. Security says *an exposed secret must be impossible to miss*. A naive application of "collapse everything by default" would collapse the alert that the whole product exists to raise. The synthesis must state where disclosure stops.

# Sources surveyed

**Sidebar + detail shells.** Apple's `NavigationSplitView` is the reference implementation for this exact layout on the platform Seal targets first, and contributes the structural vocabulary: sidebar / content / detail as distinct columns, a toolbar-mounted sidebar toggle as the expected macOS affordance, user-resizable columns, `prominentDetail` versus `balanced` width behaviour, and — the finding most relevant to us — the explicit instruction that **the detail column must show helpful placeholder content when nothing is selected**, rather than rendering blank.

**1Password 8** is the closest analogue in kind: a sidebar of vaults over a list of items over an item detail pane, in a locked-vault security product. It contributes vault-creation directly from the sidebar, user-customisable sidebar sections and ordering, Collections for focusing a subset, and an overflow menu (an ellipsis) inside the item detail for the item's secondary operations — the disclosure pattern for per-object actions.

**GitHub Desktop** contributes a **negative** finding, and it is the strongest single piece of evidence for the shape being requested. It does *not* have a repository sidebar; it uses a dropdown switcher. Its own issue tracker carries sustained, repeated requests for exactly the sidebar Seal is about to build — a favourites sidebar with grouped pinning, a sidebar for repo switching, tabs instead of the dropdown — with users reporting that "jumping between repos is awkward when working on a few at the same time" and that scrolling and searching a dropdown becomes cumbersome once a small set of repositories is in active rotation. GitHub itself shipped a repository switcher into global navigation on the web in June 2026, conceding the same point. Separately, GitHub Desktop remains the reference for **degraded-state handling**: a missing repository stays in the list offering Locate / Clone / Remove rather than vanishing.

**Linear** contributes the discipline this product is being asked for, in its purest current form: a whitespace-heavy list with zero visual noise, where settings, filters and power features exist but are not visible until needed, and the project view is stripped to status, priority and assignee with nothing else competing for attention. It is the proof that "minimal" and "capable" are not in tension when disclosure is done well.

**Raycast** contributes a keyboard-first, near-textual interface aesthetic — 99% text, weight 500 as the body baseline, positive tracking on dark backgrounds — which is the register Seal's existing dark surfaces already sit in.

**Nielsen Norman Group** supplies the disclosure canon: progressive disclosure sequences information so the initial view communicates *what matters most*, deferring advanced or rarely-used features to a secondary view, making interfaces easier to learn and less error-prone **without removing capability for expert users**. Its tooltip guidance supplies the hard limits: never put information needed to complete a task in a tooltip; keep tooltips to self-sufficient microcontent; if the explanation needs multiple paragraphs it belongs on the page, not in a tooltip; support keyboard as well as mouse; and apply the pattern **consistently** across similar elements, because erratic use prevents discovery.

**Heydon Pickering's Inclusive Components** supplies the distinction that decides Seal's info-icon pattern outright: a **tooltip** labels or describes an ambiguous control and is appropriate as a last resort for icon-only buttons; a **toggletip** discloses supplementary information on explicit user action. Toggletips must **never** use `aria-describedby`, because a screen-reader user would then receive the information before pressing the button, making the button appear to do nothing; they use a live region populated on click instead. Decisively for a desktop app that may run on a touch-capable screen: **tooltips fail on touch**, because focus and active states coincide, while toggletips work across every input method.

**W3C / WCAG 2.2 SC 1.4.13** supplies the three obligations for any content revealed on hover or focus — it must be **dismissible** (closable without moving the pointer or changing focus, i.e. an Escape handler), **hoverable** (the pointer can move onto the revealed content without it vanishing), and **persistent** (it stays until dismissed, until the trigger is removed, or until it is no longer valid).

**Accessibility practice on hover-revealed controls** contributes the counterweight to over-applying disclosure. Hover-only affordances are undiscoverable — there is no universal signal that an element is hoverable, so users find them by accident or by hovering everything — and they exclude keyboard, touch and assistive-technology users outright. The rule that survives: anything revealed on `:hover` must be revealed identically on `:focus`, and the interface must be fully usable without hover at all. A real product (LibreChat) shipped a fix gating hover-reveal on hover *capability* rather than viewport width, which is the correct detection axis.

# Findings

## Tier 1 — table stakes for this shell

- **A persistent sidebar listing every registered repository, with single-selection driving the detail surface.** The requested shape, and the one GitHub Desktop's users have repeatedly asked it for. Absence of persistent navigation is what makes the current screen-replacement stack feel unfinished.
- **A non-empty placeholder in the detail pane when nothing is selected.** Apple states this explicitly. A blank right-hand two-thirds on every cold start reads as a broken window — and because Seal persists no selection, **every launch starts here**, which promotes this from polish to table stakes in a way it is not for the products surveyed.
- **The selected repository is unambiguously indicated**, and selection survives the operations performed inside it (sealing a file must not throw the user back to a neutral state).
- **Per-repository file listing with the state tag already specified** — sealed, readable, missing, unknown — carried from the existing research unchanged.
- **The exposed-file alert reachable from wherever the user is.** Already Tier 2 in the prior research as an ambient count; the sidebar makes it Tier 1, because a repository's exposure is now *off-screen by default* whenever another repository is selected. The shell created this problem and must solve it.
- **Every hover-revealed control equally revealed on keyboard focus**, and the interface fully operable without hover.
- **Keyboard reachability with a visible focus ring throughout**, carried forward.

## Tier 2 — strong, high-value for our surface

- **Toggletip disclosure (`aria-expanded` button + click) for every title-level explanation** — the "title + info icon" the product owner named. Chosen over a hover tooltip on the evidence above: it survives touch, it is keyboard-native, it preserves cause-and-effect for screen readers, and it can hold more than microcontent when a concept genuinely needs a sentence or two. Seal has several concepts that need exactly this: what *watched* versus *protected* means, why a candidate was classified as it was, what the recency warning can and cannot see, why a duplicate key is preserved.
- **An overflow menu for a repository's secondary operations**, following 1Password's ellipsis-in-detail pattern — so rescan, change per-repo password, and remove the repository are available without occupying the primary surface.
- **Counts on the sidebar row** as the compact state summary, so a repository's health is legible without selecting it. This is the one place the alert must not be collapsed (see the rule below).
- **A degraded repository stays in the sidebar** rather than disappearing, following GitHub Desktop — a repository whose folder has moved is a state to surface and act on, not to hide.
- **Sidebar collapsible to give the detail surface the full window**, with the toggle in the toolbar per platform convention.
- **A "readable" (unsealed) count treated as a neutral fact, not an alarm** — carried from the prior research's proportionality rule. A file the user deliberately never sealed is not a regression.

## Tier 3 — out of scope, with reasons

- **Persisting sidebar width, selection, expansion state, or ordering.** Every surveyed product does this; the memory-only webview forecloses it entirely. Recording it would require writing interface state to disk, which the window is deliberately configured to make impossible. Named here so it is not re-proposed as an oversight.
- **User-customisable sidebar sections, ordering, and Collections (1Password).** Real affordances for a user with dozens of vaults and a team. Seal is single-user and local, a user has a handful of repositories, and each of these needs persistence Seal cannot have.
- **A three-column split (sidebar / file list / file detail), as in Mail and Notes.** Tempting, and rejected: the third column would hold the env editor, whose rows are wide (name, masked value, reveal, copy, edit, delete) and would be crushed into a third of the window. Two columns with the editor taking the detail surface is the correct allocation for this content.
- **Repository search or filter in the sidebar.** Justified at GitHub Desktop's scale (every repo ever cloned); unjustified for the handful of repositories a person deliberately imports. Revisit if that assumption breaks.
- **Drag-and-drop reordering, pinning, favourites, grouping.** Same reason, plus all require persistence.
- **A command palette (Raycast, Linear).** A real accelerator, but it is an expert affordance for an application with many commands; Seal has a small, visible operation set, and a palette would be capability without a need.
- **Tabs for multiple simultaneously-open repositories.** Requested by GitHub Desktop's users because git operations are long-running and interleaved; Seal's operations are immediate, so the multi-context need does not arise.
- **Hover-only row actions.** The disclosure instinct points here and the accessibility evidence forbids it as the *sole* affordance. Row actions may de-emphasise until hover/focus, but must remain reachable and discoverable without a pointer.

# Best-practice rules

Cross-cutting invariants the build must honour. Rules 1–4 govern disclosure specifically and are the operative reading of the product owner's principle.

1. **Disclosure never hides an alert, a state, or a consequence.** Progressive disclosure defers *explanation and secondary action*. It never defers the fact that a secret is exposed, the state a file is in, or what an irreversible action will do. Anything the user must know to avoid harm is on the surface, always. This is the boundary that keeps the principle from turning against the product.
2. **Collapsed by default means collapsed for explanation, expanded for exception.** A repository with an exposed file does not open collapsed and quiet; the exception is what the surface is for. The default is calm because the normal case is calm, not because quiet is always preferred.
3. **Every disclosure is a real button carrying `aria-expanded`, never a hover target.** Toggletips over tooltips throughout: click/Enter/Space to open, Escape to dismiss, focus handled, content in a live region rather than `aria-describedby`. If content is nonetheless revealed on hover anywhere, it must satisfy SC 1.4.13 in full — dismissible, hoverable, persistent.
4. **Anything revealed on hover is revealed identically on focus, and nothing is reachable only by hover.** Detection is by hover *capability*, never by viewport width.
5. **Never put task-critical information in a disclosure.** If the user needs it to complete the task, it is on the page. Disclosures hold the *why*, not the *what*.
6. **Apply disclosure consistently across similar elements.** An info affordance on some titles and not others prevents discovery of all of them; the pattern must be predictable enough that its absence is meaningful.
7. **The detail pane is never blank.** With nothing selected it states what to do; with an empty repository it states what that means and offers the action.
8. **Selection is stable across operations.** No operation inside a repository may silently reset the selection, and no refresh may reorder the sidebar under the user's pointer.
9. **The shell adds no new friction.** No confirmation, no gate, no modal that the existing plans did not already justify; the friction budget is spent.
10. **State language stays consistent with the established vocabulary** — sealed / readable / not found — across sidebar, detail, and alert, so the same file never has two names for one condition.

# Synthesis / proposal

## What to build

**A two-column shell.** A persistent left sidebar of repositories; a detail surface on the right showing the selected repository. The sidebar collapses to give the detail surface the whole window. Neither column's geometry is remembered across launches, so both must be right by default.

**The sidebar row** is the repository's name, its path de-emphasised beneath, and a compact state summary. The summary is the one element exempt from collapsing: a repository holding an exposed file says so in the sidebar, because the alert must be reachable from wherever the user is and the sidebar is the only element always present. Everything else about a repository — its operations, its explanations — lives in the detail surface or behind that row's disclosure.

**The detail surface** is the repository: its files with their state tags, the operations that apply to them, and the alert if it has one. Its title carries the toggletip explaining watched-versus-protected, which is the distinction [the protect-a-repo journey](../../../../../journeys/protect-a-repo.md) requires be obvious without explanation. Secondary repository operations sit behind an overflow control rather than on the surface.

**With nothing selected**, the detail surface is the import call to action — which is also the empty state for the whole application, so the two collapse into one surface rather than being designed twice.

**The env editor takes the detail surface** rather than replacing the window, so the sidebar stays present and the user keeps their place. This preserves the current editor unchanged; only its container moves.

## Load-bearing versus rounding out

Load-bearing — the shell is not itself without these: the persistent sidebar with stable single selection; the never-blank detail pane; the state summary in the sidebar row carrying the alert off-screen; the toggletip pattern with its `aria-expanded` contract; hover-reveal never being the sole affordance.

Rounding out — cut first without losing the essence: the sidebar collapse toggle, the overflow menu grouping (the operations can sit flat until there are enough to warrant grouping), counts beyond the alert count, and the de-emphasis-until-hover treatment on row actions.

## Out of scope, carried forward

Everything in Tier 3 with its reasons. The two most likely to be re-proposed are **persisting the selection or sidebar width** — foreclosed by the memory-only webview, not an oversight — and **a three-column split**, refused because the env editor's row width needs the detail surface whole.

# Open threads

- Whether the sidebar's state summary is a count, a dot, or a word. All three appear in the surveyed products; the choice wants seeing against real repository names at real widths rather than deciding on paper.
- Whether a repository with no exposed files shows any summary at all, or nothing. Rule 3 of the prior research (scale chrome to the count including zero) argues for nothing; legibility of "this repository is fine" argues for something quiet.
- What the detail surface shows for a repository whose folder has moved. GitHub Desktop's Locate / Clone / Remove is the reference, but Seal's equivalents are not yet defined and this state is not yet reachable in the product.
