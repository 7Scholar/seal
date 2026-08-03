---
title: How it works
description: A sealed file is a standard age file with a passphrase, replaced atomically in place, opened only by a password that exists nowhere on the machine.
---

## A sealed file is a standard age file

A sealed file is a **standard [age](https://age-encryption.org) file** with an scrypt passphrase recipient — nothing proprietary.

This matters more than it sounds. If Seal disappeared tomorrow, every sealed file would still open with the stock `age` tool and your password. Your data does not depend on this project continuing to exist, and that guarantee is verified in both directions by the test suite against the reference implementation.

The file stays ASCII-armored text, so it remains a well-behaved text file in a repository and is visibly, self-evidently sealed to anyone who opens it. Its contents are fully opaque — nothing of the original structure survives.

## Files stay where they are

Seal is a layer over your repositories, not a store that takes files somewhere. A `.env.production` sits where it always would, its existence and name plainly visible, its contents unreadable.

Sealing replaces the file **atomically** and preserves its permissions, so a `0600` secrets file stays `0600` rather than being quietly widened. A crash at any moment leaves either the complete old file or the complete new one, never a half-written one.

Whether sealed files are committed to git or ignored is your repository's decision. Seal manages no git state.

## The password model

One master password for everything by default, with an optional per-repository override. Passwords exist **only in your head** — never on the machine, in any form, at any time.

One password-derived artefact does live on disk: a sealed sentinel file recording that a master password exists, so an entered one can be checked before the session accepts it. It stores nothing recoverable, and its offline-guessing surface is the same scrypt stanza every sealed file already carries.

Because each sealed file carries its own password rather than pointing at a shared key, changing the master password re-seals every file under it. That cost buys real revocation rather than re-wrapping that leaves an already-captured key valid. The operation plans before touching anything, proves the new password by a round trip first, derives its progress from the files themselves so re-running is always safe, and retries transient failures rather than surfacing them.

## Resolution

Runtime resolution is a standalone command-line tool. A script asks it for a sealed file's contents, it prompts for the password on the terminal on every invocation, and it writes the plaintext to standard output for the caller to consume at the moment of use. It holds no session and never shares the application's unlocked state.

In the application, unsealing is a **memory operation and never a disk one**. A file opened for viewing has its plaintext held in memory while the file stays sealed at its path, discarded on lock, on quit, or automatically after fifteen minutes.

## Why the design looks like this

Every choice above answers one assumption: that an adversary can work its way around anything stored on the machine — any file, any credential store, anything reachable by a process running as you. So the barrier cannot live on the machine at all.

[What Seal does not protect](/seal/understand/limits/) states the boundary of that guarantee in full.
