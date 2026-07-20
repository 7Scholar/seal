# UX research: Seal's interface

Produced by following [the research procedure](../../../../../../docs/UX_RESEARCH.md). This document is the design input for `ui/`: the Approach is built from it rather than re-derived.

# Concern

Seal's entire interface, in a Tauri 2 desktop window with a React + TypeScript frontend. It is a **single-user, local-only** application: no accounts, no teams, no roles, no server, no audit log, and no network at all. Everything it shows lives on this machine.

Three surfaces make up the whole product, and each has strong prior art:

- **The cross-repo view** — registered repos and their managed files, each tagged sealed, plaintext or missing. One state is an alert rather than a tag: a file Seal recorded as sealed but found in the clear means a secret is exposed right now.
- **The import flow** — point at a folder, scan it, present candidates classified secret / ambiguous / template with only secrets preselected, toggle and confirm. Import never encrypts anything.
- **The environment-variables editor** — per-variable rows for env files, modelled on Vercel's, which the product intent names explicitly.

Plus two session-shaped flows: unlock/lock, and the supervised master-password change.

## Constraints the interface cannot design around

These are fixed by the layers beneath and are the yardstick for every finding below.

- **The frontend never holds a file's plaintext.** It receives variable names with values masked. One value crosses only when the user reveals that single row, and it arrives as raw bytes. Anything sent to the webview has left Seal's control permanently, so the design minimises what crosses rather than cleaning up after.
- **Reveal-per-row is required, not optional.** Hosted platforms make sensitive values permanently unreadable once written. That is right for a service holding a secret for you and wrong here: Seal edits a file the user owns, and an unreadable value can only be overwritten blind.
- **Only env files are editable.** Every other managed file opens opaque — name and size, no content, no editing.
- **Saving preserves the file byte-for-byte except where a value changed**, including comments, ordering, quoting and newline style.
- **Two irreversible facts must be acknowledged before anything is sealed**, and the acknowledgement is enforced in Rust: a forgotten password loses the data permanently, and sealing cannot reach backwards over a secret already exposed on disk.
- **The window persists nothing.** The webview's store is memory-only and a strict content-security policy applies, so no interface state survives a restart and nothing may be fetched from a network.
- **There is no existing visual family to mirror.** This is the first surface in the product, so the family is being established here rather than matched. That makes internal consistency across the three surfaces the thing to hold, and it is why the synthesis fixes shared behaviour once rather than per screen.

# Sources surveyed

To be filled in from the surveys in flight.

# Findings

To be filled in.

# Best-practice rules

To be filled in.

# Synthesis / proposal

To be filled in.

# Open threads

To be filled in.
