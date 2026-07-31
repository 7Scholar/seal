# Drift — context/plans/app/

> Reconcile this by following `docs/plans/CODE_DRIFT.md` — read the docs and code, realign them, then re-record
> with the `add_to_coverage` / `remove_from_coverage` scripts. Never hand-edit `coverage.json` or this file: the
> stored value is the last-reconcile **commit SHA** (not a blob hash), and both files are script-generated.

## cli.md

- changed crates/seal-cli/src/open.rs
  8d09388 (4 files) "cli: make the launcher's not-found test hermetic"
- changed crates/seal-cli/tests/contract.rs
  8d09388 (4 files) "cli: make the launcher's not-found test hermetic"
