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

**Step 7 driven, automated, 2026-08-04**, in the harness's `settling-in` scenario (`bun run e2e:settling`), seven of seven green. What was witnessed for the forgotten file: a file written into an already-managed repository after the fact is found by rescanning from the repository's own overflow control, and is selectable; every already-managed file in that same rescan is inert **and says "already managed"** beside it, so the row reads as safe rather than as broken; the surface states that the folder is already managed and that nothing already managed is changed; and confirming the rescan adds only the new file, with both previously-sealed files byte-identical on disk afterwards and still reporting `Sealed` while the newcomer reports `Readable` — watched but not yet protected, which is the distinction step 4 asks the product to make obvious. Confirmed non-vacuous by making already-managed rows selectable again and re-driving: that check alone fails, naming the risk.

**The second repository was driven, with one honest limit.** Both repositories are listed together on the repositories surface, and the new folder reported itself as not already registered. But the add was performed **across the boundary rather than through the folder picker**, because the harness's folder-pick seam returns a single folder fixed in the application's environment at launch, so no amount of driving the add control reaches a second one. What this demonstrates is that the product holds two repositories side by side; what it does **not** demonstrate is the picker being used a second time. The scenario had to lock and unlock before the second repository appeared, which is the interface's known re-read gap rather than a defect in adding.

# Findings

**1. A repository added while the window is open is not noticed until the session re-reads. — Open, routed.**

Found while driving step 7. The second repository was created and registered successfully — verified in the registry on disk — and the repositories surface continued to show only the first until the session was locked and unlocked. This is the same mechanism already framed as [freshness.md](../plans/app/desktop/ui/navigation/freshness.md): the interface re-reads disk when the session unlocks and after operations it performed itself, and nothing else makes it look again. It is recorded here rather than as a new concern because a user adding a repository through the interface goes through the path that does refresh; what this measured is the boundary of that refresh, not a broken add. Routed to the node that owns the gap, whose Approach is now settled: re-observation will re-read the **registry** rather than the in-memory mirror, which is what this measurement showed the narrow reading would miss.

Step 7's remaining gap is coverage of the picker being used a second time, which the harness's launch-fixed seam cannot currently express.
