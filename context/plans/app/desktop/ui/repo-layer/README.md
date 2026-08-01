# Intent

## What & why

**Making the product read as a layer over an existing repository rather than a tool that extracts files into itself.**

Seal's premise is that secret files stay where they are: sealed in place, at their own paths, inside the user's own repository. The interface does not yet say that. Today a repository enters through a screen headed *Import*, which scans and then presents three flat checkbox lists of the paths it judged interesting — secret, ambiguous, template — and nothing else about the repository is ever shown. Everything the user sees at that moment is a list Seal wrote, so the act reads as picking files out of a repository and handing them over. The product owner states the gap directly: it feels like hand-picking files and extracting them into Seal, when it should feel like *"in this repository, Seal manages these files and has sealed this subset of them."*

The gap is not decoration. It is the difference between a user believing Seal holds their secrets and understanding that Seal covers files their repository still owns — and that belief governs whether they trust the tool with the only copy of a credential. It also shapes what they expect on the way out: a user who thinks Seal took the files expects to get them back, while a user who understands Seal covered them in place already knows the files never went anywhere.

Two things are known to be wrong today, and both are in scope:

- **The scan's product is a list, not a view of the repository.** A flat list of paths divorced from the directory structure is an inventory, and an inventory is what reads as extracted. Every tool that succeeds at this framing positions managed files inside the user's own tree.
- **The flow's verb is `Import`.** It is the one word in the product on the wrong side of the line; the rest of Seal's vocabulary — *manage*, *stop managing*, *release*, *seal* — is already layer-flavoured.

Done means a user who has never seen Seal opens a repository, recognises it as *their repository*, sees what Seal proposes to cover and what it is leaving alone, and can state afterwards — without being told — that their files did not move.

The concern is **cross-cutting by construction.** Its surface is the interface's, but it cannot be satisfied without changing what the scan returns: `scan_folder` yields `Vec<Candidate>` today, and a view of the repository needs directories, non-candidate files, and nesting. That Rust scope belongs to [the registry](../../../registry.md) and [the lifecycle plan](../../lifecycle.md), and this plan pulls it in the way [shell-layout.md](../shell-layout.md) pulled in the batch seal — named here, designed with the surface that drives it, because splitting the seam from its consumer is what makes a seam guess wrong.

## Approach

Settled against the four forks, whose answers are the design input this states the consequences of. The governing idea: **one tree, seen at two fidelities.** Adopting a repository and living with one are the same view of the same thing, differing only in how much of the repository is drawn — which is what makes Seal read as a layer rather than as a place files go.

### The repository is the substrate; management is an annotation on it

Every surface that talks about a repository draws the repository's own directory structure, with Seal's state as a mark on the rows. Nothing is ever presented as a list of paths divorced from the tree, because a flat list is an inventory and an inventory is what reads as extracted.

The two fidelities:

**Adopting or rescanning — the whole repository.** Every file and directory is drawn. Files Seal did not detect are dimmed and quiet but **individually selectable**: a user whose secret sits under a name the scan does not recognise checks its row where it sits, with no secondary picker and no separate mode. Detected files carry a checkbox and the selected treatment, preselected exactly as [screens.md](../screens.md) specifies — genuine secrets only, never the ambiguous or template classifications.

**Living with it — only what Seal manages.** The same tree drawn over the managed set alone, which collapses it to a handful of rows. This replaces the flat file list on the repository detail surface, so a managed file is seen in its real directory context there too, rather than as a path string on a row.

The scan's classification survives as a **per-row annotation** — each candidate still states why it was proposed — rather than as the three top-level groups that exist today. Dissolving the grouping is most of what dissolves the extraction feeling: grouping by Seal's judgement makes the screen Seal's list, while the tree makes it the user's repository with Seal's judgement written on it.

### A folder check never means "everything beneath"

Folders are selectable, and a folder's checkbox selects **the detected files beneath it, recursively — never every file beneath it.** This is the one rule in this concern that guards against damage rather than confusion, and it is load-bearing in the same sense [screens.md](../screens.md) means: sealing a file that was meant to stay readable breaks the user's build, and a folder checkbox that swept up source files would make that a single click on a monorepo's `src/`. Selecting an undetected file remains possible and easy — one click on its own row — so the guarantee costs the user nothing except the inability to do it a thousand at a time.

A folder therefore carries **three visual states, all distinct from a file's**: nothing selected beneath it, some selected beneath it, and all of its detected files selected. The middle state is the aggregate marker that lets branches stay collapsed without hiding a selection, and it must never be drawn the way a selected file is drawn — a folder is a container reflecting its contents, not a thing that is itself managed.

### What Seal does not look in is shown, and says so

The pruned directories — the build outputs and dependency trees the scan deliberately skips — appear in the tree as rows, collapsed, **inert and not expandable**, marked as not looked in. A tree that silently omitted them would not be the repository, and the user could not tell a deliberate skip from a miss. Making them non-expandable is what keeps that honesty from turning into an invitation to open `node_modules`: the row is an answer, not a door.

This is disclosure's boundary applied exactly as [shell-layout.md](../shell-layout.md) draws it — the fact that a directory was skipped is a *state*, and states do not collapse.

### Cold-start expansion is computed

The window persists nothing, so the expansion set is derived rather than restored: the union of the ancestor chains of every preselected file, expanded, and everything else collapsed. The constraint turns out to be a simplification — the view is deterministic on every launch, and there is no stale expansion state to reconcile.

### The vocabulary retires *import*

*Import* names pulling something in from outside; adopting something already in place is *manage*. The word is retired **everywhere** — the control, the headings, the confirm button, and the command name behind them — so it cannot leak back through a future surface that reads the command name and mirrors it. The rest of the product's vocabulary is already correct and stays: *manage*, *stop managing*, *release*, *seal*.

The tell to audit against is the preposition: *into* extracts, *in* layers. Nothing in this concern's copy says files go *into* Seal.

Two assurances sit together at the point of confirmation, because they answer the two different fears a user has at that moment: the existing statement that confirming encrypts nothing, and the one no surveyed tool states outright — **files stay where they are; nothing is moved, renamed, or copied.**

### What this pulls in beneath the interface

The scan's product changes shape. `scan_folder` returns candidates today; the surface above needs the repository's structure — directories, undetected files, nesting, and which directories were pruned — with each candidate's existing classification and reason carried on the rows that have one. That is [the registry's](../../../registry.md) concern and [the lifecycle plan's](../../lifecycle.md), pulled in here rather than guessed at, the way [shell-layout.md](../shell-layout.md) pulled in the batch seal.

One constraint is inherited and non-negotiable, recorded as measured in the root [MEMORY.md](../../../MEMORY.md): **the walk does not respect gitignore rules**, because secret files are gitignored precisely because they are secret. A file's ignored status may be *displayed*; it must never filter the walk.

The frontend still never receives file contents. The tree carries paths, structure, and state — nothing else.

### Where the sidebar's rule lands

The sidebar's *two levels, never a third* rule is **scoped to the sidebar** rather than overturned. The sidebar answers "what is the state of what Seal covers, across every repository" and stays flat and quiet; this concern's surfaces answer "what does Seal cover in this repository" and are trees. The rule was written about navigation, and it keeps holding there.

# Plans

- [x] vocabulary.md -> retiring the word *import* everywhere, and the assurance that files do not move
- [x] scan-shape.md -> what the scan hands the interface: the repository's structure rather than a candidate list
- [x] adopting.md -> the whole-repository surface, and the tree primitive both fidelities share
- [x] managed-view.md -> the steady-state surface: the same tree over the managed set alone

The split follows the seam the Approach names. `vocabulary.md` depends on nothing and can land first — it is most of the framing fix and touches no tree. `scan-shape.md` is the seam beneath both surfaces. `adopting.md` owns the tree primitive because it is the fidelity that exercises all of it, and `managed-view.md` reuses that primitive rather than building a second tree.

# Cursor

**Complete.** All four children are built and verified: the vocabulary retired, the scan returning the repository's structure, the whole-repository surface with its tree primitive, and the steady-state surface reusing it. The product now reads as a layer — a user meets their own repository with Seal's judgement marked on it, rather than a list Seal wrote.

The design forks were settled by the product owner, and the measurement that opened `scan-shape.md` settled the rest: 42,123 rows in 0.09 seconds on a real monorepo, which kept the scan one-shot and moved the bound onto the rendering, where a collapsed directory costs one row.

Three guards were confirmed non-vacuous by reintroducing the exact defect each prevents: a folder checkbox selecting every file beneath it rather than only the detected ones, rendering a collapsed directory's children and hiding them with styling, and omitting pruned directories rather than marking them.

**One defect was caught only by driving the built application**, which is the whole argument for the journey axis: `rename_all` on a Rust enum renames its variants and not their fields, so the boundary sent `relative_path` where the interface read `relativePath`. Every field arrived `undefined` and every file in the tree came back selected — the template included, which is precisely the over-inclusion that breaks a user's build — while both sides' own suites passed throughout. The wire casing now has its own test and the trap is in the desktop `MEMORY.md`.

## Prose is a last resort, not a layout element

Stated by the product owner while this concern was being built, and it governs every surface here: **if the interface needs a sentence to explain itself, the interface is insufficient.** Subtitles, ledes, and explanatory paragraphs sitting in the layout are not allowed. Full sentences are permitted in exactly two places — inside an info affordance the user chose to open, and in a confirmation for a destructive act, where the sentence states the consequence or the constraint.

This is the disclosure architecture ([shell-layout.md](../shell-layout.md)) tightened one notch: that rule says explanation always collapses, and this says the collapsed thing must also be genuinely explanatory rather than a paragraph that survived by being moved. Applied here, the manage surface carries a heading, a path, and a tree, with everything Seal wants to promise about not encrypting and not moving files behind the one toggletip on its title.

# Open threads

- Whether a tri-state folder checkbox is announced usefully by real screen readers. `aria-checked="mixed"` is well defined on a native checkbox and less certain on a tree row; it wants driving with VoiceOver before the middle state is relied on as the only carrier of "something is selected below here". Lands with [adopting.md](adopting.md)'s assistive-technology step.
- Whether the managed-only fidelity should offer a way to see the rest of the repository from where it stands, rather than only through a rescan. Carried by [managed-view.md](managed-view.md), which wants both surfaces built and comparable before deciding.
