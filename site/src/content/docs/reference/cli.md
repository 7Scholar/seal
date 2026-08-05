---
title: Command line
description: Every subcommand, flag, exit code and environment variable, with what each one guarantees.
---

## `seal resolve`

Writes a sealed file's plaintext to standard output, prompting for the password on the terminal.

```bash
seal resolve <path> [--passphrase-fd <fd>]
```

Only the file's contents reach standard output, byte for byte. Nothing is written to disk. The prompt and every diagnostic go to standard error, so redirecting standard output captures the secret and nothing else.

`--passphrase-fd <fd>` reads the password from a file descriptor instead of the terminal, for automation. Never pass a password through an environment variable — it leaks into process listings and CI logs. There is deliberately no variable for it.

## `seal status`

Reports whether a path is sealed, without asking for a password.

```bash
seal status <path>
```

Writes one word to standard output — `sealed`, `plaintext` or `absent` — and sets the matching exit code, so a script can branch on either. No password is read and the file's contents are never opened.

## `seal open`

```bash
seal open
```

Launches the desktop application and returns immediately.

It looks for the application beside the `seal` binary you ran first, then for one registered on your system, then in the platform's conventional install locations. If it finds none it says so and exits `9` rather than appearing to do nothing. That order is what makes it predictable in a source checkout: `./target/release/seal open` opens the build you just made, rather than an older copy installed elsewhere.

## Global flags

`seal --version` prints the version and exits. `seal --help` prints the usage summary, and `seal help <command>` prints the detail for one subcommand. Each is available before any subcommand and exits without touching a file.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Failed for any other reason |
| `3` | Wrong password |
| `4` | No such file |
| `5` | Not a sealed file |
| `6` | The file is busy |
| `7` | The file is damaged |
| `8` | No terminal available to ask for a password |
| `9` | No Seal application found to open |
| `130` | Cancelled |

A wrong password and a missing file are deliberately distinct, so a script can tell a typo from a path that moved.

## Environment

| Variable | Effect |
| --- | --- |
| `SEAL_IGNORE_INSTALLED_APP` | Stops `seal open` after the sibling check, so nothing installed elsewhere on the machine is consulted |
| `SEAL_INSTALL_DIR` | Where the installer script places the binary. Read by the installer, not by `seal` |

[Using Seal from scripts](/seal/guides/scripts/) has the worked patterns.
