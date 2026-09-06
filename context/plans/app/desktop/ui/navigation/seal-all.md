Part of [the navigation plan](README.md).

# Scope

**Sealing every unsealed file in a repository in one action, without selecting them first.** Out of scope: the batch seal over an explicit selection, which [files.md](files.md) owns and which already exists.

# What & why

The repository altitude can seal several files at once, but only over a selection the user has ticked. A repository where **nothing** is sealed yet — the state a user is in immediately after adding one — therefore costs a tick per file before the one action they came to perform. The product owner has asked for a single control that seals the lot.

What makes this more than a convenience wrapper over the existing batch call is the safety property it interacts with. Sealing consults recency, and the batch route once shipped without that check — a defect [living-with-it](../../../../../journeys/living-with-it.md) found by driving it, and whose fix was to make the check a property of sealing rather than of any one control. A control that seals *everything* is precisely where a user in a hurry can seal a file an editor is holding, so this node has to state what it does about that, and it has to state it against whatever [ceremony.md](ceremony.md) settles about the recency warning's future.

It also has to say what "all" means when the action partly fails. Per-file outcomes are already how this surface reports a batch; a control named for completeness raises the question of what it reports when completeness was not achieved.

**Approved by the product owner as a real capability, not a mock.**

## Two things wait on this node

**The repository altitude's redesign is blocked behind it.** The design turns that surface into a tree with **no checkbox on any row** — the file line is drawn in four states and none of them carries one — and puts *Seal every file* in the repository's `⋯` instead. So the tree cannot be built first: doing that removes the only way to seal several files at once, before the thing that replaces it exists. It would also silently retire the surface's whole selection model, which [files.md](files.md) states and which [the bad-day scenario](../../../../../journeys/living-with-it.md) drives — the batch route is exactly where that scenario walks the ceremony question.

**And this node waits on [ceremony.md](ceremony.md).** What *Seal every file* does about a file an editor may be holding cannot be answered before ceremony.md settles whether the recency warning survives at all. Answering it here first would decide ceremony.md's question from the wrong end.

The order is therefore ceremony.md, then this, then the tree.

# Approach

TBD

# Steps

- [ ] Research solution directions
