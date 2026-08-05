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

Saving preserves the state the file was in: a sealed file stays sealed, a readable one stays readable. The save button says which it will do. Editing and sealing are separate decisions, so a save never changes whether a file is protected — that is what Seal and Unseal are for.

If the application stopped holding a file's contents while you were away, the first thing you do that needs them locks Seal rather than leaving you stuck. Unlocking takes you back to the file and the row you were working on.

Files that are **not** env files are stored and encrypted as they are, never edited. The application contains no general-purpose file editor: a managed `.tfvars` or JSON file opens as a plain statement of what it is, with no editing surface at all.

## Looking at a file never decrypts it on disk

A file opened for viewing or editing has its plaintext held in memory while the file itself stays sealed at its path. That plaintext is discarded when you lock, when you quit, and automatically after fifteen minutes.

This is the distinction worth holding on to: **reading a secret and changing a file's state are different operations.** You never have to decrypt a file on disk to look at what is in it, so a file is never left readable as a side effect of checking a value.

## Sealing and unsealing

Both are deliberate, and both are reversible.

**Seal** makes a managed file unreadable at rest. **Unseal** makes it readable again and Seal keeps managing it — the file stays in your repository list, and you can seal it again from the same row. Unsealing asks you to confirm first, and says plainly that the contents become readable on disk and stay that way until you seal them again.

A file you have unsealed deliberately is not treated as a problem. The exposure alert is reserved for a different thing: a file Seal recorded as sealed that it finds readable on disk — something changed it behind your back. That is worth telling you about; your own deliberate choice is not.

Removing a file from management also leaves it readable at its path, and the application says so when you do it.
