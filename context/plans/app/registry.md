Part of [the root plan](README.md).

# Scope

The registry is Seal's cross-repo state: which folders are registered as seal repos, which files inside each repo are managed, and each managed file's sealed-or-not tag — the explicit, application-owned distinction the root intent demands. It also owns the import scan: given a folder being imported as a repo, find the env files and other candidate secret files to present for confirmation. Persistence of this state (location, format, migration posture) is this plan's to define. Out of scope: cryptography (the engine's), any UI (the desktop app's), and resolving file contents (CLI/engine).

# What exists

Nothing; no code exists yet anywhere in the project.

# What is missing

Everything: the shape of the registry data (repos, managed files, tags), where and how it persists, how it stays truthful when files move or vanish underneath it, and the scan that proposes candidate secret files during import.

One requirement is already fixed by evidence rather than open to design. **The registry owns detecting that a sealed file was replaced from outside**, and it is not an edge case: a program holding a file open when it is sealed will, on its next save, silently overwrite the sealed file with plaintext — verified empirically, with no error and no conflict, because it is writing a buffer it read before the seal. This is the most likely way a seal is destroyed in ordinary use, and it is not confined to one editor: replacing the file rather than writing it in place is the default behavior of most common tools, including several editors' save paths and ordinary in-place stream editing from a shell script. Both shapes of clobber must be detected, since the two change different parts of the identity tuple. The engine returns an identity fingerprint from every operation; the registry records it at seal time and re-checks it, and a managed file that has flipped from sealed to plaintext is an alert the user must see rather than a state quietly absorbed. Two constraints on how that check is built are recorded in the engine's `MEMORY.md`: the comparison uses the whole identity tuple rather than any single field, and filesystem watching targets the containing directory rather than the file, because a file-level watch is destroyed by the very replacement it should catch. Because a watch reports the damage only after it happens, the fingerprint is re-checked on read as well, not only on events.

# Steps

TBD — first: research and design the registry model; the Approach lands here before any implementation.

# Open threads

- Where registry state lives (per-user app data dir vs anything in-repo) and in what format; settle during design. The state holds no secrets but is security-relevant, since it names exactly where every secret file on the machine is.
- How the registry represents a managed file that was deleted, moved, or externally re-sealed, and what reconciliation between recorded state and observed disk looks like as an explicit operation; settle during design.
- What the import scan considers a candidate secret file beyond env-file name patterns, and how it avoids proposing the conventionally-committed templates (`.env.example` and its variants) as secrets.
