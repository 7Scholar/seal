Part of [the interface plan](README.md).

# Scope

The application's **shell**: the persistent frame that hosts every screen, and the navigation between them. A left sidebar listing the registered repositories; selecting one opens that repository's detail surface. Out of scope: the screens' own internals, which their existing plans own unchanged — the import flow ([screens.md](screens.md)), the environment-variables editor ([screens.md](screens.md)), the unlock gate ([first-open.md](../first-open.md)), the supervised password change ([password-change.md](password-change.md)), and the failure surface ([errors.md](errors.md)). This plan decides **where those surfaces live and how a user moves between them**, not what happens inside them.

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

TBD — blocked on the design forks in [QUESTIONS.md](QUESTIONS.md).

The research is complete and its recommendations are on record, but four of the decisions it surfaced are the user's rather than the researcher's: they determine the shell's defining shape (two columns or three), whether the editor keeps the sidebar, whether bulk sealing exists at all, and how removing a repository is offered. Each is stated neutrally in `QUESTIONS.md` with its plausible directions. The Approach is written once they are answered.

# Steps

- [x] Research the prior art and fix the behavioural rules — [shell-research.md](_docs/shell-research.md).
- [x] Inventory the operations and assign each a scope and a disclosure posture — [shell-operations.md](_docs/shell-operations.md).
- [!] blocked — awaiting answer in QUESTIONS.md: settle the four design forks, then write the Approach.
- [ ] Build the shell: the sidebar, the detail surface, and the navigation between them.
- [ ] Build the disclosure primitive (the toggletip) and apply it consistently.
- [ ] Re-home the existing screens into the shell without changing their internals.
- [ ] Tests, with each load-bearing rule confirmed non-vacuous.

# Open threads

- Whether the sidebar's per-repository state summary is a count, a dot, or a word. All three appear in the surveyed products; wants seeing at real widths with real repository names rather than deciding on paper.
- Whether a repository with nothing exposed shows a quiet summary or nothing at all. The scale-chrome-to-zero rule argues for nothing; legibility of "this one is fine" argues for something.
- What the detail surface shows for a repository whose folder has moved. GitHub Desktop's Locate / Clone / Remove is the reference; Seal's equivalents are undefined and the state is not yet reachable in the product.
