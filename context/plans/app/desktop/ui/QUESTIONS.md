# Open questions

## Should the import flow present the repository's whole tree rather than a candidate list?

**Raised:** 2026-08-01, during a UI improvement session.

**Who is asking:** the product owner, describing how the current flow *feels*: hand-picking files and "extracting" them into Seal. The intended feeling is the opposite — that Seal is a layer of encryption on top of an otherwise normal repo, so the product reads as "in this repository, Seal manages these files and has sealed this subset of them."

**The proposal on the table:** the scan loads every file and folder of the repository and shows them as a folder tree, with detected secret files pre-selected and every branch that contains no selected secret collapsed by default.

**Why this is not a UI tweak.** It changes things the plans state, in three places:

- [screens.md](screens.md) specifies the import flow as candidates *grouped by classification with counts*, scoped select-all per group. A tree dissolves that grouping into a per-row annotation.
- [shell-operations.md](_docs/shell-operations.md) fixes the import flow as `scan` → *grouped candidate list* → confirm.
- The Rust seam changes shape: `scan_folder` returns `Vec<Candidate>` today. A tree needs directories, non-candidate files, and a nesting structure — a different return type, owned by [registry.md](../../registry.md), not by the interface.

It is therefore design-shaped work rather than polish, and it wants framing through intake rather than being answered inside a polish session.

**What research already settled.** Prior art was surveyed (VS Code's Explorer decorations, GitHub's file browser, Dropbox/OneDrive selective sync, git-crypt, chezmoi, the ARIA tree pattern). It converged on a recommendation and on three findings worth carrying into whatever plan takes this up:

- **Only detected files should carry a checkbox.** Other files appear in the tree — dimmed, monospace, inert — so the user sees their real repository, but managing an undetected file takes a deliberate separate act. Making every file checkable invites folder-level bulk selection, which is the fastest path to encrypting a file that breaks the user's build; that collides with the conservative-preselection rule [screens.md](screens.md) calls load-bearing.
- **A collapsed folder hiding a selected descendant must carry a visible aggregate marker**, weaker than a leaf's own state marker. This is what lets the tree collapse aggressively without violating the boundary in [shell-layout.md](shell-layout.md): disclosure defers explanation and secondary action, never a state.
- **Vocabulary.** "Import" names pulling something in from outside; adopting files already in place is "manage". Renaming the flow's verb is most of the framing fix on its own, and is far cheaper than the tree.

**What a second survey added,** across the tools that solve exactly this problem — git-crypt, transcrypt, dotenvx, SOPS, Ansible Vault — against the ones that move files, which is the feeling to avoid (blackbox renames to `.gpg`, chezmoi copies into a source directory, git-secret gitignores the plaintext):

- **The tell for extraction framing is the preposition `into`.** "Add files *into* Seal" extracts; "Seal files *in* your repo" layers. Seal's existing verbs are already on the right side of this — "Stop managing this file", "Release", "seal" — so **the flow's "Import" is the single word out of step with the rest of the product.**
- **A flat list of managed paths reads as an inventory, and an inventory is what feels extracted.** Every layer-flavoured tool reports managed files positioned in the user's own directory structure: transcrypt's `--list` is "relative to the top-level directory", chezmoi's `managed` lists "in the destination directory". This is the substantive argument for the tree, independent of taste.
- **`git-crypt status` lists every file in the repository**, each tagged `encrypted:` or `not encrypted:`, with `-e`/`-u` as filters over that one view rather than separate screens. Showing what Seal is *not* managing is what makes it read as a layer over everything rather than a list of a few.
- **The reassurance nobody says outright**, and the highest-value sentence available here: *files stay where they are; nothing is moved, renamed, or copied.* Seal's existing "importing encrypts nothing" is the same move one step earlier, and the two belong together.
- **Never rename and never suffix a sealed file.** That is exactly what breaks the illusion in the extraction tools, and Seal already gets it right by sealing in place.

**One thing the research got wrong, recorded so it is not repeated.** It flagged `standard_filters(false)` in [scan.rs](../../../../../crates/seal-registry/src/scan.rs) as a gap and proposed honouring `.gitignore` to dim ignored files. That is the exact inversion the root [MEMORY.md](../../MEMORY.md) records as measured: secret files are gitignored *because* they are secret, and a gitignore-respecting scan returned only `.env.example` while hiding all four real secrets. The line is a guard, and `tests/scan.rs` asserts it.

**The question for the owner:** should this be framed as its own node through intake — with the tree, the `scan_folder` shape change, and the sidebar's "never a third level" rule all in its scope — or is the cheap subset (rename the verb to "manage", show each candidate's directory context, drop the three fieldsets) enough to fix the feeling without the tree?
