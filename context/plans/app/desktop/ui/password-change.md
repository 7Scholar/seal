Part of [the interface plan](README.md).

# Scope

The supervised master-password change: the flow that re-encrypts every managed file across every repo under a new password. Out of scope: the screens (`screens.md`) and the engine operation beneath it, which already exists.

# What exists

The engine half, in full: it plans before touching anything, proves the new password by a round trip first, derives progress from the files themselves so re-running is safe, retries transient failures, and reports what it could not finish. None of it is reachable from the interface.

# What is missing

The command that exposes it, and the flow that supervises it.

# Approach

TBD, but three constraints are already fixed and are not open for redesign.

**The run manifest must be durable on disk from the moment the plan is committed, before the first file is touched.** If progress lives only in interface state, a crash mid-run leaves a repo with some files on the old password and some on the new, and no record of which are which. That is the dangerous state the whole operation exists to avoid, and research into comparable tools found this to be the single most transferable lesson: the durable per-item record *is* the resumability affordance, and the progress display is a view over it rather than the source of truth.

**The user is never offered a control that manufactures the half-done state.** Failures arrive from the system and are retried; there is no per-file skip.

**The completion state answers what the user actually needs to know** — which files are on which password and what they must do now — never a bare count of failures. An unfinished run is remembered and resumable from the main surface, not only from a dialog that can be dismissed into oblivion.

The flow is gated on a typed phrase, the second and last place in the application where that friction is spent.

# Steps

- [ ] Design the flow, including where the manifest lives and how an unfinished run is surfaced on next launch.
- [ ] Add the command, with progress reported over a channel.
- [ ] Build the flow.
- [ ] Tests: a run interrupted partway is resumable and reports honestly which files sit on which password.

# Open threads

- Whether the manifest belongs in the registry or beside it. It is operational rather than declarative state, which argues for beside.
