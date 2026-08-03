Operated per [the journeys manual](../../docs/plans/JOURNEYS.md).

# Who and why

Someone rotating their master password — because they think it was seen, or because it is old. Every protected file across every repository has to move to the new password.

This is the most dangerous operation in the product. The failure state is not "it did not work"; it is **a set of files split across two passwords with no record of which is which**. A user in that state, months later, remembering only one password, has permanently lost data.

They are anxious. Reassurance must be earned by the product actually being safe, not by soothing language.

# The path

1. **They start it.** They should understand before beginning that this rewrites every protected file, that both passwords must be remembered until it finishes, and that this cannot be undone.

2. **They commit deliberately.** The friction here should be real — this is one of very few places in the product where that is correct — and it should be friction that requires reading, not just clicking.

3. **They watch it work.** Honest progress. They should know it is working and roughly how far along it is, and be told clearly not to quit.

4. **It finishes, and they know where they stand.** Either everything moved and only the new password matters now, or some files did not — in which case they are told exactly which files are on which password, and what to do about it. Never a bare count of failures: the question in their head is "what password do I have now?"

5. **Something goes wrong partway.** A file is locked, the machine sleeps, the application is force-quit. The product must not lose track. On returning, it knows exactly what moved and what did not, and says so unprompted.

6. **They finish the job.** Retrying continues from where it stopped and never re-processes what already moved. The product never offers them a way to skip a file and walk away half-done.

7. **They forget about it for a week.** The product does not. An unfinished rotation is surfaced every time they return, because it is the most dangerous state the product has.

# What good looks like

**Never happens:**

- A partly finished rotation being forgotten by the product.
- The user being able to abandon halfway without understanding what that means.
- Progress that exists only on screen and is lost when the window closes.
- A summary that reports failures without saying which password each file is on.
- Anything begun before the new password is proven to work.
- A second rotation starting on top of an unfinished one.

**Obvious without explanation:**

- That both passwords matter until it completes.
- Whether it finished.
- Which files, if any, still need the old password.
- That an unfinished rotation is unfinished business.

**Never assumed:**

- That the user will keep the window open.
- That the user remembers starting it.
- That "3 of 47 failed" tells them anything useful.

# Demonstration

**Reached and driven for the first time, and it fails. Not satisfied.** The harness's `return-and-use` scenario now runs to this step instead of stopping short of it, so what follows was witnessed rather than inferred. What the drive reaches and confirms: the settings control, the **Change master password** entry, the screen itself, and its statement that both passwords must be remembered until the change finishes. The four fields — current, replacement, confirmation, and the typed phrase — each carry the exact text intended, asserted per field rather than assumed.

What then happens is a defect, and a severe one: the run does not complete, every manifest entry fails as a wrong password, and **afterwards the vault opens with neither the old password nor the new one**. The same session had unlocked with the old password moments earlier in the same run. It is recorded against the plan that owns the code, [password-change.md](../plans/app/desktop/ui/password-change.md), with what has and has not been isolated — notably that the same staged sequence driven directly through the commands converts every entry, so the flow is not straightforwardly broken.

The interrupted run this journey requires — killing the application partway through the rotation and reopening it — has **not** been driven. It stays undriven until the clean run passes, because an interrupted run of a rotation that cannot complete would demonstrate nothing about resumability.

# Findings

**One open, blocking.** The rotation leaves the vault openable by neither password, recorded and framed in [password-change.md](../plans/app/desktop/ui/password-change.md). This journey cannot be satisfied while it stands, and the interrupted-run demonstration is blocked behind it.
