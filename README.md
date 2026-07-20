# Seal

Seal is a standalone desktop application (Tauri) for encrypting and managing secret files across local repos. Secret files — `.env` files and other config files — stay sealed in place in their own repos: visible in name and location, unreadable in content. Only the user's password, which lives nowhere on the machine, resolves them — interactively in the UI, or on demand through Seal's runtime API so local workflows like deploy scripts keep working.

The project is plan-driven: the founding intent and all work state live in the plan tree at [context/plans/app/README.md](context/plans/app/README.md), operated per [docs/plans/](docs/plans/README.md). Agents start at [CLAUDE.md](CLAUDE.md).
