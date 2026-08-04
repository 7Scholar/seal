Part of [the navigation plan](README.md).

# Scope

**When the product re-observes the world, and how it answers "is everything protected?" at a glance.** Two halves of one concern: what makes the interface look at disk again, and what it states about protection once it has. Out of scope: what a divergence *is* and how it is detected (the registry's, per [registry.md](../../../registry.md)); how the command reports it ([commands.md](../../commands.md)); and the per-file states a surface renders ([states.md](states.md)).

# What & why

Raised by driving [living-with-it](../../../../../journeys/living-with-it.md), whose step 3 asks for one thing: *"is everything that should be protected actually protected? Answerable in a second, without reading."* The journey's own bar puts **"whether everything is protected"** among the things that must be obvious without explanation.

Two gaps, both measured in the running application.

**The interface only re-observes disk on unlock.** The cross-repo view is fetched when the session unlocks and after operations Seal itself performs. Nothing else triggers it — there is no periodic re-observation and no refetch when the window regains focus. Measured: with the application open on a repository, deleting a managed file on disk left the interface reporting it unchanged indefinitely; locking and unlocking was the only way to make the product notice. A user who leaves Seal open all afternoon — which is the second-week user this journey is about — is looking at a snapshot from whenever they last unlocked, with no indication of that.

This matters more than a stale count. The product's most important claim is the exposure alert, and that alert is computed from the same fetch. A file that becomes readable while the window sits open is not surfaced until something unrelated causes a refetch.

**Nothing states that everything is protected.** The repositories grid draws a per-tile line only when a repository holds exposed files; the healthy case renders nothing at all, and the files list shows a `Sealed` tag per row. So the positive answer exists only as the *absence* of a warning, spread across every tile and row. To answer "is everything protected?" a user must read every tile, confirm no warning appears on any of them, and infer safety from silence — which is reading, not glancing, and it is the one question this product exists to answer. The negative case is well served; the ordinary case is not served at all.

The two are one concern because an at-a-glance assurance is only worth drawing if it is **current**. A prominent "everything is protected" computed from a snapshot taken at unlock is worse than none: it converts a stale read into a confident false statement, which is the failure [states.md](states.md) already names — *"a product that says 'nothing here' when it means 'I don't know yet' is one a user stops trusting with their secrets."*

# Approach

TBD — blocked on the design forks in [QUESTIONS.md](QUESTIONS.md).

# Steps

- [!] Research solution directions — blocked, awaiting answers in QUESTIONS.md

# Open threads

- Whether the exposure indicator already specified for the title bar ([README.md](README.md)) is the right carrier for the positive statement too, or whether an assurance and an alarm are different enough to want different homes. Settling this depends on the freshness fork below.
