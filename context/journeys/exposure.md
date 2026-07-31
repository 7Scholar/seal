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

**Staged but not yet observed.** The harness's `return-and-use` scenario stages the exposure exactly as this journey requires — a protected file overwritten externally with readable text, then a return to the product — and asserts the insistent alert, the rotate instruction, the recency warning on re-sealing, and the file back to armored on disk. The run currently stops short of those assertions on a harness defect recorded in [the harness plan](../plans/app/desktop/journey-harness.md), so the alert's appearance has not yet been witnessed by a drive. The alert's behaviour is covered by interface tests, which this axis deliberately does not accept as a substitute.

# Findings

Open, pending the staged drive completing.
