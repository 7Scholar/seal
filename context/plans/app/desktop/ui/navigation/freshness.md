Part of [the navigation plan](README.md).

# Scope

**When the product re-observes the world, and how it answers "is everything protected?" at a glance.** One concern with three faces: what makes the interface look at the world again, what it states about protection once it has, and how long it keeps showing what it was told. Out of scope: what a divergence *is* and how it is detected (the registry's, per [registry.md](../../../registry.md)); how the command reports it ([commands.md](../../commands.md)); and the per-file states a surface renders ([states.md](states.md)).

# What & why

Raised by driving [living-with-it](../../../../../journeys/living-with-it.md), whose step 3 asks for one thing: *"is everything that should be protected actually protected? Answerable in a second, without reading."* The journey's own bar puts **"whether everything is protected"** among the things that must be obvious without explanation.

Three gaps, all measured in the running application.

**The interface only re-observes disk on unlock.** The cross-repo view is fetched when the session unlocks and after operations Seal itself performs. Nothing else triggers it — there is no periodic re-observation and no refetch when the window regains focus. Measured: with the application open on a repository, deleting a managed file on disk left the interface reporting it unchanged indefinitely; locking and unlocking was the only way to make the product notice. A user who leaves Seal open all afternoon — which is the second-week user this journey is about — is looking at a snapshot from whenever they last unlocked, with no indication of that.

This matters more than a stale count. The product's most important claim is the exposure alert, and that alert is computed from the same fetch. A file that becomes readable while the window sits open is not surfaced until something unrelated causes a refetch.

**Nothing states that everything is protected.** The repositories grid draws a per-tile line only when a repository holds exposed files; the healthy case renders nothing at all, and the files list shows a `Sealed` tag per row. So the positive answer exists only as the *absence* of a warning, spread across every tile and row. To answer "is everything protected?" a user must read every tile, confirm no warning appears on any of them, and infer safety from silence — which is reading, not glancing, and it is the one question this product exists to answer. The negative case is well served; the ordinary case is not served at all.

**A revealed value stays on screen after Rust has expired it.** Raised by driving [use-a-secret](../../../../../journeys/use-a-secret.md) step 8 and [living-with-it](../../../../../journeys/living-with-it.md) step 5. Revealing a value copies it into the editor's component state, per [screens.md](../screens.md), and nothing clears that state when the held plaintext's deadline passes — there is no timer and no notification from Rust to the interface. Measured with a three-second lifetime: the value was still rendered well after Rust had begun refusing to serve it. The guarantee the product actually makes is intact — the plaintext is gone from memory and the file stays sealed on disk, both verified in the same run — so what is wrong is narrower and still real: the screen displays a secret the product no longer holds, on a display the user has by definition walked away from.

This is the same gap as the first, seen from a third side, which is why it belongs here rather than in `screens.md`. The editor is not wrong about its own contract; it has no way to know. Rust holds the deadline, the interface never asks, and nothing tells it. Whatever answers the first fork — focus, timer, watcher, or an explicit "last checked" — determines whether the interface can know this at all, and a value cleared from the screen on a schedule the user cannot see raises its own question about what they should be told happened.

The gap reaches the registry itself, not only the files inside it. Driving [protect-a-repo](../../../../../journeys/protect-a-repo.md) step 7 measured a whole **repository** registered while the window was open and not appearing until the session was locked and unlocked — the registry on disk held it the entire time. This adds no new fork: it is the first gap seen at the cross-repo altitude, and it widens what a "last checked" statement or a refetch would have to cover, since the stale thing can be the list of repositories rather than a state within one. It is worth recording because the obvious narrow reading of the first fork — re-read the files of the repository being looked at — would not have caught it.

The three are one concern because an at-a-glance assurance is only worth drawing if it is **current**. A prominent "everything is protected" computed from a snapshot taken at unlock is worse than none: it converts a stale read into a confident false statement, which is the failure [states.md](states.md) already names — *"a product that says 'nothing here' when it means 'I don't know yet' is one a user stops trusting with their secrets."*

# Approach

The product owner settled the three forks: **the second is closed by answering "nothing"** — absence stays the answer, and no positive assurance is drawn anywhere — and the other two were delegated with one standing instruction, *long-term stable and robust, no matter the effort*. That instruction is what the rest of this Approach answers to, and it points away from the most elaborate option rather than towards it.

## Re-observation is periodic and event-driven, not a filesystem watch

**Seal re-observes on three triggers**: when the window regains focus, on a timer while it is open, and after any operation Seal itself performed. A filesystem watch is deliberately **refused**.

The measurement that decides it: a reconciliation is one small header read plus a `stat` per managed file, and nothing else — no decryption, no directory walk. Measured on the development machine at **6ms for 500 managed files**, and **under 1ms for the 50-file vault a real user has**, in steady state across repeated trials rather than off a cold cache. The "continuous disk reads forever" cost that makes a timer look expensive is, at this product's scale, a fraction of a millisecond every few seconds.

Against that, a watch is the option that *looks* most robust and is least. It brings failure modes this product cannot dismiss: per-user watch descriptor limits that fail silently when a user manages many repositories; editors that save by writing a temporary file and renaming over the target, which delivers as a rename of a path the watch was not on; network and synced volumes where change events are unreliable or absent; and a watch that must be torn down and rebuilt as repositories are added and removed. Each is a way for the product to **stop noticing without saying so** — and a freshness mechanism that fails closed-mouthed is worse than the honest staleness it replaced, because the interface would keep implying currency it no longer has. Polling has one failure mode, bounded latency, and it is visible in the interface rather than silent.

So the design takes the cheap, boring mechanism and spends the saved effort on making it *honest*, which is where the owner's instruction actually points.

**The timer lives in the interface, and the sweep stays where it is.** Rust already runs a background loop that expires held plaintext every 30 seconds ([commands.md](../../commands.md) owns the sweep, `lifecycle.md` the expiry), and re-observation deliberately does **not** join it. The two answer different questions on different cadences — the sweep enforces a deadline whether or not anyone is looking, while re-observation exists only to keep a *visible* interface honest — and coupling them would tie the expiry's cadence to a display concern for no gain, since the measurement above showed re-observation is free. The interface asks, at its own interval, and only while it is unlocked; nothing wakes up on behalf of a window nobody has open.

**A re-read that finds nothing changed emits nothing.** The loop compares the reconciliation it just computed against the one the interface was last given, and notifies only on a difference. This is what keeps a timer from being a re-render every few seconds, and it is why the interface can treat an event as *"something is actually different"* rather than as a tick.

**Focus is the trigger that matters most and costs least.** A user who has been away in their editor is exactly the user whose picture is stale, and they are already paying an attention cost switching windows. The timer covers the case focus does not: the window sitting open and visible while something changes underneath it.

**The timer does not skip while the page reports itself hidden**, which is the opposite of the usual advice and is deliberate. Measured in the running application: a Tauri window that is merely behind another window reports `document.hidden` as **true**, so a `document.hidden` guard — the ordinary way to avoid polling a background tab — suppressed every tick and the interface noticed nothing at all. That is precisely the situation this concern exists for, since a user working in their editor has Seal behind it. The guard was removed rather than refined: the reconciliation is sub-millisecond, so there is nothing to save, and skipping it costs exactly the case that matters.

## The re-read covers the registry, not only the files in it

The stale thing can be the **list of repositories**, not merely a state within one — measured when a repository registered while the window was open did not appear until a lock and unlock. So re-observation re-reads the registry from disk and reconciles against that, rather than reconciling the in-memory mirror's files. This is stated because the narrow reading — *re-read the files of the repository being looked at* — is the obvious implementation and does not close the gap that was actually measured.

## What the interface says when something changed underneath the user

The sub-question the fork raised, answered by the product's existing proportionality rule rather than by a new one: **the surface updates silently, except where the change is one the user must act on.**

- A file that became **readable** is an exposure. It already has an insistent alert, and that alert appearing is the statement — nothing further is added.
- A file that became **sealed**, or a repository that appeared, is benign. It updates in place with no announcement, because announcing it would train the user to dismiss notices, which is the same failure the *"no confirmation friction on routine actions"* bar names in [living-with-it](../../../../../journeys/living-with-it.md).
- A file that **went missing** updates in place. It is already stated on its own row, and reconciliation records it without alarm by design.

**No positive assurance is drawn.** Per the owner's answer to the second fork, absence remains the answer, and this plan does not add a count, a badge, or an "everything is protected" statement anywhere. The consequence is worth stating plainly, because it is the one thing this Approach deliberately does not fix: [living-with-it](../../../../../journeys/living-with-it.md) step 3 asks for the healthy answer in one glance without reading, and the product's answer is still *the absence of warnings*. That step's finding stays open as a **known and accepted** gap rather than a defect — the decision is the owner's, and the journey records it as decided rather than outstanding.

This also settles the standing thread about whether the title bar's exposure indicator should carry a reassurance as well as an alarm: it should not, because there is no reassurance to carry.

## A revealed value is re-masked when its plaintext expires

The third fork, answered by the same instruction. **A revealed value re-masks itself at the moment Seal drops the plaintext behind it**, and the interface says why.

The reasoning is that the alternative is a claim the product cannot keep. The fifteen-minute expiry exists to bound how long a decrypted secret survives; a screen that keeps rendering the secret after Seal has dropped it means the bound applies to memory and not to the thing an onlooker can actually read. Leaving it would be defensible on its own terms — the machine's screen lock is the real answer to an unattended display — but it makes the product's own guarantee narrower than it sounds, and narrowing a stated guarantee quietly is the failure the threat model in [the root plan](../../../README.md) is written to prevent.

The other two directions are refused for stated reasons. A **separate, shorter timer** for revealed values adds a second expiry clock to reason about and desynchronises the screen from the thing it is displaying, for a marginal gain; the value's lifetime should be the plaintext's lifetime, because that is what it is a view of. **Closing the file view** changes the screen underneath a returning user, which is the disruption the *"no state where the product has nothing to say"* bar exists to prevent.

**It re-masks rather than blanks, and it says why.** The row keeps its key and its masked value — the same shape as before the reveal — with a brief statement that the value was hidden because Seal stopped holding it. A value that vanished with no explanation is its own confusion, and this is the one place in the design where the interface volunteers something, because the user is being told about a change they did not make to a secret they were looking at.

**The interface learns it the same way it learns everything else.** The expiry is discovered by the same re-observation loop, not by a timer in the frontend duplicating Rust's deadline. A second clock in JavaScript would drift from the authoritative one and would keep running while the machine slept — the exact failure [MEMORY.md](../../MEMORY.md) records the two-clock design being built to avoid. Rust holds the deadline; the interface asks and is told.

## What this does not change

The expiry semantics, the sweep, the reconciliation algorithm, and the exposure alert are all unchanged — this concern is about **when the interface asks** and **what it says about the answer**, not about what is true. [registry.md](../../../registry.md) still owns what a divergence is, [commands.md](../../commands.md) how it is reported, and [states.md](states.md) the per-file states a surface renders.

# Steps

- [x] Research solution directions and settle the forks — the owner answered; the measurement above chose between the delegated options.
- [x] Re-observe on window focus, and prove the interface notices a change made while it was away.
- [x] Join the reconciliation to a timer, emitting only on a difference.
- [x] Re-read the registry rather than the in-memory mirror, so an added repository is noticed.
- [x] Re-mask a revealed value when its plaintext expires, and say why.
- [x] Drive all of it against the real application, including the case that motivated the concern: a file exposed while the window sits open.

# What exists

All of the Approach. `reobserve` is one command that re-reads the registry from disk, reconciles it, and reports both the observation and whether a named open file is still held; the interface calls it on focus, on `visibilitychange`, and every **5 seconds**, discarding the result when it is identical to what is already shown. `Session::holds` answers the held-file question **without refreshing the deadline**, which is guarded by a test that fails if asking extends the lifetime — the mistake that would silently make a watched file immortal.

**Driven, five checks green** (`bun run e2e:freshness`), against the case that motivated the concern: a sealed file overwritten in the clear while the window sits open is noticed with **no user action**, the exposure alert rises from the same observation, a file deleted underneath the window becomes `Not found` with its open control dead, nothing anywhere draws a positive assurance, and sealing from the alert clears it again. Confirmed non-vacuous by neutering the timer callback: the four checks that depend on re-observation fail, and the one that does not — that no assurance is drawn — still passes.

Nine unit tests cover the rest: four on `Session::holds` and three on the editor's re-masking, including that it says nothing when nothing was revealed.

# Open threads

- The 5-second interval is a first choice rather than a measured one. It is fast enough that an exposure surfaces before a user could act on stale information, and cheap enough not to matter, but nobody has asked a user whether it feels immediate. Revisit if the latency is ever observed as too slow.
