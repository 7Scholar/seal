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

**A surface's states are the same surface, not different screens.** A grid's empty state is a grid; a list's is a list. What changes is what the surface holds, never its layout or its language. This is the rule the three altitudes were built without, and it is what makes an empty state look like the product rather than like a placeholder.

**A surface never states a fact it does not have.** Absent, loading and failed are three different things, and collapsing them into one is how the grid came to tell a returning user they manage nothing. Every surface that awaits a call distinguishes them: it says it is working while it is, and says the call failed when it does — with the recovery from where the user is standing.

**A count is a fact and belongs on the surface**, so what is below the fold is knowable without scrolling. A count of zero is not stated, because "0 repositories" is a worse way of saying what the empty state already says.

**Nothing grows to fit its content.** Tiles and rows hold their size; text truncates and carries its full value in a `title`. A path truncates from its left, where the meaningful part is the tail.

The repositories grid is built to this and is the reference for the rest: [repositories.md](repositories.md) records its states in detail.

# What exists

**The repositories grid, completely** — empty, one, populated, excessive, loading, error and no-match, each seen running. The loading and error states are new, the empty state is now an add tile inside the grid, and tiles are a fixed height.

**The files list, except its empty state.** The silent disable is gone — a `missing` file now says why its open control is unavailable, tied to that control by `aria-describedby` — the surface states its managed-file count, and a failed re-read is stated above the list rather than passed off as current. [files.md](files.md) records each in detail.

Two of that surface's states resolved to something other than "build it", and both are recorded rather than glossed:

- **The empty repository is not reachable**, so its markup is unreached. A repository is deleted when its last file is released, the manage flow refuses an empty selection, and a rescan only adds. Whether to make it reachable is [a question for the owner](QUESTIONS.md); it is a decision about what "managing a repository" means, not an implementation detail.
- **The files list has no loading state and does not need one today.** Every launch lands on the grid, and both paths that could leave the route at this altitude with nothing loaded navigate back up to the grid instead — so the surface is only ever reached with its data already in hand. Building a skeleton for it would be guarding a state that cannot occur.

The error case is real, however, and is where this surface's genuine defect was: an operation's trailing re-read can fail, and the surface kept showing the rows it already had while saying nothing. That is now stated.

**Not yet done:** the file surface. It is still built for the populated case — no loading, no surface-level failure, and no treatment for a file with hundreds of variables.

# Steps

- [x] The repositories grid: every state designed, built and driven.
- [~] The files list: the silent disable, the count and the stale notice are built and driven; the empty repository is `[!]` blocked in [files.md](files.md), and loading is recorded as not reachable.
- [ ] The file surface: loading, a surface-level failure, and a file with hundreds of variables.
