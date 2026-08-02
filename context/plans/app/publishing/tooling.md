Part of [the publishing plan](README.md).

# Scope

The **developer-facing build tooling**: the scripts a person working on Seal runs to get a change into a real application, as opposed to the automated checks (`ci.md`), the released artefacts (`packaging.md`), or the documents a stranger reads (`docs.md`).

Out of scope: the procedures themselves. The order a build must follow is [docs/RUNNING.md](../../../../docs/RUNNING.md)'s and the launcher search is [the CLI plan](../cli.md)'s; this plan owns the scripts that **encode** those procedures, not the procedures they encode.

# What & why

Two facts about this repository make an unaided rebuild unreliable, and both are invisible at the moment a developer gets them wrong.

The frontend is embedded into the desktop binary at compile time, so a frontend change reaches a real application only by rebuilding the interface **and then** the binary. Build them in the other order, or forget one, and the application runs with a stale interface that looks like a change that did not work.

And `seal open` finds the application by a search that checks beside the running `seal` binary before anything installed. A developer whose `seal` resolves somewhere with no `seal-desktop` beside it rebuilds, opens the app, and sees an older installed copy — with nothing on screen indicating that the rebuild was not what opened.

Both failures present as "my change did nothing." Encoding the order in a script, and warning about the launcher arrangement rather than leaving it to be discovered, is what this plan is for.

# Approach

One script, `bun run update-local`, doing three builds in the order the embedding rule demands: the interface, then the desktop binary, then the command-line binary. The desktop build passes the `custom-protocol` feature, without which the binary is a dev build that shows a blank window ([desktop MEMORY.md](../desktop/MEMORY.md) records why).

After building, it resolves the `seal` on the developer's path and **warns when no `seal-desktop` sits beside it**, naming both the launcher and what it resolved to. It warns rather than failing, because the arrangement is legitimate — a developer may have no `seal` on their path at all — and the script's job is to make the silent case visible, not to police the environment.

It reports the version it finished with, so the run ends by stating what the developer now has.

The script is a **recipe rather than a contract**: every rule it follows is specified elsewhere, and it exists so those rules are executed in the right order rather than remembered. A change to any of those rules changes the script; the reverse does not hold.

# What exists

All of the Approach, as `scripts/update-local.sh`, invoked through the `update-local` entry in the package manifest and documented in [docs/RUNNING.md](../../../../docs/RUNNING.md).

# What is missing

Nothing on this plan.

# Steps

- [x] The three builds in embedding order, with the desktop build carrying `custom-protocol`.
- [x] The launcher warning for the arrangement in which a rebuild changes nothing visible.
- [x] The finishing version report.

# Open threads

- The script builds unconditionally rather than skipping a stage whose inputs have not changed. That is deliberate for now — the failure it exists to prevent is a stale artefact — but a full rebuild is the slowest possible answer, and a correct staleness check would be worth having if the loop starts to bite.
