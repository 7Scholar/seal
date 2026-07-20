# Drift — context/plans/app/

> Reconcile this by following `docs/plans/CODE_DRIFT.md` — read the docs and code, realign them, then re-record
> with the `add_to_coverage` / `remove_from_coverage` scripts. Never hand-edit `coverage.json` or this file: the
> stored value is the last-reconcile **commit SHA** (not a blob hash), and both files are script-generated.

## cli.md

- changed crates/seal-cli/tests/contract.rs
  7131d87 (9 files) "desktop/shell: the session — dual-clock expiry, fail-closed access, explicit wipe"

## engine/format.md

- changed crates/seal-engine/tests/interop.rs
  7131d87 (9 files) "desktop/shell: the session — dual-clock expiry, fail-closed access, explicit wipe"

## engine/replace.md

- changed Cargo.toml
  7131d87 (9 files) "desktop/shell: the session — dual-clock expiry, fail-closed access, explicit wipe"

## Uncovered

- crates/seal-session/Cargo.toml
  7131d87 (born) "desktop/shell: the session — dual-clock expiry, fail-closed access, explicit wipe"
- crates/seal-session/src/clock.rs
  7131d87 (born) "desktop/shell: the session — dual-clock expiry, fail-closed access, explicit wipe"
- crates/seal-session/src/lib.rs
  7131d87 (born) "desktop/shell: the session — dual-clock expiry, fail-closed access, explicit wipe"
- crates/seal-session/tests/expiry.rs
  7131d87 (born) "desktop/shell: the session — dual-clock expiry, fail-closed access, explicit wipe"
