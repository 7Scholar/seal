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

**Authored but not yet witnessed.** The harness's `return-and-use` scenario contains the clean-run drive — the warnings read, the typed commitment, the run, and the proof that the old password stops opening Seal while the new one does — but the run currently stops short of it on a harness defect recorded in [the harness plan](../plans/app/desktop/journey-harness.md). The rotation itself, sentinel included, is covered by the Rust suite, which this axis deliberately does not accept as a substitute.

Driving it must also include an interrupted run — kill the application partway and reopen it — because resumability is the property that matters most and it cannot be demonstrated by a clean run.

# Findings

Open, pending the journey being driven.
