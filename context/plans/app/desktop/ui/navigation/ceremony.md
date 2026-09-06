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

## The rule

**A confirmation is warranted when the act destroys data, is irreversible, or is not the act the user asked for.** Everything else is performed.

The three tests are deliberately about the *act*, not about how dangerous it feels. Feeling is what accretes ceremony: every individual warning looks prudent, and the sum of them is a product whose users click through all of it — including the one that mattered. [The bad-day step](../../../../../journeys/living-with-it.md) states both halves of the bar this answers to, and the second half is the one this node enforces: routine reversible acts must be **free** of ceremony, not merely light on it.

A **one-time acknowledgement** of the product's terms is not a confirmation and is not governed by this rule. It is shown once in the product's life, before anything is ever encrypted, and it states two facts a user cannot infer. [screens.md](../screens.md) owns it and it is untouched.

## What survives, and on which test

- **Stopping management** — destroys the protection and leaves plaintext at the path. *Destroys.*
- **Deleting variables on save** — removes lines from the user's file. *Destroys.*
- **Discarding changes** — throws away work the user typed. *Destroys.*

## What goes, and why each is safe

**The seal-while-editing warning.** It fires on a *possibility*: the file changed recently, so an editor may be holding an unsaved buffer whose next save would overwrite the sealed file with readable text. Three things make removing it safe rather than merely tidier:

- Sealing is **reversible from the row that performed it** — the file stays managed, and unsealing puts it back.
- The hazard it guessed at is now **reported when it actually happens**. A sealed file overwritten in the clear is a divergence the registry detects, [freshness.md](freshness.md) re-observes within five seconds without the user doing anything, and the row it lands on goes matted red with an explanation and a Seal action at rest. That is the same information, delivered on the event instead of on the guess, to a user who can act on it.
- The warning was **advice the user could not act on** in the common case. It says *close the file in your editor first* — but a developer sealing a file they have just finished editing has already saved it, and cannot tell from Seal whether their editor is holding anything.

The trade is a warning for a report, and the report is strictly the better half: it never fires falsely, and it fires in the case the warning misses entirely — an editor that opens the file *after* the seal.

**This reverses a fix the journeys axis made**, and that is the reason this node exists rather than a diff. Driving [the bad-day step](../../../../../journeys/living-with-it.md) once found the batch control sealing without the warning the single-file control gave, and the fix was to make the check a property of *sealing* rather than of one control. Removing it now is not that defect returning: the asymmetry is gone because neither route warns, and the report covers both.

**The unseal confirmation.** Unsealing is exactly the act the user asked for, from the row that shows the state, and it is reversible from that same row. Its outcome is visible the instant it completes — the row's bar goes faint and its wash disappears. A confirmation that restates what the button says, for an act with an immediately visible and reversible outcome, is the definition of ceremony this rule exists to remove.

**"This repository is already managed."** Not an act at all. Nothing happens, there is nothing to choose between, and the dialog's only affirmative button navigates. Adding a folder Seal already holds now **opens that repository**, which is what the button did.

## What must hold for this to stay safe

The seal warning's removal rests entirely on the report existing and being current. **If re-observation is ever made lazier — a longer interval, a `document.hidden` guard, a watch that can fail silently — this decision has to be revisited**, because the report is the only thing standing where the warning stood. `MEMORY.md` carries the guard against the `document.hidden` version of that mistake.

# What exists

All of the Approach. Six confirmations are four: the two removals and the already-managed dialog are gone, and `sealWarning` is no longer consulted by any interface path.

The `seal_warning` command stays on the IPC surface with no caller. It is Rust that answers a real question correctly and cheaply, the removal here is an interface decision rather than a model one, and a later design may want the fact without a dialog in front of it.

Driven in [the bad-day scenario](../../../../../journeys/living-with-it.md), which previously asserted the warning and now asserts its replacement end to end: a just-modified file seals silently, and an editor's overwrite afterwards raises the row with its explanation and its fix, with no user action.

**Building that guard found the gap it exists to find.** The report was live on the repository altitude — the row went to its alert treatment and offered a seal — but it **explained nothing**: the `ⓘ` had been built on the repositories list and not on the file row. A user meeting a broken seal for the first time on the surface they are most likely to be standing on would have got a red row, an action, and no vocabulary. One `BrokenSeal` component now carries that explanation and both surfaces use it, so the two cannot drift apart.

Confirmed non-vacuous by crippling re-observation — dropping the focus and visibility triggers and stretching the interval — after which the check fails with *the row never reported the overwrite*, which is the sentence this whole decision rests on.

# Steps

- [x] Settle the rule, and check each surviving and each removed confirmation against it.
- [x] Remove the three, and stop consulting `sealWarning`.
- [x] Invert the guards that asserted the old behaviour, and drive the report that replaces the seal warning.
