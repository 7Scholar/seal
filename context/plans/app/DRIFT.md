# Drift — context/plans/app/

> Reconcile this by following `docs/plans/CODE_DRIFT.md` — read the docs and code, realign them, then re-record
> with the `add_to_coverage` / `remove_from_coverage` scripts. Never hand-edit `coverage.json` or this file: the
> stored value is the last-reconcile **commit SHA** (not a blob hash), and both files are script-generated.

## desktop/commands.md

- changed src-tauri/src/app.rs
  95ee95e (9 files) "desktop/lifecycle: import, release, and the two gates on sealing"
- changed src-tauri/src/commands.rs
  95ee95e (9 files) "desktop/lifecycle: import, release, and the two gates on sealing"
- changed src-tauri/src/error.rs
  95ee95e (9 files) "desktop/lifecycle: import, release, and the two gates on sealing"
- changed src-tauri/tests/commands.rs
  95ee95e (9 files) "desktop/lifecycle: import, release, and the two gates on sealing"

## desktop/shell.md

- changed src-tauri/src/lib.rs
  95ee95e (9 files) "desktop/lifecycle: import, release, and the two gates on sealing"

## engine/operations.md

- changed crates/seal-engine/src/operations.rs
  95ee95e (9 files) "desktop/lifecycle: import, release, and the two gates on sealing"

## registry.md

- changed crates/seal-registry/src/state.rs
  95ee95e (9 files) "desktop/lifecycle: import, release, and the two gates on sealing"

## Uncovered

- src-tauri/src/lifecycle.rs
  95ee95e (born) "desktop/lifecycle: import, release, and the two gates on sealing"
- src-tauri/tests/lifecycle.rs
  95ee95e (born) "desktop/lifecycle: import, release, and the two gates on sealing"
