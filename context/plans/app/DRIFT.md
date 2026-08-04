# Drift — context/plans/app/

> Reconcile this by following `docs/plans/CODE_DRIFT.md` — read the docs and code, realign them, then re-record
> with the `add_to_coverage` / `remove_from_coverage` scripts. Never hand-edit `coverage.json` or this file: the
> stored value is the last-reconcile **commit SHA** (not a blob hash), and both files are script-generated.

## desktop/ui/shell.md

- changed package.json
  7a5177e (9 files) "journeys: drive the deploy script across both binaries"

## publishing/tooling.md

- changed package.json
  7a5177e (9 files) "journeys: drive the deploy script across both binaries"

## Uncovered

- e2e/cli/deploy-script.sh
  7a5177e (born) "journeys: drive the deploy script across both binaries"
- e2e/journeys/deploy-script.e2e.ts
  7a5177e (born) "journeys: drive the deploy script across both binaries"
- e2e/wdio.deploy.conf.ts
  7a5177e (born) "journeys: drive the deploy script across both binaries"
