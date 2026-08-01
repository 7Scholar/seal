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
- That confirming encrypts nothing, and that the files do not move.
- What state every listed file is currently in.

**Never assumed:**

- That the user will notice a pre-selected checkbox they did not want. Defaults must be safe when accepted blindly.
- That the user knows which of their own files are secret. The scan should be genuinely useful, not a formality.

# Demonstration

**Steps 1 through 6 driven, automated, re-driven 2026-08-01**, inside the harness's `first-run` scenario: the folder chosen through the native-dialog command, the repository drawn as its own tree with only the genuine secret preselected and the template left unchecked, the selection confirmed, the seal gated on the two irreversible facts behind typed confirmation, and the result verified on disk as armored age text with the state tag updated.

The surface the journey passes through changed on 2026-08-01 and the journey's own wording follows it: the scan no longer presents three lists grouped by classification, but the repository itself with Seal's judgement marked per row ([repo-layer/](../plans/app/desktop/ui/repo-layer/README.md)). Step 2's requirement is unchanged and still met — the user can tell at a glance what Seal thinks is a real secret, what it is unsure about, and what it believes is a template — but it is now answered by per-row annotations rather than by the grouping.

**Step 7 — rescanning a known repository, and the second repository — has not been driven.** The journey is not satisfied until it is.

# Findings

None open from the driven steps. Step 7 remains to be driven, and is expected to produce findings about re-scanning safety.
