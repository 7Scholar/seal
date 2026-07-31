# Questions

Design forks blocking work in this folder. Answer in place, under **Answer**.

## 1. How does the product know a master password exists?

**Status:** awaiting an answer. Blocks [first-open.md](first-open.md).

**Why this needs you.** The decided shape — first open sets the master password, every later open checks it — requires two things the product does not have: a durable record that a password has been established, and something to check an entered password against. Both mean some password-derived artifact living on the machine, and the root Approach currently states that passwords exist only in the user's head. Any verifier weakens that sentence to "the password is never *stored*, but a check-value derived from it is" — which is already true of every sealed file (each carries an scrypt stanza an offline attacker can grind against), but making it true from the first open, before anything is sealed, is a threat-model statement you should bless rather than inherit.

**A. A sealed sentinel file in the application's own state directory.** On establishment, seal a small fixed content under the master password using the ordinary engine; later opens verify by unsealing it. Established-or-not is exactly "does the sentinel exist." The artifact is a standard age file, so it stays inside the format story, its offline-guessing surface is identical to any sealed file, and the supervised password change re-seals it like everything else.

**B. Verify against an already-sealed managed file, no new artifact.** Nothing new on disk; "established" means "at least one sealed file exists." But the state between choosing a password and sealing the first file is then undefined — wiping or releasing every repo would silently drop the product back into set-the-password mode, where a typo forks a second password without anyone noticing. The dangerous edge sits exactly on the journey this exists to fix.

**C. A key-derivation verifier stored in the registry file.** A stored hash rather than a sealed file. Same guessing surface as A, but a bespoke format outside the age story, and a second password-derived artifact class for the password change to migrate.

**My recommendation: A.** It is the only option where "established" is unambiguous in every state, and it adds no exposure class that sealed files have not already accepted — at the cost of that exposure beginning at establishment rather than at the first seal, which is the nuance to consciously accept.

**Answer:**

A