# Drift — context/plans/app/

> Reconcile this by following `docs/plans/CODE_DRIFT.md` — read the docs and code, realign them, then re-record
> with the `add_to_coverage` / `remove_from_coverage` scripts. Never hand-edit `coverage.json` or this file: the
> stored value is the last-reconcile **commit SHA** (not a blob hash), and both files are script-generated.

## engine/replace.md

- changed Cargo.toml
  ad7859e (7 files) "registry: state model and store with lost-update prevention"

## Uncovered

- crates/seal-registry/Cargo.toml
  ad7859e (born) "registry: state model and store with lost-update prevention"
- crates/seal-registry/src/lib.rs
  ad7859e (born) "registry: state model and store with lost-update prevention"
- crates/seal-registry/src/state.rs
  ad7859e (born) "registry: state model and store with lost-update prevention"
- crates/seal-registry/src/store.rs
  ad7859e (born) "registry: state model and store with lost-update prevention"
- crates/seal-registry/tests/store.rs
  ad7859e (born) "registry: state model and store with lost-update prevention"
