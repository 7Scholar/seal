Operated per [the journeys manual](../../docs/plans/JOURNEYS.md).

# Who and why

Someone whose secret is sitting readable on disk right now, when it should not be. Usually because an editor had the file open when it was protected and later saved over it.

This is the journey where the product's whole promise is on the line. It is also the one the user did not choose to be in — they opened Seal for some other reason and are about to be told something is wrong.

# The path

1. **They find out.** Not by looking for it. The product tells them, wherever they happen to be, and does so in a way they cannot miss or accidentally dismiss.

2. **They understand what it means.** Which file, what state it is in, and why it matters — a secret that is meant to be protected is currently readable by anything on the machine.

3. **They understand how it happened.** Not as blame, but so they can avoid repeating it. Something else wrote over the protected file.

4. **They fix it immediately.** The fix is right there, next to the problem. One action, no navigation, no hunting.

5. **They learn the harder truth.** Re-protecting the file does not undo the exposure. However long it sat readable, it was readable — and anything that could read it may have. The credential should be rotated. This is unwelcome and must be said anyway.

6. **The warning goes away because it was fixed.** Not because it was dismissed, timed out, or scrolled past. Its disappearance means the problem is gone.

7. **When nothing is wrong, nothing is shown.** A product that always displays a warning has trained its users to ignore warnings.

# What good looks like

**Never happens:**

- The warning being dismissible, snoozeable, or self-hiding while the file is still exposed.
- A warning with no fix attached to it.
- The warning treatment used for anything that is not a genuine exposure. A missing file, or a file the user deliberately left readable, must not look like an emergency.
- The user being told to rotate a credential without being told why.
- Exposure indicated only somewhere the user might not be looking.

**Obvious without explanation:**

- That this is urgent and different from ordinary status.
- Exactly which file, and where it is.
- What to do, in one action.
- That fixing it does not undo it.

**Never assumed:**

- That the user checks a dashboard. The product finds them.
- That the user understands why re-protecting is insufficient. Say it plainly.

# Demonstration

**Driven end to end in the real application on macOS, and witnessed.** The harness's `return-and-use` scenario stages the exposure as this journey requires — a file protected, then overwritten externally with readable text — locks, returns, and unlocks. What was observed against a release build from a scratch profile:

- The alert appears on returning to the repository, without being sought: *"1 file Seal recorded as sealed is readable on disk"*, carrying the file's repository and path.
- It states what it means and how it happened — the contents are in the clear right now, an editor most likely had the file open when it was sealed and later saved over it.
- It states the harder truth in the same breath: *"Rotate any credential that was exposed — sealing cannot undo an exposure that already happened."* Both halves were asserted, so the instruction and its reason are held by the run rather than by reading.
- The fix sits on the exposure itself — a **Seal now** control on the row naming the file, with no navigation between the problem and its remedy.
- Sealing from the alert first meets the recency warning, which is honest about its own limit rather than silently proceeding, and completes through it.
- The file is armored age on disk afterwards, read back from the filesystem rather than from the interface.

The alert's disappearance-because-fixed and the never-shown-when-nothing-is-wrong properties are covered by the run's shape: the alert is absent through every earlier step of the same scenario, and the repository view after re-sealing asserts the sealed tag.

# Findings

**None open.** Driving this journey found one defect, and it was in the harness rather than the product: the run's assertion for the rotate instruction matched a lowercase *"rotate"* against copy that says *"Rotate"*, so the instruction the product does give was being checked for in a form it never took. The assertion now names the sentence and its reason clause explicitly. The product's behaviour was correct as built and needed no change.
