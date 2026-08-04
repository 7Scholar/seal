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

Committing a plan writes a manifest listing the password sentinel first and then every managed file as pending, alongside the registry, **before any file is touched**. The sentinel leads because converting it first moves the password that unlocks the application to the new password the moment a run begins — the semantics are [first-open.md](../first-open.md)'s. A completed run deletes it; an unfinished one leaves it, which is how the next launch knows to say so.

**Each entry is rewritten to converted or failed the moment that file settles, not when the run returns.** The engine re-seals a list in one call, so a manifest written only from its final report is still all-pending for the whole time the run is working — and a force-quit in that window leaves a manifest that names nothing as moved even though files on disk already carry the new password. The resume screen then asks for the old password on files that no longer need it, which is the misleading half-done report this whole design exists to prevent. The desktop therefore drives the engine's observed variant and persists after every file, so the durable record tracks the disk rather than trailing it. The engine's own progress stays derived and unrecorded — that contract is [operations.md](../../engine/operations.md)'s and is not changed here; the manifest is the desktop's separate, durable view over it.

Resuming reads the manifest and retries only entries that have not converted, so a file already on the new password is never attempted again with the old one. Starting a fresh change while a manifest exists is refused outright — that is how a repository ends up spread across three passwords.

A recorded failure stores the **kind** of failure, never an error message, so the manifest cannot accumulate secret material on disk.

The session adopts the new password only when the run completes, so a partially converted set leaves the session on the password that still opens most of it.

# What exists

All of it: the manifest and its ledger, the commands, and the flow.

Ten Rust tests and twelve interface tests cover it. The durability guarantee is confirmed non-vacuous the hard way — writing the manifest only at the end of the run, which is the shape a purely in-memory progress display would have, fails **eight of the ten** Rust tests.

One defect was caught by a test during the work: every planning failure was being collapsed into a wrong-password error, so a file deleted between planning and running would have told the user their password was wrong. Plan failures now map to their actual kinds.

# What the driven journey confirmed

The flow is **driven end to end in the real application** as the last step of the [return-and-use scenario](../journey-harness.md): the settings route in, the screen's statement that both passwords must be remembered, the four fields, the run, and then the proof that matters — locking, being refused by the old password with the plain "did not open your files" notice, and unlocking with the new one to find the file still sealed. The step is confirmed non-vacuous by dropping the sentinel from the manifest `rekey_begin` builds, which is the mutation that would leave the old password still opening Seal: the step fails, and restoring the sentinel makes it pass again.

Note for anyone reading the run: after the change completes the application returns to **the altitude it was already at**, which for this scenario is a repository rather than the repository list. There is no `Repositories` heading to assert on — that heading belongs to the top-level screen alone.

**The interrupted run is driven too**, by the [interrupted-rekey scenario](../journey-harness.md), and it found the defect above. Six managed files are sealed, a rotation is started, and the application is force-killed the moment a file's ciphertext on disk is seen to change — a real `SIGKILL`, after which the process is relaunched and the driver reconnects. Before the fix the manifest read **0 of 7 converted** while `.env.five` had already moved to the new password, and the resume screen listed that file as still needing the old one; after it the same interruption records **2 of 7** and the screen names only files that genuinely still need the old password. The step is non-vacuous by the mutation that removes the per-file write: the manifest reverts to 0 of 7 and the step fails by name.

Recovery itself was never broken — the engine's derived progress re-opens each file under the new password first, so a resumed run finishes correctly either way. What the interruption broke was the *report*, which is the half of this flow the user actually reads.

# Steps

- [x] Design the flow, including where the manifest lives and how an unfinished run is surfaced on next launch.
- [x] Add the commands: status, begin, run, and abandon.
- [x] Build the flow.
- [x] Tests: a run interrupted partway is resumable and reports honestly which files sit on which password.
- [x] Drive it in the real application, and prove the drive non-vacuous.
- [x] Drive an **interrupted** run — kill the application partway through the rotation and reopen it — which is the property the durable manifest exists for and the one a clean run cannot demonstrate. [change-the-password.md](../../../../journeys/change-the-password.md) requires it.

# Open threads

- The interface still reports progress per pass rather than streaming it per file. The manifest is now per-file accurate on disk, so an unfinished run is reported correctly on the next launch; what remains is a live view during a long run, which matters only once a user has enough files for the run to be slow.
