# Drift — context/plans/app/

> Reconcile this by following `docs/plans/CODE_DRIFT.md` — read the docs and code, realign them, then re-record
> with the `add_to_coverage` / `remove_from_coverage` scripts. Never hand-edit `coverage.json` or this file: the
> stored value is the last-reconcile **commit SHA** (not a blob hash), and both files are script-generated.

## desktop/dotenv.md

- changed crates/seal-dotenv/src/lib.rs
  de5eb59 (4 files) "model: grow the line model to structural mutation"
- changed crates/seal-dotenv/tests/roundtrip.rs
  de5eb59 (4 files) "model: grow the line model to structural mutation"

## Uncovered

- crates/seal-dotenv/tests/structural.rs
  de5eb59 (born) "model: grow the line model to structural mutation"
