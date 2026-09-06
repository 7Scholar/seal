Part of [the navigation plan](README.md).

# Scope

**Sealing every unsealed file in a repository in one action, without selecting them first.** Out of scope: the batch seal over an explicit selection, which [files.md](files.md) owns and which already exists.

# What & why

The repository altitude can seal several files at once, but only over a selection the user has ticked. A repository where **nothing** is sealed yet — the state a user is in immediately after adding one — therefore costs a tick per file before the one action they came to perform. The product owner has asked for a single control that seals the lot.

What makes this more than a convenience wrapper over the existing batch call is the safety property it interacts with. Sealing consults recency, and the batch route once shipped without that check — a defect [living-with-it](../../../../../journeys/living-with-it.md) found by driving it, and whose fix was to make the check a property of sealing rather than of any one control. A control that seals *everything* is precisely where a user in a hurry can seal a file an editor is holding, so this node has to state what it does about that, and it has to state it against whatever [ceremony.md](ceremony.md) settles about the recency warning's future.

It also has to say what "all" means when the action partly fails. Per-file outcomes are already how this surface reports a batch; a control named for completeness raises the question of what it reports when completeness was not achieved.

**Approved by the product owner as a real capability, not a mock.**

# Approach

TBD

# Steps

- [ ] Research solution directions
