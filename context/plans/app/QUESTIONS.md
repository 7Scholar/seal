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

**Research in progress.** Surveying how the major password managers, and the tools that — like Seal — have no envelope indirection and must genuinely re-encrypt everything, handle this. The specific question is whether the state of the art offers a better model than option A, and whether a partially-rekeyed state is treated as an ordinary recoverable condition rather than a failure. I will bring back the findings and a recommendation here rather than deciding alone, since this is still your call.