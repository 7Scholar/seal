Operated per [the journeys manual](../../docs/plans/JOURNEYS.md).

# Who and why

Someone who has Seal set up and wants to bring a repository under protection — either their first, or their fifth. They have a project with secrets in it and want the risky ones unreadable while the harmless ones stay exactly as they are.

They know their own repository well. They do not know, and should not need to learn, how Seal decides what looks like a secret.

# The path

1. **They point Seal at a folder.** Using whatever mechanism their operating system normally offers for choosing a folder.

2. **Seal looks, and shows them what it found.** They should be able to tell at a glance which files Seal thinks are real secrets, which it is unsure about, and which it believes are templates meant to stay readable. They should understand *why* each landed where it did, and they should see that Seal has pre-chosen conservatively.

3. **They disagree where they want to.** Their repository, their call. Anything Seal proposed can be rejected, and anything it skipped can be added.

4. **They confirm.** Nothing is encrypted. They now have a list of files Seal is watching, and they can see the difference between "watched" and "protected."

5. **They protect the ones that need it.** Deliberately, as a separate act. They should understand what will happen to each file before it happens, and — the first time — meet the two facts about irreversibility.

6. **They see the result.** Which files are now unreadable, which are still in the clear by their own choice, and confidence that their repository still works.

7. **Later, they add a file they forgot.** Or bring in a second repository. The path for the second time should be as clear as the first, and re-scanning a known repository must not threaten what is already there.

# What good looks like

**Never happens:**

- A file encrypted that the user did not choose. Over-inclusion here breaks someone's build with no obvious cause.
- Re-scanning an already-managed repository putting existing work at risk.
- A file protected without the user understanding it is about to become unreadable.
- The scan silently missing the obvious secret in a repository, or drowning the user in noise from dependency folders.

**Obvious without explanation:**

- The difference between Seal watching a file and Seal protecting it.
- Why each candidate was proposed, and why some are pre-chosen.
- That confirming an import encrypts nothing.
- What state every listed file is currently in.

**Never assumed:**

- That the user will notice a pre-selected checkbox they did not want. Defaults must be safe when accepted blindly.
- That the user knows which of their own files are secret. The scan should be genuinely useful, not a formality.

# Demonstration

**Never driven.** Blocked at the first step: choosing a folder does not currently work.

# Findings

Open, pending the journey being driven. The blocker at step 1 is recorded in [first-run.md](first-run.md).
