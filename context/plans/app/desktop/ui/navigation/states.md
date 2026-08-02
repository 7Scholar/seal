Part of [the navigation plan](README.md).

# Scope

The states the three navigation surfaces can occupy beyond the populated one: **empty, loading, error, excessive, degraded and unavailable**. Out of scope: what the populated case shows, which each altitude's own plan owns.

# What & why

[The surface audit](_docs/surface-audit.md) found that the three altitudes were built for the case where everything is present and working, and that the other states were never enumerated — so they were never designed. What exists in their place is either a fallback that belongs to a different visual language, or nothing at all.

Two of the findings are not merely unfinished but **wrong**, in that the interface makes a false statement about the product's state:

- **The repositories grid reports the user's data as absent while it is still loading, and permanently if the load fails.** `repos` starts empty, the surface returns its empty state on an empty list, and the launch refresh sets no loading flag and handles no rejection. Empty, loading and failed are one screen, and that screen says *"Seal manages nothing yet"*. A returning user with twenty repositories meets it on every launch.
- **A file whose state is `missing` has its open control disabled with nothing said about why**, which is the silent disable the state enumeration exists to prevent.

The rest are undesigned rather than untrue: no surface anywhere in the interface has a loading treatment; a 120-character repository name inflates its tile from 338×177 to 338×283 and breaks the grid row; nothing states how many repositories there are and nothing virtualizes; and the empty repository at the files altitude is a bare sentence where the populated surface is a list of large rows.

Why it matters beyond tidiness: these are the states a user meets at exactly the moments they are least sure the product is working — first launch, a slow disk, a failed scan. A product that says "nothing here" when it means "I don't know yet" is one a user stops trusting with their secrets.

# Approach

TBD

# Steps

- [ ] Research solution directions
