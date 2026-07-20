# Drift — context/plans/app/

> Reconcile this by following `docs/plans/CODE_DRIFT.md` — read the docs and code, realign them, then re-record
> with the `add_to_coverage` / `remove_from_coverage` scripts. Never hand-edit `coverage.json` or this file: the
> stored value is the last-reconcile **commit SHA** (not a blob hash), and both files are script-generated.

## desktop/ui/shell.md

- changed package.json
  37ab17c (10 files) "ui: the shared primitives, with their behavioural rules pinned by test"
- changed vite.config.ts
  37ab17c (10 files) "ui: the shared primitives, with their behavioural rules pinned by test"

## Uncovered

- ui/components/Confirm.test.tsx
  37ab17c (born) "ui: the shared primitives, with their behavioural rules pinned by test"
- ui/components/Confirm.tsx
  37ab17c (born) "ui: the shared primitives, with their behavioural rules pinned by test"
- ui/components/ExposureAlert.test.tsx
  37ab17c (born) "ui: the shared primitives, with their behavioural rules pinned by test"
- ui/components/ExposureAlert.tsx
  37ab17c (born) "ui: the shared primitives, with their behavioural rules pinned by test"
- ui/components/SecretValue.test.tsx
  37ab17c (born) "ui: the shared primitives, with their behavioural rules pinned by test"
- ui/components/SecretValue.tsx
  37ab17c (born) "ui: the shared primitives, with their behavioural rules pinned by test"
- ui/format.ts
  37ab17c (born) "ui: the shared primitives, with their behavioural rules pinned by test"
- ui/test-setup.ts
  37ab17c (born) "ui: the shared primitives, with their behavioural rules pinned by test"
