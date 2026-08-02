# Questions

## Where does the cross-repository exposure alert live once the sidebar is gone?

The redesign removes the repository sidebar. That sidebar was not only navigation — the plans deliberately assigned it one safety job that nothing else in the interface does.

An **exposure** is a file Seal recorded as sealed that is now sitting readable on disk, which means a secret is in the clear right now. [The exposure journey](../../../../journeys/exposure.md) says the product must tell the user "wherever they happen to be", and lists "exposure indicated only somewhere the user might not be looking" as something that must never happen. The sidebar satisfied that by being the one element on screen at all times, so a repository the user was *not* looking at could still raise its hand.

In the new design every surface is full-width and one altitude deep, so when a user is inside repository A there is nothing on screen that mentions repository B. The alert needs a new carrier, and the options differ enough in feel that this is your call rather than mine.

**Option A — the title bar strip.** A small indicator beside the Lock control, present at every altitude, showing a count when it is non-zero and nothing when it is zero; clicking it navigates to the affected repository. Always visible, costs a little of the strip, and is the closest equivalent of what the sidebar did.

**Option B — a banner beneath the title bar.** A full-width strip that appears on every surface when any repository has an exposure, naming the repositories and offering to go there. Much harder to miss than A, and it pushes the surface down whenever it is present.

**Option C — only on the repositories grid.** The affected repository's tile carries the alert, and nothing appears while the user is inside another repository. Quietest, and it accepts that a user working in repository A is not told about repository B until they navigate up.

I have built **Option A**, because it is the only one of the three that satisfies the journey's "wherever they happen to be" without a permanent full-width band, and because it preserves the scale-chrome-to-zero rule the product already holds. If you prefer B or C, say so and I will change it — C in particular is a real relaxation of the journey's requirement, so it would want the journey updated to match rather than left contradicting the build.

**Answer:**
