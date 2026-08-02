Part of [the repo-layer plan](README.md).

# Scope

The surface a user meets when adding a repository or rescanning a known one: the whole repository drawn as a tree, with what Seal proposes to cover marked on it. It owns the **tree primitive** both fidelities share — the row anatomy, the expansion model, the selection model, and the keyboard and assistive-technology contract — because this is the fidelity that exercises all of it. Out of scope: what the scan returns ([scan-shape.md](scan-shape.md)), the words on the surface ([vocabulary.md](vocabulary.md)), and the steady-state surface that reuses the primitive ([managed-view.md](managed-view.md)).

# What & why

This is the screen that decides whether the product reads as a layer. A user meets it once per repository, at the exact moment they are deciding whether to trust Seal with a credential — and today it shows them three flat lists of paths Seal chose, which is Seal's inventory rather than their repository. Replacing it with the repository itself, annotated, is the whole of [the parent concern](README.md) made concrete.

It is also where the concern's only genuinely dangerous interaction lives. Sealing a file that was meant to stay readable breaks the user's build, and a tree with folder checkboxes is one careless recursive select-all away from queueing a repository's entire source for exactly that.

# Approach

## The row, and its two channels

Every file and directory in the repository is a row, drawn at its real depth under its real parent. A row carries, left to right: an expansion twisty where it has children, a checkbox where it is selectable, its own name in monospace, and its state.

Two visual channels are kept strictly separate, because collapsing them into one is how these trees become unreadable:

- **Management state** uses the accent. It says what Seal proposes to cover.
- **Out of scope** is dimming, with no badge at all. It says a row is not currently Seal's business.

An undetected file is dimmed **and selectable** — the two are not in tension. Dimming is about attention, not permission: it says Seal has no opinion about this file, while the checkbox says the user may still have one. Detected files carry their classification as a per-row annotation stating why they were proposed, which is where the three groups that exist today go: dissolved into the rows they describe.

**Preselection is unchanged and stays conservative.** Only files the scan classified as genuinely secret are checked on arrival, exactly as [screens.md](../screens.md) requires; ambiguous and template files are visible, annotated, and unchecked. Over-inclusion here is the failure that breaks a build, so the default remains what is safe when accepted blindly.

## A folder's checkbox selects the detected files beneath it

This is the rule that guards against damage rather than confusion, and it is stated as a hard invariant: **a folder's checkbox selects the candidate files beneath it, recursively, and never every file beneath it.** Checking `src/` in a monorepo selects the secrets under it and leaves a thousand source files untouched.

Selecting an undetected file stays a one-click act on its own row, so the invariant costs the user nothing but the ability to make the mistake in bulk. That asymmetry is deliberate: the per-file route is easy because the user is naming one file, and the bulk route is bounded because the user is naming a directory whose contents they are not reading.

A folder therefore carries **three states, and all three are drawn differently from a file's**: none of its detected files selected, some of them, all of them. The middle state is what lets a branch stay collapsed without hiding a selection. A folder must never be drawn the way a selected file is drawn — a folder reflects its contents; it is not itself a thing Seal manages.

## Expansion is computed, and pruned directories do not expand at all

The window persists nothing, so expansion is derived on arrival rather than restored: **the union of the ancestor chains of every preselected file** is expanded, and everything else is collapsed. The view is therefore identical on every cold start, with no stale state to reconcile — the persistence constraint turns out to be a simplification.

**A collapsed directory renders no rows for its children.** This is what bounds the surface on a large repository, and it is the reason no cap, truncation, or virtualization is needed: [scan-shape.md](scan-shape.md) measured a real monorepo at 42,123 rows with a single directory holding 7,877 entries, and a collapsed directory costs exactly one row regardless of what is beneath it. Because expansion follows the candidates, the enormous directories in a repository like that are precisely the ones that stay shut — they hold no secrets, so nothing expands them, so their cost is never paid. The tree the user meets is the handful of branches leading to their secrets, with everything else one row each and one click away.

The rule that makes this hold: **children are rendered when their parent is expanded, never before.** A tree that builds every row and hides the collapsed ones with styling would pay the full 42,123-row cost invisibly, which is the failure this rule exists to prevent.

The directories the scan did not walk are drawn as rows, marked as not looked in, and are **inert and not expandable**. Showing them is what keeps the tree honest as a picture of the repository; refusing to expand them is what keeps that honesty from becoming an invitation into `node_modules`. The row is an answer, not a door. That a directory was skipped is a *state*, and [shell-layout.md](../shell-layout.md)'s boundary does not let a state collapse.

## Expansion and selection stay separate

The twisty expands; the row's checkbox selects; neither triggers the other. This was the sidebar's rule ([shell-layout.md](../shell-layout.md), and its `MEMORY.md` entry), and it outlived the sidebar because its reason is sharper here than it ever was there: conflating them makes it impossible to browse a branch without selecting it, which in this surface would mean browsing could queue files for encryption.

## The assistive-technology contract

The tree is a `tree` widget with multi-selection expressed through **`aria-checked` only**. `aria-selected` appears nowhere in it: the ARIA practices call a tree carrying both "extremely rare" and steer multi-select trees to `aria-checked`, and emitting `aria-selected="false"` on every row makes screen readers announce "not selected" on all of them.

Folders carry `aria-checked="mixed"` in their middle state. The keyboard model is the standard tree one: arrows move and expand, Space toggles the focused row's checkbox, Enter activates, with focus managed by a roving tabindex. This is now the product's only tree, so the model has no sibling to agree with and answers to the pattern itself.

## What the surface says, and how little of it there is

The primary action names the exact set it will act on and counts it, so the blast radius is legible before the click rather than after.

Everything else the surface wants to promise — that confirming encrypts nothing, that files stay where they are, that a rescan changes nothing already managed — lives behind **one toggletip on the title**, not as prose in the layout. That follows the prose rule in [the parent Approach](README.md): the surface is a heading, a path, a tree, and two buttons. A sentence explaining the tree would be evidence the tree had failed to explain itself.

# What exists

All of the Approach. The tree primitive lives beside the other shared components and is driven here by the manage surface, which no longer groups candidates into three lists: the repository is drawn as itself, every file selectable, each candidate carrying its reason on its own row.

The three-state folder is computed from the candidates beneath it rather than stored, so it cannot disagree with the selection it summarises. A pruned directory renders with no twisty at all, which is what makes it unexpandable rather than merely refusing to open.

Verified by the interface suite and by the `first-run` journey driven against a release build. Two load-bearing rules were confirmed non-vacuous by reintroducing the exact defect each prevents:

- a folder checkbox that selects every file beneath it rather than only the detected ones fails 2
- rendering a collapsed directory's children and hiding them with styling — which would pay the whole cost of a 42,000-row repository invisibly — fails 1

One defect was caught by the journey rather than by review, and it is the reason this plan's verification could not have stopped at unit tests: the boundary serialized `relative_path` where the interface read `relativePath`, so every field arrived `undefined` and **every file in the tree came back selected, template included**. Both sides' own suites passed throughout — each asserting against its own shape — and only the driven application showed it. The wire casing now has its own test, and the trap is recorded in the desktop `MEMORY.md`.

# What is missing

Nothing on this plan.

# Steps

- [x] The tree primitive: row anatomy, the two visual channels, expansion separate from selection, and the roving-tabindex keyboard model.
- [x] Computed cold-start expansion from the preselected files' ancestor chains, with a collapsed directory rendering none of its children.
- [x] The selection model, with the folder-scoping invariant and the three folder states.
- [x] Pruned directories as inert, unexpandable, marked rows.
- [x] The assistive-technology contract: `aria-checked` throughout, `mixed` on partially selected folders, and no `aria-selected` anywhere in the tree.
- [x] Replace the three-group candidate list with the tree, carrying each candidate's reason onto its row.
- [x] Tests, with each load-bearing rule confirmed non-vacuous by reintroducing the defect it prevents — the folder checkbox selecting every file beneath it, preselection widening past genuine secrets, selection also expanding, and a pruned directory becoming expandable.

# Open threads

- Whether a filter or search over the tree is needed. The breadth measurement in [scan-shape.md](scan-shape.md) removed the performance argument for one — lazy rendering bounds the surface on its own — so this is now purely about whether finding a known file among many collapsed branches is awkward enough to want it. That wants using the built surface rather than deciding on paper. If it arrives, a filter that expands to matches must restore the prior expansion when cleared, and must never touch selection.
- Whether path compression for single-child directory chains is worth it. VS Code ships it on by default and it shortens deep chains considerably; the complication is that a compressed row's checkbox has to have an unambiguous scope, which is a real question once folder checkboxes mean something specific.
