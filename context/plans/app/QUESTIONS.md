# Open questions

An adversarial review of the engine design surfaced two crossroads that change what the product *is*, not just how it is built, so they are yours rather than mine. Both block finalizing the engine's operations layer. Everything else the review raised I am resolving directly as ordinary design work.

## 1. Should a file be allowed to sit unsealed on disk at all?

The engine currently offers `unseal_in_place`: replace a sealed file with its plaintext, permanently, until someone re-seals it. The review argues this single operation unmakes the product, and I find the argument strong enough that I will not decide it alone.

The concern is concrete. A user clicks Unseal to check one value, gets distracted, and a plaintext `.env.production` now sits in a git repo indefinitely. If that repo commits its sealed files — which your answer to the earlier git question permits, since git is the repo's responsibility — the next `git add -A` commits production credentials to history permanently. That is the exact outcome Seal exists to prevent, reachable in two clicks. The intent's own words are "contents may never be readable at rest."

Every use case I can find is already covered without it: the CLI resolves to stdout, the env editor edits through memory and re-seals, and non-env files are never edited in the app by the intent's own rule. What remains is "I want to open this in my own editor or run some tool over it."

- **A: drop it.** Unsealing to disk permanently is not an operation Seal offers. Removing a file from Seal's management (which necessarily leaves plaintext behind) becomes an explicit `unmanage` action with its own weight and warning. Cleanest, and matches the intent most literally; costs the user the "just let me look at it in my editor" workflow.
- **B: make it a checked-out state.** The file may be unsealed to disk, but Seal records it as checked-out, the UI shows a persistent banner naming every checked-out file, and they are re-sealed automatically when the session ends or the app quits. Keeps the workflow, makes forgetting structurally hard; costs a real chunk of machinery (crash recovery, a state that can outlive a process).
- **C: scoped, transactional unsealing.** Unsealed only for the duration of a specific action the user starts and Seal supervises, re-sealed when that action ends. Strictest of the three that keeps the workflow; the least familiar model for a user.
- **D: keep it as-is** — a plain operation, with warnings in the UI and nothing enforced. Simplest; leaves the footgun loaded.

**Answer:**

## 2. What should happen when the master password changes?

The design has no answer, and the review is right that this is the operation most likely to be used under pressure — a suspected compromise — while also being the longest-running and the most dangerous to interrupt.

Because sealed files are standard age files with the password baked into each file, changing the master password means **re-sealing every managed file in every repo that does not have its own override**. There is no cheap path: the alternative design (a wrapped key per file, so a password change re-wraps a small key instead of re-encrypting everything) was ruled out by your choice of plain age files, which buys the far more valuable guarantee that any sealed file opens with stock `age` tooling if Seal ever disappears. I think that trade is right, but it makes password change expensive and worth designing deliberately.

The failure mode to design against: 200 files across 20 repos, and file 47 fails. The user now has two live passwords, some files under each, and — since nothing is stored — only memory to tell them which is which.

- **A: a resumable, journaled operation.** Seal computes the full plan up front, works through it recording each file as it goes, and can resume exactly where it stopped after a crash or quit; re-running is safe because a file already under the new password is skipped rather than failed. The UI keeps both passwords required until it completes. Most robust; the most machinery.
- **B: best-effort with a precise report.** Attempt every file, then show exactly which moved and which did not, leaving the user to retry the failures. Much simpler; leaves a split state that the user must understand and act on.
- **C: refuse to start unless it can complete.** Verify every managed file is present, readable, and openable with the current password before changing anything, then treat a mid-run failure as a bug rather than an expected condition. Simple and safe in the common case; cannot handle a file that becomes unavailable mid-run.

A sub-question worth answering in the same breath, since it shapes the UI either way: should Seal *require* that the old password still be known to change to a new one? (It must, to read the files — but say so plainly, because a user whose password is compromised may expect to be able to change it without the old one, and that is impossible here.)

**Answer:**
