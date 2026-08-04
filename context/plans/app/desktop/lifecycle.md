Part of [the desktop plan](README.md).

# Scope

The commands that move a file or a repo **into and out of** management, and the safety gates the root intent attaches to them: bringing a repo's files under management from a scan, removing a file from management, warning about a file an editor may be holding before sealing, and the acknowledgements a user must see before sealing anything for the first time. Out of scope: the screens that drive these (`ui/`), and the per-file operations that assume management already exists (`commands.md`).

# Approach

## What the pre-seal check can honestly be

The root intent asks the application to "notice when a managed file is open in an editor before sealing it." **Research showed the obvious implementation of that does not work, and would be actively misleading.** The design below is what survives measurement.

Measured on this machine: an editor with many source files open in tabs holds **no descriptor on any of them**. Checking every file the running editor held open showed only its own indexes, settings and caches — not one workspace file open in a tab. Modern editors read a file into memory and close it immediately.

The dangerous sequence was then reproduced end to end: an editor reads the file and closes it, Seal seals the file, the user presses save, and the editor writes its in-memory buffer back — leaving the secret in the clear on disk. **A descriptor check reports "safe" at every moment of that sequence.** So a check built on held descriptors would answer confidently and wrongly in exactly the case it exists to catch, which is worse than not asking, because it converts an unknown into a false assurance.

The check is therefore **not** a descriptor scan, and Seal does not claim to know whether a file is open somewhere. What it does instead:

**Warn on recency, which is a real signal.** A file modified very recently is one somebody is plausibly working in right now. Seal compares the file's modification time against the moment of sealing and, when the gap is small, warns before sealing rather than refusing. This is honest — it says "this file changed moments ago, something may be editing it" — and it does not pretend to certainty it cannot have.

**The warning is a property of sealing, not of one control.** Every route that seals checks recency: sealing one file from its row, and sealing a selection from the batch control. A selection checks every path in it and warns naming each recently-modified file, so the user can back out before any of them is touched. This is stated because the two routes reach different commands and it is easy to build the check into only the one where it was first needed — the hazard the warning exists to catch is a property of the *file*, so which control the user happened to reach for cannot decide whether they are told.

**State the limit in the warning itself.** The warning names what Seal cannot know: that an editor holding an unsaved buffer will overwrite the sealed file when the user next saves, and that no check can see that buffer. The instruction that follows is the one that actually works — close the file in your editor first.

**Rely on detection after the fact as the real safety net.** Reconciliation already detects a sealed file that became plaintext, and the interface surfaces it as an insistent alert. That mechanism is not weakened by the warning above; it is the primary defence, and the warning is a cheap way to reduce how often it fires. This inversion — detection is primary, prevention advisory — is forced by the measurement, not chosen for convenience.

## Acknowledgements before a first seal

Two facts the root intent requires the user to have seen before sealing anything, because both are irreversible and neither is recoverable by any later action:

- A forgotten password means the sealed data is gone permanently. There is no recovery path, no escrow, and no backdoor, and the format forecloses adding one.
- Sealing cannot reach backwards. A secret that already sat unprotected on disk may persist in snapshots, backups or unallocated blocks, so a previously-exposed credential must be **rotated**, not merely sealed.

These are acknowledged **once per registry**, recorded in the registry itself so the acknowledgement survives restarts, and the seal command refuses until it has been recorded. Refusing rather than merely displaying is deliberate: a warning the interface can forget to show is not a gate, and this one guards the only two consequences in the application that cannot be undone.

The acknowledgement records only that it happened. It is a fact about the installation, not about any file, so it belongs on the registry root rather than on a repo or a file.

## Bringing a repo under management

A repo enters by pointing at a folder. Seal scans it with the registry's existing scan — gitignore deliberately disabled, since secret files are gitignored precisely because they are secret — and returns candidates each classified as a secret, ambiguous, or a template, with only the secrets preselected. The user toggles the selection and confirms; the confirmed files become that repo's managed files.

Confirmation writes through the registry's compare-and-retry update, so a concurrent writer is never clobbered. Pointing Seal at a folder that is already a registered repo **merges** into it rather than duplicating it: files already managed keep their recorded state, and only genuinely new paths are added. Adding files never seals anything — it records what is managed, and sealing stays an explicit separate action, so pointing Seal at a folder can never encrypt a file the user did not choose.

## Removing a file from management

This is the only action in the entire application that legitimately ends with plaintext at a managed path, and it is explicit about being exactly that. Removal takes the file out of the registry and, when the file is sealed, unseals it in place so the repo is left with a working file rather than an unreadable one it no longer has any record of.

The alternative — dropping the record and leaving the file sealed — is offered as well, because a user who wants Seal to stop tracking a file does not necessarily want it decrypted as a side effect. The caller chooses; there is no default that silently decrypts.

Removing the last file from a repo removes the repo record too, so the registry does not accumulate empty entries.

# What exists

All of the Approach. A repo can now enter the application, files can leave it, and both gates sit on the paths that seal.

Nineteen tests cover it, including the two that matter most for trust: the acknowledgement gate refusing on the **real** seal command rather than only in isolation, and the acknowledgement surviving a store round trip. A registry file written before the acknowledgement field existed loads and defaults to not-acknowledged, so an upgrading user is asked once rather than silently treated as having agreed.

Guards confirmed non-vacuous by breaking each and watching the matching tests fail: a gate that always passes fails 2, an add that never merges fails 1, a release that ignores the caller's choice fails 1, a warning that never fires fails 1, and dropping the path-traversal guard fails 1.

The engine gained one operation for this: releasing a sealed file back to plaintext through the same locked, atomic, metadata-preserving replacement that sealing uses, rather than a plain write.

# What is missing

Nothing on this plan. The interface that drives these flows is `ui/`.

# Steps

- [x] Research what can actually be detected about a file being open elsewhere. Settled: descriptor checks do not work for the case that matters, and the check becomes a recency warning with detection-after-the-fact as the real safety net.
- [x] Add the acknowledgement record to the registry state, forward-compatibly.
- [x] Implement the add: scan, candidates, confirm a selection, merge into the registry.
- [x] Implement removal from management, in both the unseal-in-place and leave-sealed forms.
- [x] Implement the recency warning and the acknowledgement gate on sealing.
- [x] Tests: a fresh registry gains a repo through the add; adding twice merges rather than duplicates; a removed file is released with its plaintext restored deliberately; sealing refuses until acknowledged; a recently-modified file warns; and each guard confirmed non-vacuous.

# Open threads

- What recency threshold is meaningful. It wants a value chosen against real editing behaviour rather than a guess; the interface will show how often it fires.
