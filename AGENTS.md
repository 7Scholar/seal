# Seal

Seal is a standalone Tauri application for encrypting and managing secret files across local repos: the files stay sealed in place — visible but unreadable — and only the user's password resolves them. The founding intent lives in the root plan: [context/plans/app/README.md](context/plans/app/README.md).

## Repo essentials

- The plan-system tooling under `context/_scripts/` is Python and uses `uv`. Do not use pip, pipenv, or poetry. Run its verbs with `uv run <verb> …` from that directory; tests with `uv run pytest`.

## Writing style

- **Document the current design only.** Do not write about historical decisions or rejected alternatives.
    - **Avoid** phrases like "we chose X over Y", "unlike the previous approach", "instead of Z we use", "originally we did X but now".
- **Avoid** duplicating a decision, rule, or procedure across documents. Link to the document that owns it.
- **Never** hard-wrap prose in Markdown. Each paragraph and list item stays on one unbroken line and soft-wraps naturally.

# BEFORE STARTING ANY WORK: read the entry manual

All work in this repo — code and plans alike — runs on the recursive plan system. Read [docs/plans/AGENT_ENTRY.md](docs/plans/AGENT_ENTRY.md) first and follow it onward; it points into the operating manual ([docs/plans/INSTRUCTIONS.md](docs/plans/INSTRUCTIONS.md)) and the plan tree ([context/plans/app/](context/plans/app/README.md)).
