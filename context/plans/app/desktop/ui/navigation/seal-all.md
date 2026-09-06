Part of [the navigation plan](README.md).

# Scope

**Sealing every unsealed file in a repository in one action, without selecting them first.** Out of scope: the batch seal over an explicit selection, which [files.md](files.md) owns and which already exists.

# What & why

The repository altitude can seal several files at once, but only over a selection the user has ticked. A repository where **nothing** is sealed yet — the state a user is in immediately after adding one — therefore costs a tick per file before the one action they came to perform. The product owner has asked for a single control that seals the lot.

What makes this more than a convenience wrapper over the existing batch call is the safety property it interacts with. A control that seals *everything* is precisely where a user in a hurry acts without reading, so this node has to state what it asks and what it reports — against whatever [ceremony.md](ceremony.md) settles, which is why that node came first.

It also has to say what "all" means when the action partly fails. Per-file outcomes are already how this surface reports a batch; a control named for completeness raises the question of what it reports when completeness was not achieved.

**Approved by the product owner as a real capability, not a mock.**

**The repository altitude's tree waits on this node.** The design turns that surface into a tree with **no checkbox on any row** — the file line is drawn in four states and none of them carries one — and puts *Seal every file* in the repository's `⋯` instead. Building the tree first would remove the only way to seal several files at once before its replacement exists, so this comes first.

# Approach

## One control, and it means what it says

**Seal every file** sits in the repository's `⋯`, at both altitudes that offer a repository's operations — the row in the repositories list, and the header of the repository itself. The two menus offer the same repository the same things; a user should not have to remember which screen an operation lives on.

It seals **every managed file in the repository that is not already sealed and is still on disk**. That is what a user means by the words, and it is why the control is not restricted to a repository where nothing is sealed yet: a repository holding three sealed files and one readable one is exactly the state this exists to resolve, and a control that appeared only in the all-or-nothing case would be absent precisely when it is easiest to overlook the one file left open.

It is **absent, not disabled, when there is nothing to seal.** A repository whose files are all sealed or all missing has no work for it. A disabled entry in a menu is a menu that has to be opened to learn nothing.

## What it does not do

**It does not select anything.** There is no intermediate state where files are ticked and a second press commits; the press is the act. Selection is the manage surface's job, where choosing *is* the task.

**It asks nothing.** Sealing is reversible from the row, and no route consults recency — [ceremony.md](ceremony.md) settles both. The one gate it passes is the irreversibility acknowledgement, which is per-registry, fires once in the product's life, and is not this node's to skip.

**It is not mirrored by an unseal-everything.** Sealing a whole repository is safe in the direction that matters and unsealing one is not — a single press that makes every secret in a repository readable is the one shape of that operation which is genuinely dangerous. [repositories.md](repositories.md) already states that asymmetry for the menu; this is the other half of it.

## Partial failure is reported per file, because "all" is a claim

The seal reaches the same command the batch already uses, so a run that fails on some files reports **each file with its own reason** rather than a count or a single failure. A control named for completeness must never imply completeness it did not achieve: after a partial run the repository's ticks show exactly which files are still open, which is the same answer the outcome list gives, in the place the user is already looking.

# What exists

All of the Approach. **Seal every file** is in the repository's `⋯` at both altitudes, absent where every managed file is already sealed or missing, and it reaches the same batch command the selection used — so per-file outcomes, the acknowledgement gate and the error reporting are the ones already built and driven.

Both interface guards were confirmed non-vacuous by making the entry unconditional, which fails the absence half at each altitude.

Driven twice, for the two things that can go wrong. The **interrupted-rekey** scenario now establishes its six-file vault with one press instead of six, so the bulk path is exercised at width against real files on disk and the whole rotation depends on it having worked. The **readable-file** scenario names it as a check: a repository holding one readable and one sealed file is sealed whole by one press, both files are armored on disk afterwards, and the menu stops offering the entry.

# Steps

- [x] Settle where it lives, what "every" means, and what it does about a partial failure.
- [x] Build it at both altitudes, reaching the existing batch command.
- [x] Test it, including that it is absent when there is nothing to seal, and drive it.
