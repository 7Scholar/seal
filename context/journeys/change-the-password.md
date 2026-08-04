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

**The clean run is driven end to end and green; the interrupted run is not. Not yet satisfied.** The harness's `return-and-use` scenario drives this path as its last step, against a release build from a scratch profile. What was witnessed:

- The route in: the settings control, then **Change master password**.
- The screen states that both passwords must be remembered until the change finishes, before anything is typed.
- The gate: the run is refused until the current password, the replacement, its confirmation, and the literal phrase are all present.
- The run completes and returns the user to the application.
- **The proof that matters:** locking, then offering the old password, which is refused in plain language — *"did not open your files"* — and then the new one, which opens Seal and finds the managed file still sealed.

The step is confirmed non-vacuous by the mutation that would break exactly this promise: dropping the sentinel from the manifest the rotation plans, which would leave the old password still opening Seal. The step fails with the sentinel dropped and passes with it restored.

**Not driven: the interrupted run** — killing the application partway through the rotation and reopening it. That is this journey's own requirement, because resumability is the property that matters most and a clean run cannot demonstrate it. The durable manifest that makes resumability possible is covered by the Rust suite, which this axis does not accept as a substitute.

# Findings

**None open.** Driving this journey found no defect in the product. It did find two in the harness, both fixed: passwords were typed with a per-character key stream that silently dropped the spaces, so the vault was established under a password nobody intended and only the correctly-typed field ever revealed the mismatch; and the run asserted a `Repositories` heading after the change, which belongs to the top-level screen alone and never appears when the change returns the user to a repository. The journey is unsatisfied only because the interrupted run is still to be driven.
