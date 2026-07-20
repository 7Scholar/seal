# Open questions

## 1. What should happen when the master password changes?

The design has no answer, and the review is right that this is the operation most likely to be used under pressure — a suspected compromise — while also being the longest-running and the most dangerous to interrupt.

Because sealed files are standard age files with the password baked into each file, changing the master password means **re-sealing every managed file in every repo that does not have its own override**. There is no cheap path: the alternative design (a wrapped key per file, so a password change re-wraps a small key instead of re-encrypting everything) was ruled out by your choice of plain age files, which buys the far more valuable guarantee that any sealed file opens with stock `age` tooling if Seal ever disappears. I think that trade is right, but it makes password change expensive and worth designing deliberately.

The failure mode to design against: 200 files across 20 repos, and file 47 fails. The user now has two live passwords, some files under each, and — since nothing is stored — only memory to tell them which is which.

- **A: a resumable, journaled operation.** Seal computes the full plan up front, works through it recording each file as it goes, and can resume exactly where it stopped after a crash or quit; re-running is safe because a file already under the new password is skipped rather than failed. The UI keeps both passwords required until it completes. Most robust; the most machinery.
- **B: best-effort with a precise report.** Attempt every file, then show exactly which moved and which did not, leaving the user to retry the failures. Much simpler; leaves a split state that the user must understand and act on.
- **C: refuse to start unless it can complete.** Verify every managed file is present, readable, and openable with the current password before changing anything, then treat a mid-run failure as a bug rather than an expected condition. Simple and safe in the common case; cannot handle a file that becomes unavailable mid-run.

A sub-question worth answering in the same breath, since it shapes the UI either way: should Seal *require* that the old password still be known to change to a new one? (It must, to read the files — but say so plainly, because a user whose password is compromised may expect to be able to change it without the old one, and that is impossible here.)

**Answer:**

Changing the master password needs to be as user-friendly as possible without compromising on the core of the product. Therefore, I'm not sure how to answer this. I'm leaning A, but I want you to do a bit of research on how other password managers handle this and especially try to find out what the current state of the art is, in order not to reinvent the wheel.

### Research findings

**First, the architectural escape hatch is definitively closed.** Every mature password manager avoids bulk re-encryption through envelope encryption — 1Password rewraps one key blob, Proton Pass the same, Bitwarden likewise (its expensive "rotate encryption key" is a separate, opt-in checkbox that its own docs call "potentially dangerous"). The obvious question is whether Seal could get that too, by wrapping one file key with both a passphrase and a recovery key. It cannot: the age specification states that an scrypt stanza **must be the only stanza in the header**, and it obliges readers to *reject* files that violate this. The reference implementation enforces it. So a file with both would not merely be non-standard, it would be unopenable by stock age — defeating the guarantee that made you choose this format. The trade is forced, not an oversight, and worth stating plainly in Seal's own documentation.

Worth knowing: the trade buys something real. Borg's documentation concedes that changing its passphrase "does not protect future (nor past) backups," and 1Password files the same limitation under *known weaknesses*. Cheap rotation does not actually revoke anything. **Seal's expensive rotation genuinely does.**

**Second, the closest analogue is genuinely bad at this, so the bar is low.** Ansible Vault's `rekey` is the nearest thing to Seal's situation — standalone password-encrypted files, no envelope. Its implementation is a naked loop with no error handling: any failure aborts mid-iteration, leaving files before the failure on the new password and files after on the old, with no rollback, no resume, and no report. Worse, it writes each file by deleting it and recreating it in place rather than the atomic replacement we already do, so a crash at the wrong moment destroys the file outright. A third-party tool exists purely to paper over these gaps and still warns that you may "get partway through a password migration and then have the tool fail out." No tool anywhere does cross-repo transactional rekey; Seal's scope is novel territory.

**Third — and this is the insight that changes the shape of the answer — the thing that looks like Seal's biggest weakness is actually an asset.** Because every sealed file is independent, a half-finished rekey is a **split, not corruption**. Nothing is damaged; some files are simply under one password and some under another. Ansible Vault already treats exactly this as a supported steady state: you supply several passwords, and it tries each until one opens the file, so a partially-migrated tree keeps working normally. Meanwhile restic's approach to resumability is not journal replay at all — its state is *derivable*, so "just run it again" is always honest advice.

Combining those two gives Seal something better than any option I originally offered: **correctness need not depend on a journal at all.** Every file's status is discoverable by simply trying the new password and then the old one. A journal becomes a speed and progress optimisation whose loss degrades gracefully, rather than a correctness dependency that can itself be corrupted, forged, or left stale — a real hazard, since a vulnerability of exactly that kind was found in the most respected implementation of this pattern.

### Recommendation

**Option A as you were leaning, with the journal demoted from the mechanism to an optimisation, and a split state treated as a supported condition rather than a failure.** Concretely: Seal accepts more than one password during a migration and reports honestly (`3 files still on the previous password`) instead of erroring; re-running the change is always safe and skips completed work; a lost or damaged journal costs speed and progress reporting, never correctness.

Four safeguards are near-unanimous across the prior art, cheap, and I would include all of them. The most valuable by far: **verify the new password with a full encrypt-then-decrypt round trip before touching a single real file** — this costs one derivation and prevents the catastrophic case where a user types a new password identically wrong twice (keyboard layout, clipboard truncation) and re-encrypts everything to a password they cannot reproduce. Then: keep the atomic per-file replacement already designed; gate the operation on a *question* about backups rather than an acknowledgement, printing the literal command; and state plainly that both passwords must be remembered until it finishes, since Seal cannot avoid that the way disk-encryption tools do.

Does that match what you want? If so I will write it into the design and unblock the last engine step. If you would rather have the fuller journalled machinery, or the variant that stages every file and flips them at the end to shrink the mixed window, say so and I will design that instead.

**Answer 2:**