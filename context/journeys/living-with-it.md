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

**Fragments driven, 2026-07-31:** the returning experience's skeleton — relaunching into the locked shield rather than the choosing one, unlocking into the repository view, deliberate locking from the header, and a wrong password answered plainly — is exercised by the harness's scenarios. The texture this journey is actually about — the glance, expiry after stepping away, errors met in real use, the bad day — has not been driven.

This journey is best driven after a gap — return to it on a later session rather than immediately after building, since it is about returning rather than about first use.

# Findings

Open, pending the journey being driven.
