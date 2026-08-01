Part of [the interface plan](README.md).

# Scope

The application's **shell**: the persistent frame that hosts every screen, and the navigation between them. A left sidebar listing the registered repositories; selecting one opens that repository's detail surface. Out of scope: the screens' own internals, which their existing plans own unchanged — the manage flow ([screens.md](screens.md)), the environment-variables editor ([screens.md](screens.md)), the unlock gate ([first-open.md](../first-open.md)), the supervised password change ([password-change.md](password-change.md)), and the failure surface ([errors.md](errors.md)). This plan decides **where those surfaces live and how a user moves between them**, not what happens inside them.

Also in scope, because it cannot be separated from the shell: the **information architecture** governing what is shown versus what is collapsed, across the whole interface.

# What & why

The screens exist; the shell does not. Today the interface is a stack of full-screen replacements — one scrolling column lists every repository with all of its files inline, and opening a file swaps the entire screen for an editor. There is no persistent navigation, no sense of place, and no way to look at one repository without looking at all of them. A user with four repositories has no way to work in one.

What is wanted is a **persistent left sidebar of the registered repositories, with a detail surface for the selected one** — the shape the surveyed products converge on, and the one GitHub Desktop's users have repeatedly asked it for in its absence.

Governing the rest of the interface is one principle, stated by the product owner:

> The user should only see, or at least be pointed to, the UI that is most important on that screen at that time. Everything else that is extra should be expandable, but collapsed by default.

That is progressive disclosure, and applying it is as much of this concern as the layout is. The named exemplar — a title that needs a longer explanation becomes a title plus an info affordance that discloses on demand — generalises to every explanation, every secondary action, and every elaboration in the product.

The concern matters beyond tidiness for two reasons. First, the current shape does not scale past a couple of repositories, and the product's whole premise is that it spans **all repos on the machine**. Second, disclosure and this product's security posture pull against each other on one axis: a naive "collapse everything" would collapse the exposed-secret alert that the product exists to raise. Where disclosure stops is therefore a design decision this concern must make explicitly rather than discover by accident.

The two research documents that are this plan's design input are written: [shell-research.md](_docs/shell-research.md) surveys the prior art and fixes the behavioural rules, and [shell-operations.md](_docs/shell-operations.md) inventories every operation the application can perform and assigns each a scope, a home, and a disclosure posture.

# Approach

Built from [shell-research.md](_docs/shell-research.md) and [shell-operations.md](_docs/shell-operations.md), which are the design input; this Approach states what follows from them and from the four decisions the product owner settled.

The shell is a **persistent two-column frame under a title bar**: a navigation sidebar on the left that is present for the whole unlocked session, and a detail surface on the right that shows whatever is selected. Nothing inside the frame ever replaces the window. The screens the other plans own are re-homed into the detail surface unchanged; what this plan fixes is the frame, the selection model, and the disclosure architecture.

## The title bar is the session's strip, and it spans both columns

The window's own title bar is the shell's top row rather than dead platform chrome — the window is configured to let the interface draw there ([shell.md](../shell.md)). It spans the full width above both columns, carries the product name at the leading edge after the inset the platform's own window controls occupy, and holds the two **session-scoped** controls at the trailing edge: **Lock**, and the overflow disclosing the master-password change.

Those two belong there because they are the only controls whose scope is the whole session rather than a repository or a file, and the title bar is the one strip that is neither the sidebar nor any repository's surface. Putting them anywhere inside the frame made a surface answer for something that was not its subject. Lock keeps its always-visible, never-collapsed posture ([shell-operations.md](_docs/shell-operations.md)) — the strip is quiet, not hidden — and it is labelled **Lock**, since the strip is unambiguously the application's own and a control there needs no product name to say what it locks.

The strip is deliberately short. It carries no repository state, no alert, and no primary verb of its own, so it stays a thin band rather than a second header competing with the detail surface's title. The unfinished-password-change banner is **not** in it: that banner is a consequence that must not be compressed, so it renders at the top of the detail column where its subject lives, and renders nothing at all when there is nothing to resume.

## The sidebar is a two-level tree, and the tree is the disclosure

The sidebar lists every registered repository. A repository **expands to reveal its managed files**, and is collapsed by default. This is the governing principle applied to navigation itself: the repository name is what matters at rest, its files are the elaboration, and expanding is the user asking for them.

Two levels, and never a third. The tree shows repositories and their managed files — never directories, never unmanaged files — because the sidebar navigates *what Seal manages*, not the user's filesystem. A managed file nested deep in a repository shows its path relative to the repository root on one line rather than as a folder chain.

**Both levels are selectable, and selection is what drives the detail surface.** Selecting a repository shows the repository; selecting a file shows that file. This makes a file reachable in one click from anywhere without first selecting its repository, which is the point of the two-level shape.

**Expansion and selection are separate.** Clicking a repository's name selects it; clicking its twisty expands it. Neither implies the other — selecting a repository does not force its files open, and expanding one does not change what the detail surface shows. Conflating them is the common failure of tree sidebars: it makes it impossible to look at a repository's summary while its file list is collapsed, and impossible to browse a file list without navigating away from what you were reading. The keyboard follows the same split: arrow keys move and expand, Enter selects.

Because [the window persists nothing](../README.md), the tree's state is decided fresh on every launch rather than restored. The default is **every repository collapsed, nothing selected** — except that a repository holding an exposed file starts expanded, since rule 2 of the research says the exception is what the surface is for.

## What the sidebar row says without being expanded

A repository's row carries its name, and a **state summary** that is the one element in the sidebar exempt from collapsing. The sidebar is the only element present on every screen, which makes it the only place an alert about a repository the user is *not* looking at can live — and the shell created that problem by making other repositories off-screen by default.

The summary states exposure and nothing else: a repository with exposed files says so, and a repository without them says nothing at all. Chrome scales to the count including to zero, so a healthy registry is a quiet list of names. A file row inside the tree carries its own state tag in the established vocabulary — sealed, readable, not found — since a file's state is a fact, and facts do not collapse.

## The detail surface, and its three modes

The detail surface is never blank. It shows one of three things:

**Nothing selected** — the add call to action. This is also the empty state for the whole application, so the two are one surface rather than two designs: with no repositories it is the only thing on screen, and with repositories it is what a launch lands on until something is selected.

**A repository selected** — the repository's files with their states, its exposure alert if it has one, and the operations that act on the repository. Its title carries the toggletip explaining watched versus protected, which [the protect-a-repo journey](../../../../journeys/protect-a-repo.md) requires be obvious without explanation.

**A file selected** — the environment-variables editor for an env file, or the opaque statement for anything else, both exactly as [screens.md](screens.md) specifies them. The sidebar stays. Opening a file is navigation, not a mode: there is no "back", because the user never left.

## Selection is stable, and operations do not move it

No operation changes the selection except the user selecting something else, and one deliberate exception: **a completed add selects the newly added repository**, because that is where the next action lives and landing the user anywhere else would strand them. Sealing a file, releasing a file, saving, revealing, and refreshing all leave the selection exactly where it was, and a refresh never reorders the tree under the pointer.

Two consequences that are easy to get wrong. A file that stops being managed while selected — released, or gone from disk — leaves the detail surface showing a file that no longer exists; selection falls back to its parent repository rather than to nothing, so the user lands one level up rather than at the empty state. A repository that disappears the same way falls back to nothing selected.

## Selecting files to seal, and sealing them together

Sealing several files at once is offered, and it is **explicit selection followed by one action** rather than a seal-everything button. The repository surface allows selecting any subset of its readable files; the seal action then applies to exactly that set, named in full before it runs.

The safety properties the per-file path already has are not weakened by the batch. The set is stated explicitly, so no file is ever sealed that the user did not pick. The irreversibility acknowledgement gate is unchanged — it is per-registry and fires once, before the first seal of any kind. The recency warning is per-file and still fires per file: if any file in the set was modified moments ago, the confirmation names those files specifically rather than warning generically about the batch.

**A batch seal is not atomic, and the interface must not imply it is.** Each file seals independently; a failure on one does not roll back the others and does not stop the rest. The outcome reports what sealed and what did not, per file with its reason — answering which files are now protected and which still need attention, never a bare count. This mirrors the password change's rule about partial runs, for the same reason: a half-done security operation reported as a number is how a user ends up believing something is protected when it is not.

This is the one place the shell adds Rust scope rather than only re-homing what exists. The command surface takes a batch seal that accepts a list of paths, checks every one against the registry as [commands.md](../commands.md) requires of every path-taking command, and returns a per-path outcome. It is a distinct command rather than a loop in the interface, because the interface looping would make the acknowledgement gate and the per-path registry check the interface's responsibility, and both are deliberately enforced in Rust where the interface cannot forget them.

## Removing a repository

Stopping management of a whole repository is offered as one operation on the repository, behind the overflow control with the other secondary operations. It states its consequences once rather than once per file, and it carries the same choice the per-file release does — leave the files readable at their paths, or leave them sealed — with no default that silently decrypts. Removing a repository never deletes a file from disk, which the dialog states rather than assumes.

It is destructive and irreversible in the sense that matters to a user, so it names the repository and states the file count. It does **not** get a typed-phrase gate: that friction is spent exactly twice, on the first-seal acknowledgement and the password change, and spending it a third time is what degrades all three into reflex.

## The disclosure architecture

The principle governing the whole interface — only what matters now is shown, everything else expandable but collapsed — resolves into three rules, and one boundary.

**Explanation always collapses.** Every "why is this like this" is a toggletip: what watched versus protected means, why a scan candidate was classified as it was, why a duplicate key is preserved, what the recency warning can and cannot see.

**Secondary and destructive actions collapse into an overflow control.** Rescan, remove the repository, change the master password. Collapsing these puts distance between a reflex and a consequence.

**State, alerts, and primary verbs never collapse.** Seal, open, lock, add, the exposure alert, the resume banner, every file's state tag.

The boundary, which is the rule that keeps the principle from turning against the product: **disclosure defers explanation and secondary action; it never defers an alert, a state, or a consequence.** Anything the user needs in order to avoid harm is on the surface, always. A naive reading of "collapse everything by default" would collapse the exposed-secret alert this product exists to raise, and that reading is wrong here.

## The disclosure primitive is a toggletip, not a tooltip

Every collapsed explanation is the same component, and it is a **button carrying `aria-expanded`** that discloses on click, Enter or Space, dismisses on Escape, and closes on an outside click. Its content goes into a live region populated when it opens.

It is deliberately **not** a hover tooltip and deliberately **not** wired with `aria-describedby`. A screen-reader user given the content through `aria-describedby` receives it before pressing the button, so pressing it appears to do nothing — the cause-and-effect the control exists to express is destroyed. Hover tooltips additionally fail outright on touch, where focus and active coincide. The toggletip works identically across pointer, keyboard and touch, which is why it is the single pattern used everywhere rather than one of two.

Applied consistently: an information affordance on some titles and not others prevents discovery of all of them, so its absence must be meaningful rather than incidental.

## What may never be revealed only by hover

Row-level actions may de-emphasise until hover, and doing so is how the file rows stay quiet. Two rules bound it. Anything revealed on `:hover` is revealed identically on `:focus`, so a keyboard user sees exactly what a pointer user sees. And nothing is reachable **only** by hover — hover-revealed affordances are undiscoverable, since no visual convention announces that an element is hoverable, and they exclude keyboard, touch and assistive-technology users entirely. Where hover-reveal is used, detection is on hover *capability*, never on viewport width.

# What exists

All of the Approach. The shell is the frame the application runs in: the two-level sidebar, the detail surface with its three modes, the selection model with its fallbacks, the toggletip and overflow disclosures, the batch seal, and repository removal. Every existing screen was re-homed into the detail surface with its internals untouched.

Thirty-eight interface tests across the sidebar, the detail surface, the toggletip and the shell itself, alongside the four Rust tests the batch seal added. The shell's own tests drive the composed application rather than a component in isolation, which is what proves the sidebar actually survives opening a file rather than each piece being correct alone.

Five load-bearing guards were confirmed non-vacuous by reintroducing the exact defect each prevents:

- describing the toggletip's trigger with `aria-describedby` instead of carrying state in `aria-expanded` — the shape that makes the button a no-op for a screen-reader user — fails 2 tests
- making selection also expand, conflating navigation with disclosure, fails 1
- sealing every readable file instead of the chosen set fails 2
- reporting a bare count instead of naming each failed file and why fails 1
- removing the acknowledgement gate fails 1 on the batch path, confirming the gate holds for a batch rather than only for a single file

One defect was caught by a test rather than by review, and it is the same defect this plan group caught once before: the batch report and the toggletip both claimed `role="status"`, leaving two competing live regions on one surface. The toggletip now claims the role only while open.

# What is missing

Nothing on this plan. The journey harness drives this layout end to end: the first-run journey passes all eight checks against a release build carrying it — establishment through the shield, the add into the sidebar tree, the acknowledged seal, and the lock cycle. (A bridge that fails to *start* is a stale harness binary, not the harness defect — [docs/RUNNING.md](../../../../../docs/RUNNING.md) covers it; [journey-harness.md](../journey-harness.md)'s open defect is a mid-run freeze in the extended scenario only.)

# Steps

- [x] Research the prior art and fix the behavioural rules — [shell-research.md](_docs/shell-research.md).
- [x] Inventory the operations and assign each a scope and a disclosure posture — [shell-operations.md](_docs/shell-operations.md).
- [x] Settle the four design forks and write the Approach.
- [x] The toggletip primitive, with its `aria-expanded` contract and dismissal behaviour asserted separately.
- [x] The sidebar: the two-level tree, expansion separate from selection, the state summary, and the keyboard model.
- [x] The detail surface with its three modes, and the selection model with its fallbacks.
- [x] Re-home the existing screens into the detail surface without changing their internals.
- [x] The batch seal: the Rust command with its per-path registry check and per-path outcome, and the selection surface that drives it.
- [x] Removing a repository as one operation, with its disk-consequence choice.
- [x] Tests, with each load-bearing rule confirmed non-vacuous.

# Open threads

- Whether the sidebar's per-repository state summary is a count, a dot, or a word. All three appear in the surveyed products; wants seeing at real widths with real repository names rather than deciding on paper.
- Whether a repository with nothing exposed shows a quiet summary or nothing at all. The scale-chrome-to-zero rule argues for nothing; legibility of "this one is fine" argues for something.
- What the detail surface shows for a repository whose folder has moved. GitHub Desktop's Locate / Clone / Remove is the reference; Seal's equivalents are undefined and the state is not yet reachable in the product.
