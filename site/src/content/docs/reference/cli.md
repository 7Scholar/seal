---
title: Command line
description: Every subcommand, flag and exit code of the Seal command-line tool.
---

## `seal resolve`

Writes a sealed file's plaintext to standard output, prompting for the password on the terminal.

```bash
seal resolve <path> [--passphrase-fd <fd>]
```

Only the file's contents reach standard output, byte for byte. Nothing is written to disk. The prompt and every diagnostic go to standard error, so redirecting standard output captures the secret and nothing else.

`--passphrase-fd <fd>` reads the password from a file descriptor instead of the terminal, for automation. Never pass a password through an environment variable — it leaks into process listings and CI logs.

## `seal open`

```bash
seal open
```

Launches the desktop application and returns immediately.

It looks for the application beside the `seal` binary you ran first, then for one installed on your system. If it finds none it says so and exits non-zero rather than appearing to do nothing. That order is what makes it predictable in a source checkout.

## `seal --version`

Prints the version and exits.

## Exit codes

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

A wrong password and a missing file are deliberately distinct, so a script can tell a typo from a path that moved.

## Environment

| Variable | Effect |
| --- | --- |
| `SEAL_INSTALL_DIR` | Where the installer script places the binary |

[Using Seal from scripts](/seal/guides/scripts/) has the worked patterns.
