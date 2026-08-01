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

TBD.

# Plans

No child plans yet.

# Cursor

Framed, not yet solutioned. The concern was raised during a UI improvement session, where it was correctly rejected as too large for that mode: it changes what the plans state about the import flow ([screens.md](../screens.md), [shell-operations.md](../_docs/shell-operations.md)), it changes a Rust return type, and it presses on the sidebar's *two levels, never a third* rule.

Prior art has been surveyed twice already and both surveys are recorded in `QUESTIONS.md` alongside the forks they inform — the tools that solve exactly this problem in place (git-crypt, transcrypt, dotenvx, SOPS, Ansible Vault), the ones whose file-moving is the feeling to avoid (blackbox, chezmoi, git-secret), and the tree-and-overlay mechanics from VS Code's Explorer, GitHub's file browser, and the cloud-storage badge conventions. That research is design **input**; it does not settle the forks, and the forks are the user's.

Next: the four questions in `QUESTIONS.md` are answered, then this folder is carved and solutioned against them.

# Open threads

- Whether the sidebar's *two levels, never a third* rule survives this concern or is scoped to the sidebar alone. The import surface and the sidebar answer different questions — *which files does Seal cover?* against *what is the state of what it covers?* — so the rule may simply not reach here. It wants deciding once, explicitly, rather than being eroded by a second tree appearing elsewhere in the product.
- What the steady-state repository surface becomes once the import surface shows the whole repository. Two surfaces describing the same repository at different fidelities is the shape that invites drift, and `git-crypt status` suggests they may want to be one thing seen twice.
