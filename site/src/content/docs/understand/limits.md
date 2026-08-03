---
title: What Seal does not protect
description: The threat model in full — what Seal defends against, what it does not, and the two things it can never do.
---

This page states the boundary of Seal's guarantee. It is the longest page on this site deliberately: a security tool that is vague about its limits is worse than one that has fewer of them, because you cannot make a good decision about a protection you misunderstand.

## What Seal defends against

An adversary that can **read the machine at rest**: an AI agent with filesystem access, a malicious dependency, a stolen laptop, a backup or sync service, a snapshot.

Against that adversary, a sealed file's contents are unreadable — because the only key is a password that exists nowhere on the machine.

## What Seal does not defend against

An adversary observing the machine **while you are actively resolving a secret**.

At the moment of resolution the plaintext necessarily exists: in the resolving process's memory, in whatever the caller does with it, and in the unlocked application's memory during a session. A process able to read another process's memory, log your keystrokes, or capture the application's session state defeats Seal by definition, and no amount of engineering inside Seal changes that.

**The guarantee is about data at rest, not data in use.** Seal must never be described as defending against the second, and this page exists partly so that nobody has to guess whether a given limit is a bug.

## The two absolute limits

These are stated as limits rather than caveats, because neither has a workaround and neither will ever gain one.

### Sealing protects from that moment on; it cannot reach backwards

Replacing a plaintext file unlinks the old contents but cannot overwrite them.

On the copy-on-write filesystems and solid-state storage this application targets, overwriting in place is not achievable **in principle** — snapshots, wear-levelling and unallocated blocks can retain the old contents for an unbounded time, and no user-space tool can promise otherwise.

So a secret that has already sat unprotected on the disk, in a backup, or in a snapshot is **not made safe by sealing it now**. A credential that was exposed should be **rotated**, not merely sealed.

Claiming to wipe the plaintext would be worse than saying nothing, because it would be false.

### A forgotten password means the data is gone

Permanently. There is no recovery path, no escrow, and no backdoor.

Any of those would be a copy of the key living on the machine, which is exactly what Seal exists to avoid. A recovery key sealed alongside the password is not available either: the age format forbids combining a passphrase with any other recipient in one file, so the choice of standard-age compatibility closes that door by construction.

The application makes you acknowledge this before you seal anything for the first time.

## Sealing does not reach processes that already had the file open

A program holding a file descriptor from before the seal keeps reading the original plaintext through it, invisibly. The old contents survive as an unnamed file that appears in no directory listing and lives until that descriptor closes.

This is verified behaviour, not a theoretical concern. The honest statement is that **sealing governs future opens rather than revoking access already granted** — one more reason an exposed credential is rotated rather than merely sealed.

## An editor that read the file earlier can overwrite the sealed file

This hazard cannot be prevented by checking whether a file is open, and Seal does not claim to.

Measured: an editor with files open in tabs holds **no descriptor** on any of them, so a descriptor check reports "safe" throughout the exact sequence that loses the secret.

Seal therefore warns on a file modified moments ago rather than asserting a file is unused, and treats detection after the fact — reconciliation noticing a sealed file that became plaintext — as the primary defence.

## The remaining exposures, stated rather than accepted silently

- **A sealed file's size reveals the approximate size of its plaintext.** The number of variables in an env file is inferable by anyone who can see the file. This is acceptable, but it is not nothing, and it should not be described as leaking nothing.
- **Plaintext held in memory may be written to swap** by the operating system, which is outside Seal's control. **Full-disk encryption is a stated prerequisite** for the guarantee, not an optional extra.

## Reporting something

Attacks requiring an adversary who can already read process memory during an unlocked session are **out of scope by design**, so a reporter is not left guessing whether the limit is a bug.

Anything else, see the [security policy](/seal/reference/security/).
