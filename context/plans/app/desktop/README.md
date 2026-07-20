# Intent

## What & why

The desktop application is Seal's face and the reason it is an application at all: a Tauri 2 app with a React + TypeScript (Vite) frontend where all management happens. It spans the Rust shell (window and app lifecycle, the IPC command surface, capability configuration, the unlocked-session state) and the UI (the cross-repo view of repos and managed files with their sealed/unsealed tags, the repo import flow with its candidate confirmation, seal/unseal actions, the explicit session seal/unseal control, and the dedicated Vercel-style environment-variables editor for env files — the only editing surface, since non-env files are never edited in the app). It consumes the engine and the registry through a thin command layer per the Tauri practices doc. It is done when a user can do everything the root intent promises through the UI, with the session model the root Approach fixes: unlocked by password, ended by quit or the seal action.

## Approach

TBD, except for one part of it that is decided and constrains the rest.

**Unsealing in the user interface never writes plaintext to disk.** Viewing or editing a sealed file loads its plaintext into memory only; the file on disk stays sealed throughout. Plaintext held this way is discarded when the user seals it again, when the application quits, and automatically after fifteen minutes without further action — whichever comes first. Saving an edit re-seals from memory. There is no state in which a managed file sits decrypted at its path, and no user action that produces one, so the failure where somebody unseals a file to check a value and leaves production credentials in a repository cannot occur.

Two consequences for the rest of the design. The fifteen-minute expiry is a property of the held plaintext rather than of the session as a whole, so it applies per file and a file whose time runs out while the application is still unlocked is cleared on its own. And because the application quitting is one of the clearing conditions, quitting must remain safe at any moment: unsaved edits are lost by design rather than flushed to disk, which is the correct trade for this product and must be made obvious in the interface rather than discovered.

**Changing the master password is a supervised operation, and an unfinished one is never left to sit.** The engine makes the work safe to interrupt and safe to repeat — every file is wholly under one password or the other, and progress is derived from the files themselves rather than from bookkeeping — but "safe to resume" is not the same as "fine to leave," and the interface must not imply it is. So the application does the work of getting to completion rather than reporting a count and handing the problem back.

Before starting, the interface asks — as a question needing an answer, not a warning to dismiss — whether the user has a backup, and states plainly that both the old and new passwords must be remembered until the operation finishes and that a forgotten old password cannot be rescued by it. During the run it shows real progress and does not present interruption as harmless. Files that fail transiently are retried by the engine without the user ever seeing them.

What the user does see is the case that survives retries: a prominent, persistent banner naming the files still on the previous password, the reason each is stuck, and a single control that retries them. The banner stays until the operation is genuinely complete — it is not dismissible into oblivion, because a split left unattended is precisely the state that turns a recoverable situation into a confusing one months later when only one password is still remembered. Where the reason is actionable (a file open in an editor, a permission problem), the interface says so specifically rather than reporting a generic failure, since the user resolving it and clicking retry is the intended path.

# Plans

No child plans yet.

# Cursor

Freshly framed from the root's answered design forks; nothing designed yet. Blocked in practice on the engine and registry contracts taking shape first — its own design (IPC surface, view structure, env-editor UX) starts once those seams exist on paper.

# Open threads

No open threads yet.
