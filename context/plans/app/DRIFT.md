# Drift — context/plans/app/

> Reconcile this by following `docs/plans/CODE_DRIFT.md` — read the docs and code, realign them, then re-record
> with the `add_to_coverage` / `remove_from_coverage` scripts. Never hand-edit `coverage.json` or this file: the
> stored value is the last-reconcile **commit SHA** (not a blob hash), and both files are script-generated.

## desktop/ui/shell.md

- changed package.json
  37ab17c (10 files) "ui: the shared primitives, with their behavioural rules pinned by test"
- changed ui/App.tsx
  191126f (11 files) "ui: the screens — repo list, unlock, acknowledgement, and the app shell"
- changed ui/main.tsx
  191126f (11 files) "ui: the screens — repo list, unlock, acknowledgement, and the app shell"
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
- ui/env.d.ts
  191126f (born) "ui: the screens — repo list, unlock, acknowledgement, and the app shell"
- ui/format.ts
  37ab17c (born) "ui: the shared primitives, with their behavioural rules pinned by test"
- ui/screens/Acknowledge.test.tsx
  191126f (born) "ui: the screens — repo list, unlock, acknowledgement, and the app shell"
- ui/screens/Acknowledge.tsx
  191126f (born) "ui: the screens — repo list, unlock, acknowledgement, and the app shell"
- ui/screens/EnvEditor.test.tsx
  a178e82 (born) "ui: the env editor and the import flow"
- ui/screens/EnvEditor.tsx
  a178e82 (born) "ui: the env editor and the import flow"
- ui/screens/ImportFlow.test.tsx
  a178e82 (born) "ui: the env editor and the import flow"
- ui/screens/ImportFlow.tsx
  a178e82 (born) "ui: the env editor and the import flow"
- ui/screens/RepoList.test.tsx
  191126f (born) "ui: the screens — repo list, unlock, acknowledgement, and the app shell"
- ui/screens/RepoList.tsx
  191126f (born) "ui: the screens — repo list, unlock, acknowledgement, and the app shell"
- ui/screens/Unlock.test.tsx
  191126f (born) "ui: the screens — repo list, unlock, acknowledgement, and the app shell"
- ui/screens/Unlock.tsx
  191126f (born) "ui: the screens — repo list, unlock, acknowledgement, and the app shell"
- ui/styles.css
  191126f (born) "ui: the screens — repo list, unlock, acknowledgement, and the app shell"
- ui/test-setup.ts
  37ab17c (born) "ui: the shared primitives, with their behavioural rules pinned by test"
