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

TBD — blocked on the design forks in [QUESTIONS.md](QUESTIONS.md).

# Steps

- [!] Research solution directions — blocked, awaiting answers in QUESTIONS.md

# Open threads

- Whether the exposure indicator already specified for the title bar ([README.md](README.md)) is the right carrier for the positive statement too, or whether an assurance and an alarm are different enough to want different homes. Settling this depends on the freshness fork below.
