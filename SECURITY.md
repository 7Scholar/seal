# Security

## What Seal protects

Seal encrypts secret files in place so their contents cannot be read at rest. It defends against anything that can read the machine as you: an agent with filesystem access, a stolen laptop, a backup or sync service, a malicious dependency.

It does **not** defend against an attacker observing the machine while a secret is actively being used. At the moment of resolution the plaintext exists in memory, and a process able to read another process's memory defeats any tool of this kind. Full-disk encryption is assumed, since plaintext held in memory may be written to swap.

Two limits are absolute and are not bugs:

- **A forgotten password cannot be recovered.** There is no escrow, no recovery key, and no backdoor. Any of those would be a copy of the key living on the machine, which is what Seal exists to prevent. The file format forecloses adding one.
- **Sealing cannot reach backwards.** A secret that already sat unprotected on disk may persist in snapshots, backups, or unallocated blocks. Rotate a credential that was exposed; sealing it now does not undo the exposure.

## Reporting a vulnerability

Report privately through GitHub's security advisory form for this repository rather than opening a public issue. Please include what you did, what you observed, and what you expected — a reproduction is worth more than a description.

You will get an acknowledgement. If the report is valid, the fix and its disclosure will be coordinated with you.

## What is in scope

Anything that lets sealed contents be read without the password, weakens the encryption below what the format specifies, causes a sealed file to be silently written back in the clear, or loses data during sealing, unsealing or a password change.

Also in scope: any way for the interface to obtain more secret material than the user asked for, since the boundary between the Rust process and the webview is deliberately narrow.

## What is not in scope

Attacks that require an adversary already able to read the memory of a running process, log keystrokes, or execute code as the user during an unlocked session. Those defeat the tool by definition and are stated as such rather than treated as defects.
