---
title: Managing files in the application
description: How the application proposes files, why only likely secrets are pre-selected, and what the env-file editor will not do.
---

The desktop application is where files are managed, across every repository on the machine.

## Bringing a repository under management

You point the application at a repository, and it draws the repository as itself — the real directory structure, every file selectable — rather than a list of paths Seal chose. Files that look like they hold secrets are annotated with the reason they were proposed: env files, key files, credential files, each classified as a likely secret, a possible one, or a template meant to stay readable.

**Only the likely secrets are pre-selected.** Managing a file that was meant to be readable encrypts it and breaks your build, so the default is what is safe when accepted without reading. Possible secrets and templates are visible, annotated, and unchecked.

A folder's checkbox selects the **detected** files beneath it, recursively — never every file beneath it. Checking `src/` in a monorepo selects the secrets under it and leaves the source alone. An undetected file is still selectable on its own row, but the tree expands to follow the detected files, so reaching it means opening the folders down to it or using the filter.

Confirming **encrypts nothing**. It records which files Seal manages. Files stay where they are: nothing is moved, renamed, or copied. A rescan of a repository already under management changes nothing already managed.

Directories Seal did not walk — `node_modules` and anything else pruned — are drawn as rows and marked as not looked in, but do not expand. The row is an answer, not a door.

## Sealing

Sealing is separate from managing, and deliberate.

Before anything is sealed for the first time, the application asks you to acknowledge two facts it cannot soften: that a forgotten password loses the data permanently, and that sealing cannot protect a secret that was already exposed.

Sealing replaces the file atomically and preserves its permissions, so a `0600` secrets file stays `0600` rather than being quietly widened.

## Editing env files

Env files get a per-variable editor. Values are masked, and a value is fetched only when you ask to see that one row — the application holds no more of the file than the row on screen.

Saving preserves your comments, ordering, quoting and line endings exactly, changing only the lines whose value you changed.

Revealing a value is not an edit and never marks the file as changed.

Files that are **not** env files are stored and encrypted as they are, never edited. The application contains no general-purpose file editor: a managed `.tfvars` or JSON file opens as a plain statement of what it is, with no editing surface at all.

## Unsealing is a memory operation

A file opened for viewing or editing has its plaintext held in memory while the file itself stays sealed at its path. That plaintext is discarded when you lock, when you quit, and automatically after fifteen minutes.

There is no way to leave a managed file decrypted on disk. The on-disk state moves from plaintext to sealed and never back — the only action that legitimately ends with plaintext at the path is removing the file from management, and the application says so when you do it.
