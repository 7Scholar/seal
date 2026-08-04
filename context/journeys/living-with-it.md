Operated per [the journeys manual](../../docs/plans/JOURNEYS.md).

# Who and why

Someone in their second week. The novelty is gone; Seal is now something between them and their work. This journey decides whether they keep it or route around it.

Nothing here is a feature. It is all the accumulated texture of using something repeatedly — and it is where "feels like an unfinished side project" is actually decided.

# The path

1. **They open it again.** It should remember what it manages, come back to a sensible place, and not make them re-establish anything but their password.

2. **They unlock.** Frequent enough to matter. It should be quick, forgiving of a typo, and clear about what is happening during the pause while the key is derived.

3. **They glance at it.** They want one thing: is everything that should be protected actually protected? Answerable in a second, without reading.

4. **They do the one thing they came for.** Reveal a value, fix a variable, protect a new file. Two or three interactions, not a tour of the interface.

5. **They step away and come back later.** Whatever they left open should have expired sensibly. Returning should be unsurprising, and the product should never have quietly held a decrypted secret in memory all afternoon.

6. **They lock it deliberately.** Because they are leaving the machine. Reachable without hunting.

7. **Something goes wrong.** A file was moved, a repository deleted, a disk was full. The product explains in their language and suggests what to do, rather than surfacing a fault.

8. **They use it on a bad day.** Distracted, in a hurry. The product should not let them do something irreversible by accident, and should not obstruct them with ceremony where nothing is at stake.

# What good looks like

**Never happens:**

- Any state where the product has nothing to say and no way forward.
- An interaction that leaves the user unsure whether it worked.
- Errors expressed in the product's vocabulary rather than the user's.
- Confirmation friction on routine, reversible actions. It trains people to click through the ones that matter.
- A window that looks different in kind from the applications beside it.
- Text that cannot be read, controls that cannot be reached by keyboard, or state conveyed by colour alone.

**Obvious without explanation:**

- Whether it is locked or unlocked.
- Whether everything is protected.
- How to leave any screen the user is on.

**Never assumed:**

- That the user reads carefully. On the second week, nobody does.
- That the user remembers what they did last time.
- That an empty or error state is rare enough not to design.

# Demonstration

**Driven 2026-08-04, `living-with-it` scenario, six of six green against a release build from a scratch profile.** What was witnessed, step by step:

- **Steps 1, 2 and 6 — reopening, unlocking, locking deliberately.** Exercised here and by the other scenarios: the relaunch lands on the locked shield rather than the choosing one, unlock returns the user to the repositories, and Lock is reachable from the strip at every altitude. A force-kill mid-session was driven and the application returns from it.
- **Step 4 — the one thing they came for.** Revealing, editing and saving a value are driven by `return-and-use`, in two or three interactions.
- **Step 7 — something goes wrong.** Driven in earnest: a managed file deleted outside Seal, and an entire repository directory removed while the window was open. The second leaves a way forward and no fault text anywhere in the interface. The first found a real defect, below.
- **Step 3 — the glance.** Driven and **found missing**, below. What exists is the negative case only.

**Step 5 driven 2026-08-04**, in the `plaintext-expiry` scenario (`bun run e2e:expiry`), six of six green against an application launched with a three-second held-plaintext lifetime — the seam [commands.md](../plans/app/desktop/commands.md) now provides, which is what unblocked this step. What was witnessed: a secret held while the user works, gone from Rust once the lifetime elapses, the refusal explained in the user's language rather than swallowed, the file sealed on disk throughout, and reopening working normally. The journey's own bar — *"the product should never have quietly held a decrypted secret in memory all afternoon"* — is met, and was checked at its mechanism rather than at the screen: the scenario invokes `reveal` across the boundary and requires the refusal to be `notOpen` specifically, since a reveal can fail for several reasons and only that one means the deadline did it. What is *not* met is the screen half of the same question, finding 4 below.

**Step 8 driven, automated, 2026-08-04**, in the harness's `bad-day` scenario (`bun run e2e:badday`), eight of eight green. This step has two directions and the second is the one that had never been walked.

Ceremony **where it belongs**: the first seal in a fresh vault puts the two irreversible facts to the user behind a typed `I UNDERSTAND` gate, and the confirm control is genuinely inert until the phrase is typed — checked rather than assumed, because a gate that can be clicked through is not a gate. Releasing a sealed file, which writes the plaintext back to disk, is confirmed and says in the dialog that the contents become readable.

Ceremony **where it does not**: the acknowledgement is asked once and never again, so a second seal goes straight through; opening a file to look at it, revealing a value, hiding it again, navigating between altitudes with nothing unsaved, and locking all complete with no confirmation at all. Locking is checked deliberately, being the one action that only ever makes things safer. Releasing a file is confirmed but **not** gated on a typed phrase — the scenario asserts the absence of that gate, because the journey's bar is violated as much by too much friction on a reversible act as by too little on an irreversible one.

Driving the *absence* of ceremony is worth noting as a shape: most checks assert something appears, and these assert that nothing does. That only means anything because the same run proves the dialog machinery works — the two gates it does expect are found in the same scenario, so a silent breakage of the dialog would fail those rather than passing these vacuously.

# Findings

**1. A managed file deleted outside Seal still read as `Sealed`, with a live open control. — Fixed, re-driven, closed.**

Measured: with `.env.beta` deleted on disk, the row kept its `Sealed` tag and its open button stayed enabled. The mechanism is a consumer discarding what the library correctly reported — `app::overview` computed a reconciliation, used it *only* to derive the exposure flag, and served `file.last_known` for the state itself, so every divergence except "recorded sealed, found readable" was invisible. The registry library was never wrong: its own suite proves a missing file is reported without alarm. The overview now serves the observed state and falls back to the recorded one only where reconciliation said nothing. Both directions are covered by tests confirmed non-vacuous, and the driven scenario asserts the tag *and* the disabled control. Owned by [commands.md](../plans/app/desktop/commands.md).

This is squarely the axis's own defect class: the Rust suites and the frontend suites all passed throughout, because each side was correct about its own contract and the defect sat in the seam between them.

**5. The recency warning was skipped entirely when sealing a selection. — Fixed, re-driven, closed.**

Found by walking step 8's ceremony question in the other direction. The same file, modified moments earlier, behaved differently depending on which control the user reached for: sealing it from its own row warned that a program may be working in it and offered a way out, while sealing it from the batch control sealed it immediately with no warning at all. Measured in the driven application — the file was already sealed by the time the check looked.

The mechanism is narrow and was reached before anything was written down: `seal_warning` is consulted only by the interface's single-file path, and neither Rust command consults it, so the batch path never had it. This is not the acknowledgement gate, which *is* enforced in Rust and was never bypassable; it is the advisory warning that sits in front of it.

It matters more than "advisory" suggests, because [lifecycle.md](../plans/app/desktop/lifecycle.md) records that the hazard is real and reproduced: an editor holding an unsaved buffer overwrites the sealed file on its next save, and no check can see that buffer. The warning is the only thing standing between the user and that sequence, and the batch control is exactly where someone in a hurry seals several files at once. Every unit suite passed throughout, because each route was correct about the contract it had — the axis's signature shape again.

Fixed: sealing a selection now checks every path in it and warns naming each recently-modified file before touching any of them. `lifecycle.md` owns the behaviour and states it as a property of sealing rather than of one control; `desktop/MEMORY.md` records why the batch check must not be dropped. Confirmed non-vacuous both ways — the reproduction failed before the fix and passes after, and disabling the new check fails the unit guard.

**2. The interface re-reads disk only when the session unlocks. — Open, solutioned, awaiting build.**

Nothing else triggers a re-read: no timer, no refetch on window focus. A file deleted or exposed while the window sits open goes unnoticed indefinitely — locking and unlocking is the only thing that makes the product look again. This delays the exposure alert too, since it is computed from the same fetch. It is also why finding 1 needed a lock/unlock to become visible, and why the scenario's lock steps are load-bearing rather than incidental.

**3. Nothing states that everything is protected. — Closed as decided, not fixed.**

Step 3 asks for an answer in a second without reading; the product only ever draws attention to what is *wrong*. A repository tile carries an exposure line only when it has exposures, and the files list shows a `Sealed` tag per row. The healthy answer therefore exists only as the absence of warnings spread across every tile and row, so answering the question means reading all of them and inferring safety from silence.

**4. A revealed value stays on screen after its plaintext has expired. — Open, routed.**

Found by driving step 5. Revealing a value copies it into the editor's component state; nothing clears that state when the deadline passes in Rust, because there is no timer, no subscription, and no notification from Rust to the interface. Measured with a three-second lifetime: the secret was still rendered well after Rust had refused to serve it again.

The product's real guarantee holds — the plaintext is genuinely gone from memory and the file stayed sealed on disk, both verified in the same run — so this is not the failure this step exists to catch. It is the adjacent one: the screen keeps displaying a secret the product no longer holds, so stepping away leaves a value visible on an unattended display for as long as the window stays open, which is most of what "step away and come back" means in practice.

This is a **missing concern rather than a defect**, and the distinction was itself worth establishing: the first version of the check asserted the value would disappear, and that assertion was wrong about the product as designed. [screens.md](../plans/app/desktop/ui/screens.md) specifies that a revealed value lives in component state and nowhere else, and says nothing about clearing it — the interface has no notion of a held secret's lifetime at all. Routed to [freshness.md](../plans/app/desktop/ui/navigation/freshness.md), because it is the same gap as findings 2 and 3 seen from a third side: the interface only ever learns what Rust knows by asking, and nothing makes it ask.

Findings 2, 3 and 4 are framed together as [freshness.md](../plans/app/desktop/ui/navigation/freshness.md), because an at-a-glance assurance is only worth drawing if it is current — a confident "everything is protected" computed from a snapshot taken at unlock is worse than none. **The product owner has now settled its forks and its Approach is committed**, which changes the standing of these three findings and not their content.

Findings 2 and 4 will close when that plan is built: the interface will re-observe on window focus and on a timer riding the sweep loop already in the application, and a revealed value will re-mask itself when the plaintext behind it expires.

**Finding 3 is closed as decided rather than fixed.** Asked whether the product should state that everything is protected, the owner answered *nothing — absence is the answer*. So step 3's request for a one-glance answer without reading is **deliberately not met**, and this journey records that as the owner's decision rather than as an outstanding defect. It is left visible rather than deleted, because a future reader meeting the same gap should find the decision instead of re-raising it.

**This journey is not satisfied**, though every step is now driven — steps 5 and 8 were the last two, and 8 found the defect above. Finding 3 is closed as decided. Findings 2 and 4 stay open until [freshness.md](../plans/app/desktop/ui/navigation/freshness.md) is built, its forks now being settled and its Approach committed.
