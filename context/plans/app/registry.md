Part of [the root plan](README.md).

# Scope

The registry is Seal's cross-repo state: which folders are registered as seal repos, which files inside each repo are managed, each managed file's sealed-or-not tag, and whether a repo uses a passphrase override rather than the master one. It owns the persistence of that state, the reconciliation of recorded state against what is actually on disk, and the candidate scan that proposes secret files when a folder is registered. It is a Rust library with no dependency on Tauri and no path resolution of its own — the directory it stores state in is supplied by its caller, so the desktop app and the CLI both reach the same location while the library stays testable against a temporary directory. Out of scope: cryptography and file replacement (the engine's), any UI (the desktop app's), and deciding which passphrase to use (the registry reports that a repo *has* an override; collecting and applying passphrases belongs to the consumers).

# What exists

The state model, the store, reconciliation, and the candidate scan, implemented and verified as a Rust library with no Tauri dependency and no path resolution of its own.

**The store** holds one JSON file whose directory and contents are owner-only by explicit permission rather than umask default, since the registry names exactly where every secret on the machine lives. Unknown fields are carried through untouched and a file from a future version is readable but never rewritten, so an older Seal cannot destroy what a newer one recorded — live data loss on a machine where the application and the CLI can be at different versions. Writes replace the file atomically and keep the previous good copy. Updates guard against lost updates with a revision counter and retry, because atomic replacement prevents a torn file but not two writers each erasing the other's change.

**Reconciliation** compares the record against disk and reports each divergence with the observed state. A file recorded as sealed that is now plaintext is the case that demands attention, and it is never absorbed into the record — that is the verified editor-clobber failure, and quietly recording it would replace an alert with a shrug. Benign divergences (a file gone missing, a file sealed outside Seal) can be applied to the record. The fingerprint comparison reports whether the file's identity changed, which distinguishes an external replacement from an in-place edit.

**The candidate scan** walks with the ignore machinery disabled and prunes noise directories by filtering entries, for the two measured reasons in the root `MEMORY.md`. Candidates are classified secret, template, or ambiguous: env files and well-known credential files are pre-selected, the conventionally-committed example and sample variants are shown as recognised but never pre-selected, and genuinely contested names are surfaced unselected. A public key is never proposed as a private one.

Verified by twenty-three tests, including the exact inversion that research measured — a repo whose gitignore hides four real secrets while exposing only the committed example — plus a sealed file overwritten by an editor's atomic save being reported as alarming with its identity change detected, and two deterministic concurrency tests that interleave a competing write inside the update. The gitignore behaviour, the alarm, and the lost-update guard were each confirmed non-vacuous by breaking them.

# Approach

## What is stored, and where

One JSON file in a caller-supplied per-user application directory, holding a schema version, a monotonic revision counter, and the list of registered repos; each repo carries its absolute path, whether it uses a passphrase override, and its managed files; each managed file carries its path relative to the repo root, its last-known classification, and the identity fingerprint recorded when Seal last wrote it.

JSON rather than a configuration-oriented format because this is machine-written state that a user reads only when diagnosing something, not a file they hand-author: it round-trips losslessly, imposes no restrictions on top-level shape or absent values, and nobody expects comments in it. One file rather than a file per repo because writes are whole-registry operations and sharding multiplies the concurrency surface without removing it. The state contains **no secrets**, but it is security-relevant in its own right — it is an index of exactly where every secret file on the machine lives — so its directory is created with owner-only permissions and the file itself owner-only, explicitly rather than by inheriting a default that would leave it world-readable. Where a platform distinguishes roaming from local application data, the local one is used, so that a corporate profile-sync mechanism does not quietly copy that index off the machine.

## Surviving its own future versions

The file opens with a version number and every added field tolerates absence, so an ordinary addition needs no migration at all. Migrations are a hand-written chain applied **in memory on load**, writing back only when there is something else to write; a version-too-new file is readable but never rewritten, so an older CLI can still list repos from a file a newer app wrote instead of destroying it. Unknown fields are captured and written back rather than dropped: because a desktop app and a separate CLI binary can be at different versions on one machine, silently discarding fields the running version does not recognize is live data loss rather than a theoretical concern. Unknown fields are never rejected outright, since refusing to read a file from the future turns forward-compatibility into a crash.

## Concurrent writers

Every write replaces the file atomically through the same discipline the engine uses for managed files, and keeps the previous good copy alongside it so a corrupt state file is recoverable rather than fatal.

Atomicity is not sufficient on its own, and this is the part worth stating plainly: two processes that each read the state, change different parts of it, and each write atomically produce a file where the second silently erased the first's change. Atomic replacement prevents a torn file, not a lost update. The registry therefore guards writes with the revision counter — a writer records the revision it read, and a write that finds the revision changed underneath it re-reads, re-applies, and retries rather than overwriting. This is chosen over file locking deliberately: advisory locks are advisory, so they bind only cooperating processes, and they are ignored outright by at least one common file-syncing mechanism that users routinely keep their projects inside. The counter needs no cooperation from anyone. The desktop app remains the expected single writer in normal operation, with the CLI reading far more often than it writes; the counter is what makes the uncommon case correct rather than merely unlikely.

## Reconciliation: the recorded state is a claim, not the truth

The registry never trusts its own record of a file's state. What it stores is what Seal last observed; what matters is what is on disk now, and the two diverge in ordinary use — files are deleted, moved, renamed, sealed with stock tooling outside the app, restored from a backup in the wrong state, or silently overwritten by a program that had them open. Reconciliation is therefore a first-class operation rather than a repair path: given the recorded state it re-classifies every managed file and reports the differences as a structured result the UI presents and the user acts on.

The divergence that matters most is a file recorded as sealed that is now plaintext. This is the verified editor-clobber failure (see the engine's `MEMORY.md`): a program holding a managed file open when it is sealed overwrites the sealed file with plaintext on its next save, with no error and no conflict, because it is writing a buffer read before the seal. It is not an exotic case — replacing a file rather than writing it in place is the default in many common editors and in ordinary in-place stream editing from a shell. Detection compares the whole identity fingerprint rather than any single field, because the two shapes of clobber disturb different parts of it. A file found in this state is surfaced as an alert demanding attention, never quietly re-recorded, because the user's secret is now sitting in the clear in a repository.

Reconciliation runs on demand and whenever the app takes focus, because a full sweep across a realistic number of repos costs on the order of a second. Filesystem watching is a latency optimization layered on top, never the mechanism correctness depends on: one platform charges a watch per directory against a per-user budget that a single dependency tree can exhaust, so a watcher must degrade to scanning rather than fail. Where watches are used they target directories, per the engine's `MEMORY.md`.

## Identity is the path

A managed file is identified by its path within its repo, and reconciliation is what keeps that honest. Inode-style identity is recorded as part of the fingerprint for change *detection*, but is never the key: the tools users edit these files with routinely and legitimately give a file a new inode on an ordinary save, so treating that as "a different file" would be wrong far more often than right. A file that disappears from its path is reported as missing rather than hunted for.

## The candidate scan

Registering a folder walks it for candidate secret files and presents them for the user to confirm or reject. Two constraints on that walk are recorded in the root `MEMORY.md` and are correctness requirements rather than preferences: the walk **does not respect gitignore rules**, because secret files are gitignored precisely because they are secret — a gitignore-respecting scan was measured returning only the committed example template while concealing every real secret — and noise directories are pruned by filtering entries during the walk rather than by adding include-globs, whose inverted semantics were measured silently re-admitting a secret under a build directory.

Candidates are classified into three confidence levels rather than presented as a flat list, because the distinction is what keeps the flow safe: **secret** (the env-file forms and the well-known credential and key files), **template** (the conventionally-committed example, sample, and dist variants), and **ambiguous** (forms that are genuinely contested, which some ecosystems commit and others do not). Templates are shown as recognized-and-excluded rather than hidden, so the user can see the scan understood them; they are never pre-selected. Ambiguous candidates are surfaced unselected and labelled with why they are uncertain. The user's confirmation is what makes a candidate managed; the scan only ever proposes.

# Steps

- [x] Define the state shape, the versioning and migration mechanism, and the unknown-field passthrough.
- [x] Implement load and store: atomic replacement, owner-only permissions, previous-good copy, and the revision compare-and-retry.
- [x] Implement reconciliation against disk, returning a structured difference including the sealed-became-plaintext alert.
- [x] Implement the candidate scan with the three-way classification.
- [x] Unit tests: migration from each historical version, unknown-field round-trip, concurrent-writer lost-update prevention, permission assertions, and reconciliation against every divergence shape.
- [x] Test scripts: a realistic multi-repo tree exercising the scan, reconciliation after external mutation, and a state file from a future version.

# Open threads

- Reconciliation reports a clobbered file and does not offer to re-seal it, since re-sealing plaintext an editor may still hold open invites a second clobber. Revisit when the desktop application's alert flow is designed, where the user can be told to close the file first.
- The candidate pattern set covers env files, the common credential and key names, and the conventionally-committed template variants. A published filename ruleset exists and would broaden it; fold that in rather than inventing patterns, and weigh each addition against the cost of a false positive, which teaches users the scan cannot be trusted.
- Whether the CLI should write state at all, or delegate every mutation to the running app when one is up. The revision counter makes concurrent writing correct either way, so this is a simplicity question rather than a correctness one.
