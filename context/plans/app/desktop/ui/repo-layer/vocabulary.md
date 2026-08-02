Part of [the repo-layer plan](README.md).

# Scope

Retiring the word **import** from the product, and adding the assurance that names what sealing does not do. Out of scope: the tree itself and everything about how a repository is drawn — those are [scan-shape.md](scan-shape.md) and the two fidelity plans. This plan changes words, not structure, which is why it can land before any of them.

# What & why

*Import* names pulling something in from outside. Adopting something that is already in place is *manage* — a distinction chezmoi holds deliberately, reserving "import" for external sources and "add"/"manage" for files already on disk. Seal's vocabulary is otherwise already on the right side of this line: *manage*, *stop managing*, *release*, *seal* all describe something done to a file where it lies. The one exception is the flow that brings a repository in, which was called *Import* at every level from the interface's own control down to the Tauri command name.

Both surveys behind [the parent Approach](README.md) landed on this independently, and it is the cheapest part of this concern by a wide margin: it touches no tree, no scan, and no Rust logic beyond a rename. It is carved separately precisely so it can land first — the framing improves immediately while the larger surfaces are still being built.

The audit test is the preposition. *Into* extracts, *in* layers: "add files **into** Seal" describes a container that now holds them, while "seal files **in** your repository" describes a layer over files that never moved. Nothing this product says may put Seal on the receiving end of *into*.

# Approach

**The word is retired everywhere, including the command name.** The interface's add control, the flow's heading, the confirm button, the accessible names, and the `import` Tauri command and its Rust function all lose it. Renaming only the visible copy would leave the retired word live at the boundary, where the next surface to read the command name mirrors it back into the interface — which is exactly how a retired vocabulary returns. The rename reaches the interface's typed command module, the command registration, and the lifecycle function behind it, so no layer still calls the operation by the old name.

The replacement verb is **manage**, matching what the rest of the product already says about the same relationship. A repository is *added* to Seal's view of the machine; its files are *managed*.

**The assurance gains its missing half.** The confirmation already states that confirming encrypts nothing, which answers "will this change my files right now". It does not answer the different fear a user has at the same moment — whether the files are about to become Seal's rather than theirs. So a second statement sits beside the first: **files stay where they are; nothing is moved, renamed, or copied.** No surveyed tool states this outright, and it is the single highest-value sentence available to this concern. The two are adjacent because they answer two different questions, and either alone leaves one of them open.

Both statements are plain assertions on the surface, never collapsed behind a disclosure. They are the reassurance the flow exists to give, and [shell-layout.md](../shell-layout.md)'s boundary puts a consequence on the surface rather than behind an affordance.

# What exists

All of the Approach. The word is gone from every layer: the screen is `ManageFlow`, headed **Seal in `<path>`**; the add control is **+ Add repository** and the empty state says nothing has been added yet; the empty-state call to action is **Add a folder**; and the boundary command is `manage`, backed by `lifecycle::manage`. The confirm button already counted its files and still does.

The assurance now carries both halves — that confirming encrypts nothing, and that files stay where they are with nothing moved, renamed, or copied — each asserted by its own test so neither can be dropped as incidental.

The prose sweep reached what a literal identifier search would have missed, which is the point of the rule: the registry's walk is now the **candidate scan** rather than the import scan, the root intent's third fact describes a *manage flow*, and the two `MEMORY.md` entries that named the flow were rewritten. The research documents under `_docs/` keep the historical word, because they record a survey taken at a time when that was the product's vocabulary; rewriting them would falsify the record rather than update it.

Verified by the interface suite, the Rust suite, and the `first-run` journey driven end to end against a release build — the last of which is what proves the renamed command actually works in the real webview rather than only in tests.

# What is missing

Nothing on this plan.

# Steps

- [x] Retire *import* from the interface copy: the add control, the flow heading, the confirm button, and every accessible name that carries it.
- [x] Retire it from the boundary: the typed command module, the Tauri command registration, and the lifecycle function behind it.
- [x] Add the "files stay where they are" assurance beside the existing "encrypts nothing" statement.
- [x] Sweep the plan prose for the retired vocabulary, per the rename rule in [UI_IMPROVEMENTS.md](../../../../../../docs/plans/UI_IMPROVEMENTS.md) — a rename retires concept words, not only identifiers, so the sweep is case-insensitive and covers plans that describe the flow without naming the function.
- [x] Tests: the flow's controls are found by their new names, and the assurance is asserted as present rather than incidental.

# Open threads

None.
