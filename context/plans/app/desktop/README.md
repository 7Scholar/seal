# Intent

## What & why

The desktop application is Seal's face and the reason it is an application at all: a Tauri 2 app with a React + TypeScript (Vite) frontend where all management happens. It spans the Rust shell (window and app lifecycle, the IPC command surface, capability configuration, the unlocked-session state) and the UI (the cross-repo view of repos and managed files with their sealed/unsealed tags, the repo import flow with its candidate confirmation, seal/unseal actions, the explicit session seal/unseal control, and the dedicated Vercel-style environment-variables editor for env files — the only editing surface, since non-env files are never edited in the app). It consumes the engine and the registry through a thin command layer per the Tauri practices doc. It is done when a user can do everything the root intent promises through the UI, with the session model the root Approach fixes: unlocked by password, ended by quit or the seal action.

## Approach

TBD.

# Plans

No child plans yet.

# Cursor

Freshly framed from the root's answered design forks; nothing designed yet. Blocked in practice on the engine and registry contracts taking shape first — its own design (IPC surface, view structure, env-editor UX) starts once those seams exist on paper.

# Open threads

No open threads yet.
