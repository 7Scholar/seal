# Open questions

These are the design forks this concern exposes. They are raised together because they interact: the answer to the first bounds the rest.

Two prior-art surveys inform them and are summarised inline where they bear. The surveys are **input**, not answers — where they converge, that is said plainly; where they leave a genuine choice, the choice is stated as one.

---

## 1. Does the tree carry checkboxes on every file, or only on files Seal detected?

The whole repository is shown either way. The fork is what the user may act on directly.

- **Detected files only.** Other files appear — real paths, real nesting, dimmed and inert — so the user sees their repository, but a file Seal did not detect is brought under management by a separate deliberate act. Folder checkboxes would mean *"the detected files beneath this"*, never *"everything beneath this"*.
- **Every file.** Any file can be checked, and a folder checkbox selects everything under it.

**What bears on it:** [screens.md](../screens.md) calls conservative preselection load-bearing — over-inclusion encrypts a file meant to stay readable and breaks the user's build, which is the one failure mode in this flow that damages a working repository rather than merely annoying someone. Folder-level bulk selection is the shortest path to exactly that. Against this: a user whose secret sits under a name Seal does not recognise has to find another route, and if that route is awkward the tree has made a common case harder than the list it replaced.

**Answer:**

---

## 2. Is the tree a confirmation step, or does it become the repository's permanent surface?

- **A step.** The tree appears when a repository is added or rescanned, and the existing repository detail surface stays as it is.
- **Permanent.** The tree *is* the repository surface. Adding a repository and looking at one become the same view, with management state shown per row.

**What bears on it:** `git-crypt status` lists every file in the repository, tagged `encrypted:` or `not encrypted:`, with filters over that single view rather than separate screens — showing what is *not* covered is much of what makes it read as a layer, and that argument does not stop at the moment of import. Against this: it is a considerably larger change that lands on a finalized plan ([shell-layout.md](../shell-layout.md)), and two surfaces describing one repository at different fidelities is the shape that drifts. Note that this fork mostly decides how much of the product this concern touches, so it bounds the others.

**Answer:**

---

## 3. What is shown for the parts of the repository Seal deliberately does not walk?

The scan prunes `node_modules`, `.git`, `target`, `dist`, `build`, `vendor`, `.venv`, `venv`, `__pycache__`, `.next`, `.nuxt`, `.svelte-kit`. If the tree claims to show the repository, it has to say something about these.

- **Show them collapsed and inert**, marked as not looked in.
- **Omit them entirely**, and say once that build and dependency directories are skipped.

**What bears on it:** a tree that silently omits directories is not the repository, and the user cannot tell whether Seal missed something or ignored it deliberately. Against this: these directories are the bulk of a real repository's file count and none of its interest, and showing them invites someone to expand `node_modules`.

**Answer:**

---

## 4. Does the flow's verb change from *import* to *manage*, and does it change everywhere at once?

Both surveys landed on this independently. *Import* names pulling something in from outside; adopting something already in place is *add* or *manage* (chezmoi reserves the two words for exactly this distinction). The tell for extraction framing is the preposition **into** — *"add files into Seal"* extracts, *"seal files in your repo"* layers. Seal's existing verbs are already right; this one word is out of step.

- **Rename everywhere** — the sidebar control, the flow's heading, the confirm button, and the command name behind them.
- **Rename the user-facing copy only**, leaving `import` as the internal command name.

**What bears on it:** the second is much cheaper and touches no Rust; the first stops the retired word from leaking back through a future screen that reads the command name and mirrors it. Worth noting that this rename is most of the framing fix on its own and is far cheaper than the tree — it could land first, independently, if you want the feeling improved before the larger work is designed.

**Answer:**

---

## What the research settled, and is not asking about

Recorded so it is not relitigated, and so an answer above does not accidentally overturn it:

- **A collapsed folder hiding a selected file must carry a visible aggregate marker**, weaker than a leaf's own state marker — VS Code's bubble badge. This is what lets the tree collapse aggressively without violating the boundary in [shell-layout.md](../shell-layout.md): disclosure defers explanation and secondary action, never a state.
- **Cold-start expansion is computed, not remembered.** The window persists nothing, so the expansion set is the union of the ancestor chains of the preselected files. The constraint turns out to be a simplification.
- **Two visual channels, kept separate**: one for management state, a dimmed one for out-of-scope. Collapsing them into one channel is how these trees become unreadable.
- **The reassurance no surveyed tool states outright**, and the highest-value sentence available here: *files stay where they are; nothing is moved, renamed, or copied.* It belongs beside the existing "importing encrypts nothing".
- **Never rename or suffix a sealed file.** Adding `.gpg`-style suffixes is precisely what breaks the illusion in the extraction tools; Seal already gets this right and must keep it.
- **`aria-selected` and `aria-checked` are never mixed in one tree** (ARIA APG), and a tree does not emit `aria-selected="false"` on every row — screen readers announce it on all of them.

## One thing a survey got wrong, recorded so it is not repeated

The first survey flagged `standard_filters(false)` in [scan.rs](../../../../../../crates/seal-registry/src/scan.rs) as a gap and proposed honouring `.gitignore` so ignored files could be dimmed. That is the exact inversion the root [MEMORY.md](../../../MEMORY.md) records as **measured**: secret files are gitignored *because* they are secret, and a gitignore-respecting scan returned only `.env.example` while concealing all four real secrets. The line is a guard, `tests/scan.rs` asserts it, and any design here inherits it — a file's gitignored status may be *displayed*, but it must never filter the walk.
