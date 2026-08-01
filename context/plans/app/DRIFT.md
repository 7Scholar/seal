# Drift — context/plans/app/

> Reconcile this by following `docs/plans/CODE_DRIFT.md` — read the docs and code, realign them, then re-record
> with the `add_to_coverage` / `remove_from_coverage` scripts. Never hand-edit `coverage.json` or this file: the
> stored value is the last-reconcile **commit SHA** (not a blob hash), and both files are script-generated.

## desktop/first-open.md

- changed ui/ipc.ts
  df765b7 (9 files) "registry: return the repository's structure, not only its candidates"

## desktop/journey-harness.md

- changed e2e/journeys/first-run.e2e.ts
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"

## desktop/lifecycle.md

- changed src-tauri/src/lifecycle.rs
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"
  df765b7 (9 files) "registry: return the repository's structure, not only its candidates"
- changed src-tauri/tests/lifecycle.rs
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"
  df765b7 (9 files) "registry: return the repository's structure, not only its candidates"

## desktop/ui/repo-layer/vocabulary.md

- changed e2e/journeys/first-run.e2e.ts
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"
- changed src-tauri/src/lifecycle.rs
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"
  df765b7 (9 files) "registry: return the repository's structure, not only its candidates"
- changed src-tauri/tests/lifecycle.rs
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"
  df765b7 (9 files) "registry: return the repository's structure, not only its candidates"
- changed ui/ipc.ts
  df765b7 (9 files) "registry: return the repository's structure, not only its candidates"
- changed ui/screens/ManageFlow.test.tsx
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"
  df765b7 (9 files) "registry: return the repository's structure, not only its candidates"
- changed ui/screens/ManageFlow.tsx
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"
- changed ui/styles.css
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"

## desktop/ui/screens.md

- changed ui/screens/ManageFlow.test.tsx
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"
  df765b7 (9 files) "registry: return the repository's structure, not only its candidates"
- changed ui/screens/ManageFlow.tsx
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"
- changed ui/styles.css
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"

## desktop/ui/shell-layout.md

- changed e2e/journeys/first-run.e2e.ts
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"
- changed ui/styles.css
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"

## desktop/ui/shell.md

- changed ui/ipc.ts
  df765b7 (9 files) "registry: return the repository's structure, not only its candidates"

## registry.md

- changed crates/seal-registry/src/scan.rs
  df765b7 (9 files) "registry: return the repository's structure, not only its candidates"
- changed crates/seal-registry/tests/scan.rs
  b56c626 (13 files) "ui: draw the repository as a tree on the manage surface"
  df765b7 (9 files) "registry: return the repository's structure, not only its candidates"

## Uncovered

- ui/components/FileTree.test.tsx
  b56c626 (born) "ui: draw the repository as a tree on the manage surface"
- ui/components/FileTree.tsx
  b56c626 (born) "ui: draw the repository as a tree on the manage surface"
