Part of [the interface plan](README.md).

# Scope

The supervised master-password change: the flow that re-encrypts every managed file across every repo under a new password. Out of scope: the screens (`screens.md`) and the engine operation beneath it, which already exists.

# Approach

Three constraints govern the design, and none is open for redesign.

**The run manifest must be durable on disk from the moment the plan is committed, before the first file is touched.** If progress lives only in interface state, a crash mid-run leaves a repo with some files on the old password and some on the new, and no record of which are which. That is the dangerous state the whole operation exists to avoid, and research into comparable tools found this to be the single most transferable lesson: the durable per-item record *is* the resumability affordance, and the progress display is a view over it rather than the source of truth.

**The user is never offered a control that manufactures the half-done state.** Failures arrive from the system and are retried; there is no per-file skip.

**The completion state answers what the user actually needs to know** — which files are on which password and what they must do now — never a bare count of failures. An unfinished run is remembered and resumable from the main surface, not only from a dialog that can be dismissed into oblivion.

The flow is gated on a typed phrase, the second and last place in the application where that friction is spent.

## The manifest

Committing a plan writes a manifest listing the password sentinel first and then every managed file as pending, alongside the registry, **before any file is touched**. The sentinel leads because converting it first moves the password that unlocks the application to the new password the moment a run begins — the semantics are [first-open.md](../first-open.md)'s. Each entry moves to converted or failed as the run proceeds, and the manifest is rewritten after each pass. A completed run deletes it; an unfinished one leaves it, which is how the next launch knows to say so.

Resuming reads the manifest and retries only entries that have not converted, so a file already on the new password is never attempted again with the old one. Starting a fresh change while a manifest exists is refused outright — that is how a repository ends up spread across three passwords.

A recorded failure stores the **kind** of failure, never an error message, so the manifest cannot accumulate secret material on disk.

The session adopts the new password only when the run completes, so a partially converted set leaves the session on the password that still opens most of it.

# What exists

All of it: the manifest and its ledger, the commands, and the flow.

Ten Rust tests and twelve interface tests cover it. The durability guarantee is confirmed non-vacuous the hard way — writing the manifest only at the end of the run, which is the shape a purely in-memory progress display would have, fails **eight of the ten** Rust tests.

One defect was caught by a test during the work: every planning failure was being collapsed into a wrong-password error, so a file deleted between planning and running would have told the user their password was wrong. Plan failures now map to their actual kinds.

# Steps

- [x] Design the flow, including where the manifest lives and how an unfinished run is surfaced on next launch.
- [x] Add the commands: status, begin, run, and abandon.
- [x] Build the flow.
- [x] Tests: a run interrupted partway is resumable and reports honestly which files sit on which password.

# Open threads

- Progress is reported per pass rather than per file. A channel would give a live per-file view, which matters only once a user has enough files for the run to be slow; the durable manifest already carries the information the display needs.
