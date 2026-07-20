Part of [the root plan](README.md).

# Scope

The registry is Seal's cross-repo state: which folders are registered as seal repos, which files inside each repo are managed, and each managed file's sealed-or-not tag — the explicit, application-owned distinction the root intent demands. It also owns the import scan: given a folder being imported as a repo, find the env files and other candidate secret files to present for confirmation. Persistence of this state (location, format, migration posture) is this plan's to define. Out of scope: cryptography (the engine's), any UI (the desktop app's), and resolving file contents (CLI/engine).

# What exists

Nothing; no code exists yet anywhere in the project.

# What is missing

Everything: the shape of the registry data (repos, managed files, tags), where and how it persists, how it stays truthful when files move or vanish underneath it, and the scan that proposes candidate secret files during import.

# Steps

TBD — first: research and design the registry model; the Approach lands here before any implementation.

# Open threads

- Where registry state lives (per-user app data dir vs anything in-repo) and in what format; settle during design.
- How the registry detects and represents a managed file that was deleted, moved, or modified outside Seal; settle during design.
- What the import scan considers a candidate secret file beyond env-file name patterns; settle during design.
