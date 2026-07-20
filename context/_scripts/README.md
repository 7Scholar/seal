# Context scripts

Tooling for the `context/` plan system.

- **`plans/`** — the recursive plan-folder machinery: declaring what a plan covers, drawing its boundary, and checking it for drift. **The full reference — what each coverage/boundary/detector verb does, its flags, what it refuses, and how it all fits together — lives in [`docs/plans/SYNC.md`](../../docs/plans/SYNC.md) (the Scripts section).** That document is the source of truth; this package holds the implementation. One script sits outside the drift machinery: **`find_plans`** is a read-only intake aid that searches every `coverage.json` for plans whose covered files match query terms, used to find which existing plans a new request touches — documented where it is used, in [`docs/plans/INTAKE.md`](../../docs/plans/INTAKE.md).
- **`hooks/`** — the per-clone git hooks, installed with `uv run install_hook`: a `post-commit` drift detector and a `pre-commit` auto-format placeholder to be wired to the repo's formatters once they exist (see [`docs/plans/SYNC.md`](../../docs/plans/SYNC.md), "The two hooks").

Run everything with `uv run <verb> …` from this directory. Tests: `uv run pytest`.
