---
title: Using Seal from scripts
description: Resolve a sealed file at the moment of use, load a whole env file, and handle exit codes and automation without a terminal.
---

A deploy script asks for a file's contents at the moment it needs them, rather than keeping a decrypted copy anywhere.

```bash
value=$(seal resolve .env.production)
```

The password is typed on your terminal; only the file's contents reach standard output, byte for byte. Nothing is written to disk.

## Loading a whole env file

```bash
payload=$(seal resolve .env.production)
set -a
eval "$payload"
set +a
```

Use this rather than `source <(seal resolve .env.production)`, which looks equivalent but **silently produces empty variables** on the version of bash that ships with macOS. The process substitution and the password prompt contend for the terminal, and the failure is quiet — your script runs with empty credentials rather than stopping.

## Exit codes

Exit codes distinguish what a script would act on differently:

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `3` | Wrong password |
| `4` | No such file |
| `5` | Not a sealed file |
| `6` | The file is busy |
| `7` | The file is damaged |
| `8` | No terminal available to ask for a password |
| `130` | Cancelled |

A wrong password and a missing file are deliberately different codes. Some tools in this space flatten both into a generic failure, which leaves a script unable to tell a typo from a path that moved.

## Automation without a terminal

Supply the password on a file descriptor:

```bash
seal resolve .env.production --passphrase-fd 3 3<secret-source
```

**Never through an environment variable**, which leaks into process listings and CI logs — the exact exposure Seal exists to prevent.

## The window where plaintext exists

At the moment of resolution the plaintext necessarily exists, in this process's memory and in whatever your script does with it. Keeping that window short is the point of resolving at the moment of use rather than decrypting ahead of time. [The limits](/seal/understand/limits/) states what this does and does not protect against.
