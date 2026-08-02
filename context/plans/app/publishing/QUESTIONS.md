# Questions

## Where does the local rebuild script belong?

`scripts/update-local.sh` arrived in commit `40dcbdb` ("misc fixes") and no plan covers it, so the drift detector flags it as uncovered on every sweep. It cannot be left alone — it will resurface until it has a home.

**What it is.** A developer convenience: it rebuilds the interface, then the desktop binary, then the command-line binary, in the order the frontend-embedding rule demands, and warns when the `seal` on your path resolves somewhere with no `seal-desktop` beside it — the arrangement in which a rebuild changes nothing visible and a staler installed application opens instead. It is invoked as `bun run update-local` and is documented in [docs/RUNNING.md](../../../../docs/RUNNING.md).

**Why it has no obvious owner.** It is not a stranger-facing document, so `docs.md` does not cover it — that plan's scope is explicitly the README, the security policy, the contribution guidance, and the licences. It is not a released artefact or a release step, so `packaging.md` does not either. It is not an automated check, so it is not `ci.md`. It sits in the gap: developer-facing build tooling, which this tree has not needed a home for until now.

Note that the script mostly **encodes procedures other plans already own** — the embedding order is [docs/RUNNING.md](../../../../docs/RUNNING.md)'s, and the launcher search it warns about is [the CLI plan](../cli.md)'s. That is the argument for it not earning a plan of its own: it specifies no behaviour that is not stated elsewhere, which is the "short recipe" case [INSTRUCTIONS.md](../../../../docs/plans/INSTRUCTIONS.md) says needs no plan.

**Option A — cover it under `publishing/docs.md`, widening that plan's scope by one sentence to include the developer-facing build tooling `docs/RUNNING.md` describes.** Smallest move. `RUNNING.md` is already the document the script belongs to, and that document is developer-facing documentation, which is close to what `docs.md` already owns. Costs one edit to `docs.md`'s Scope.

**Option B — a new `publishing/tooling.md`** for developer build tooling, covering this script and anything like it that follows. Cleaner if more such scripts are coming; over-carved if this stays the only one.

**Option C — leave it uncovered deliberately**, on the grounds that it is a convenience wrapper specifying no behaviour of its own. This is only viable if the drift detector can be told to ignore it; otherwise it re-flags forever, which is the state the drift rules exist to prevent.

I lean to **A**: the script's whole content is procedures other plans own, so it does not earn its own node, and `docs.md` already owns the reader-facing side of the same concern. But widening a plan's scope is a reshape, so it is yours to confirm.

**Answer:**
