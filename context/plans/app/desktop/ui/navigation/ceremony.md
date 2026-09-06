Part of [the navigation plan](README.md).

# Scope

**Which acts the interface stops to confirm, and which it simply performs.** The set of confirmations the application raises, and the rule that decides membership. Out of scope: what any individual dialog says once it is kept — that stays with the plan owning the act — and the first-seal acknowledgement, whose requirement is settled in [screens.md](../screens.md) and unaffected here.

# What & why

The product owner has decided that three of the interface's stops come out, and the plan tree has to carry that decision rather than have it arrive as styling. Two of them are confirmations in a security tool, which is the shape of change this repository should never make quietly.

**The seal-while-editing confirmation is removed.** Sealing a file that changed moments ago currently raises a dialog: a program may be working in the file, and if an editor holds an unsaved buffer its next save overwrites the sealed file with readable text. The owner's argument for removing it is that sealing is reversible and the warning fires on a possibility rather than an event — the broken-seal condition already reports an overwrite when it actually happens, on the row, with a fix action at rest. The warning is being traded for the report.

This is the change that most needs stating at plan altitude. The recency warning is the only thing standing in front of a hazard this tree has reproduced end to end, and [the journeys axis](../../../../../journeys/living-with-it.md) drove a defect where the batch route lacked it — the fix at the time was to make the warning a property of *sealing* rather than of one control. Removing it now reverses that, deliberately, and a later agent reading only that history would read the removal as a regression.

**The unseal confirmation is removed.** Unsealing makes a file's contents readable on disk, which is a real exposure — but it is one the user asked for explicitly, reversible from the same row, and already visible afterwards in the state language.

**"This repository is already managed" stops being a dialog** and simply opens the repository. Adding a repository Seal already holds is not an error and has no outcome to choose between; the dialog's only real button navigates.

What remains, and is not in question: the one-time acknowledgement, stopping management, deleting variables on save, and discarding changes.

The concern is one node rather than three because the interesting thing is not any single removal but **the rule** — a confirmation earns its place when the act is irreversible, or destroys data, or is one the user did not ask for. Without that rule stated, the set drifts back the other way the next time something feels risky, and a security tool accretes ceremony until users click through all of it. That failure is already named in [living-with-it](../../../../../journeys/living-with-it.md), whose bad-day step asks that irreversible acts be ceremonious *and that routine reversible ones be free of ceremony*.

**Approved by the product owner** — the removals are decided, not proposed. What this node owes is the rule, the states that replace what the dialogs said, and evidence that the hazard the recency warning covered is genuinely reported elsewhere.

# Approach

TBD

# Steps

- [ ] Research solution directions
