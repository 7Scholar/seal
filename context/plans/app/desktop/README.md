# Intent

## What & why

The desktop application is Seal's face and the reason it is an application at all: a Tauri 2 app with a React + TypeScript (Vite) frontend where all management happens. It spans the Rust shell (window and app lifecycle, the IPC command surface, capability configuration, the unlocked-session state) and the UI (the cross-repo view of repos and managed files with their sealed/unsealed tags, the repo import flow with its candidate confirmation, seal/unseal actions, the explicit session seal/unseal control, and the dedicated Vercel-style environment-variables editor for env files — the only editing surface, since non-env files are never edited in the app). It consumes the engine and the registry through a thin command layer per the Tauri practices doc. It is done when a user can do everything the root intent promises through the UI, with the session model the root Approach fixes: unlocked by password, ended by quit or the seal action.

## Approach

TBD, except for one part of it that is decided and constrains the rest.

**Unsealing in the user interface never writes plaintext to disk.** Viewing or editing a sealed file loads its plaintext into memory only; the file on disk stays sealed throughout. Plaintext held this way is discarded when the user seals it again, when the application quits, and automatically after fifteen minutes without further action — whichever comes first. Saving an edit re-seals from memory. There is no state in which a managed file sits decrypted at its path, and no user action that produces one, so the failure where somebody unseals a file to check a value and leaves production credentials in a repository cannot occur.

Two consequences for the rest of the design. The fifteen-minute expiry is a property of the held plaintext rather than of the session as a whole, so it applies per file and a file whose time runs out while the application is still unlocked is cleared on its own. And because the application quitting is one of the clearing conditions, quitting must remain safe at any moment: unsaved edits are lost by design rather than flushed to disk, which is the correct trade for this product and must be made obvious in the interface rather than discovered.

# Plans

No child plans yet.

# Cursor

Freshly framed from the root's answered design forks; nothing designed yet. Blocked in practice on the engine and registry contracts taking shape first — its own design (IPC surface, view structure, env-editor UX) starts once those seams exist on paper.

# Open threads

No open threads yet.
