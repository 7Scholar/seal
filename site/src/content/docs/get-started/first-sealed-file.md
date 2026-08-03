---
title: Your first sealed file
description: The whole path in order — open the application, choose a master password, bring a repository under management, seal a file, and resolve it from a script.
---

This walks the path end to end. It assumes the command-line tool is [installed](/seal/get-started/install/) and the application is built.

## 1. Open the application

```bash
seal open
```

This launches the application and returns immediately. It looks for the application beside the `seal` binary you ran first, then for one installed on your system. If it finds none it says so and exits non-zero rather than appearing to do nothing.

In a source checkout, `./target/release/seal open` opens the build you just made rather than an older copy installed elsewhere.

## 2. Choose a master password

The first time Seal opens, it asks you to choose a master password rather than to enter one. You type it twice, because a typo you cannot see would seal your files behind a password you do not know.

This password exists **only in your head**. Seal does not store it, and there is no recovery path — see [the limits](/seal/understand/limits/) before you go further, because this is the decision that cannot be undone later.

What Seal does keep is a small sealed sentinel file, so that a password you type later can be checked before the session accepts it. It stores nothing that can be recovered.

## 3. Bring a repository under management

Point Seal at a repository. It draws the repository as itself — the real directory structure, every file visible — and looks for files that hold secrets, classifying each as a likely secret, a possible one, or a template meant to stay readable.

**Only the likely secrets are pre-selected.** Managing a file that was meant to be readable encrypts it and breaks your build, so the default is what is safe when accepted without reading.

A folder's checkbox selects the *detected* files beneath it, never every file beneath it. Checking `src/` in a monorepo selects the secrets under it and leaves a thousand source files alone.

Confirming here **encrypts nothing**. It records which files Seal manages. Your files stay where they are: nothing is moved, renamed, or copied.

## 4. Seal a file

Sealing is a separate, deliberate action.

Before anything is sealed for the first time, the application asks you to acknowledge two facts it cannot soften: that a forgotten password loses the data permanently, and that sealing cannot protect a secret that was already exposed.

Once sealed, the file stays at its own path. Its name and location are plainly visible; its contents are opaque. It remains an ASCII-armored text file, so it stays well-behaved in a repository and is self-evidently sealed to anyone who opens it.

## 5. Resolve it from a script

With the file sealed, a deploy script asks for its contents at the moment of use:

```bash
value=$(seal resolve .env.production)
```

The password is typed on your terminal; only the file's contents reach standard output, byte for byte.

To load a whole env file into the environment:

```bash
payload=$(seal resolve .env.production)
set -a
eval "$payload"
set +a
```

Use this rather than `source <(seal resolve .env.production)`, which looks equivalent but **silently produces empty variables** on the version of bash that ships with macOS.

[Using Seal from scripts](/seal/guides/scripts/) covers exit codes and automation without a terminal.

## What you have now

A repository whose secret files sit in their normal places, unreadable at rest, resolved only at the moment something legitimately asks for them — with the key existing nowhere on the machine.
