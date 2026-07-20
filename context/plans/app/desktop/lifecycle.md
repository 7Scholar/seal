Part of [the desktop plan](README.md).

# Scope

The commands that move a file or a repo **into and out of** management, and the safety gates the root intent attaches to them: importing a repo from a scan, removing a file from management, the check for a file open elsewhere before sealing, and the acknowledgements a user must see before sealing anything for the first time. Out of scope: the screens that drive these (`ui/`), and the per-file operations that assume management already exists (`commands.md`).

# What exists

The pieces underneath, and nothing that joins them.

The registry implements the import **scan** in full: it walks a repo with gitignore deliberately disabled, classifies each candidate as a secret, ambiguous or a template, and preselects only the secrets. It is tested against the exact failure that motivated it — a gitignore-respecting walk finds only the committed example while hiding every real secret.

The engine implements sealing, and refuses a file another Seal operation holds.

# What is missing

Everything that joins them, and every safety gate. Stated plainly: **the application currently has no way to add a repo**, so a fresh install can unlock and lock and nothing else. Every path-taking command first checks the registry, and the registry starts empty with no code path that ever writes a repo into it.

Four distinct gaps, each traceable to a sentence in the [root intent](../README.md):

**Import.** The intent fixes the flow as intent rather than design: the user points at a folder, the application scans it and presents what it found, the user toggles each candidate, and the confirmed files become that repo's managed files. Only the scan exists; nothing constructs a repo or writes one to the registry.

**Removing a file from management.** The intent names this as the *only* legitimate action that ends with plaintext at the path, and requires it to be explicit about being exactly that. No such command exists, so a managed file can currently never be released — the on-disk state can move to sealed and never back by any route at all.

**The check for a file open elsewhere before sealing.** The intent requires the application to notice when a managed file is open in an editor before sealing it. What exists is the opposite in time: reconciliation detects a sealed file that *became* plaintext, which is the same event caught after the secret has already been written back in the clear. The engine's lock excludes other Seal operations only and says nothing about a third-party editor holding a descriptor.

**The irreversibility acknowledgements.** The intent requires two statements before a user seals anything: that a forgotten password is permanently unrecoverable, and that sealing cannot reach backwards, so a secret already exposed on disk or in a backup must be rotated rather than merely sealed. Neither exists in any form, and there is nowhere in the registry to record that a user has seen them, so a gate cannot currently be built without a state change.

# Steps

- [ ] Research what can actually be detected about a file being open elsewhere, per platform, and how reliable it is. This gates the design of the pre-seal check and may bound what can honestly be promised.
- [ ] Design the acknowledgement model: what is shown, when, and where the fact that it was shown is recorded, given the state must survive restarts.
- [ ] Implement import: scan, present candidates, confirm a selection, write the repo into the registry through the compare-and-retry update.
- [ ] Implement removal from management, explicit about leaving plaintext at the path.
- [ ] Implement the pre-seal open-file check, failing closed where the platform allows a reliable answer and stating the limit where it does not.
- [ ] Implement the acknowledgement gate on the first seal.
- [ ] Tests: a fresh registry gains a repo through import; a removed file is released and its plaintext left in the clear deliberately; sealing refuses or warns when a file is open elsewhere; a first seal cannot proceed unacknowledged.

# Open threads

- Whether the pre-seal check can be made reliable enough to fail closed on, or whether it must be advisory. Detecting that another process holds a descriptor is inherently racy — a file can be opened the instant after the check passes — so the honest design may be a warning naming the holding process rather than a hard refusal. Settle by research before implementing.
- Whether removal from management should offer to leave the file sealed rather than restoring plaintext. The intent's wording implies plaintext is the point of the action, but a user removing a file they no longer want Seal to track may not want it decrypted as a side effect.
