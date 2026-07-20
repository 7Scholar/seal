Operated per [the journeys manual](../../docs/plans/JOURNEYS.md).

# Who and why

Someone has just installed Seal and is opening it for the first time. They have a repository with a `.env.production` in it that they would rather not have sitting readable on disk, and they came here to fix that.

What they know: roughly what encryption is, and that this tool encrypts secret files in their repositories. That is all.

What they do **not** know, and must never be assumed to know: that there is such a thing as a master password until the product tells them; that the password is unrecoverable; that a password is being *created* rather than *entered*; that anything is called a registry, a session, or a repo record; that sealing is separate from importing; that the product cannot undo an exposure that already happened.

They are, at this moment, deciding whether this tool is trustworthy. Everything below is judged against that.

# The path

1. **They open the application.** They should meet something that tells them what this is and what happens next. They have nothing yet — no repositories, no password, no files — and the product should be visibly aware of that rather than presenting an interface built for someone who already has all three.

2. **They establish their master password.** This is the first thing the product asks of them, and it is the highest-stakes moment in the entire product: the password cannot be recovered, and everything they protect from here depends on it. They should understand that they are choosing a password now, not recalling one. They should have to enter it in a way that catches a typo, because a mistyped password at this moment silently locks them out of everything they later protect. They should be told, in words they will actually read, what a forgotten password means.

3. **They understand what Seal will and will not do for them.** Before anything is encrypted they need two facts: that a forgotten password means the data is gone, and that sealing a secret which has already been sitting readable does not un-expose it — that credential needs rotating. These are not fine print. They are the terms of the deal, and someone who learns them later will feel misled.

4. **They get to their first repository.** From a completely empty state, the path to "Seal is now protecting something of mine" should be obvious and short. They should not have to guess what to do, and they should not have to know a file path by heart.

5. **They choose a folder.** However this happens, it must work the way choosing a folder works everywhere else on their machine. They have a repository in mind; they should be able to find it the way they find any folder.

6. **They see what Seal found, and decide.** Seal proposes files it believes hold secrets. They should understand why each was proposed, which ones are pre-chosen and why, and that nothing has been encrypted yet. They should be able to disagree with any of it.

7. **They confirm, and land somewhere that makes sense.** They should be able to see what Seal is now managing, understand that it is not yet encrypted, and know what to do next.

# What good looks like

**Never happens:**

- A control that does nothing when clicked. Every interactive element either acts, or explains why it cannot.
- A screen with no way forward for the state the user is actually in.
- Being asked to type a path, a name, or an identifier the product could have offered.
- A raw error, an internal term, or a technical failure surfaced with no plain-language explanation and no suggested next step.
- Silence during anything slow. Deriving a key takes noticeable time; the product must show that it is working.
- Anything encrypted without the user having deliberately asked for it.
- The two irreversibility facts appearing only after something has been encrypted.

**Obvious without explanation:**

- That this is a first run and the product is empty because it is new, not because something failed.
- That a password is being created rather than entered.
- What to do next, at every single step, including the empty state.
- That importing and encrypting are different actions.

**Never assumed:**

- That the user knows any internal vocabulary. Every word on screen is one they would use themselves.
- That the user will read a wall of text. The unrecoverability warning must land in a form people actually absorb.

# Demonstration

**Never driven.** This journey has not been walked end to end in the real application.

What is known from a single partial attempt by the project owner, on an installed build: the application opened directly to a password prompt with no explanation, no confirmation field, and no indication that the password was being created rather than entered. After entering one, the next screen showed a title and a single button. The button did nothing at all. The journey ended there, at step 5 of 7.

This is recorded as the baseline, not as the demonstration. The journey is satisfied only when it has been driven to completion against a build containing the fixes.

# Findings

All open. None has been routed into the implementation tree yet.

1. **The product has no concept of a first run.** It cannot distinguish a new user from a returning one, so it asks a first-time user to unlock something that does not exist. This is a missing concern rather than a defect in an existing one — no plan owns "what happens the first time" — and routing it will mean framing new work rather than fixing existing work.

2. **Choosing a folder does not work.** The only route into the product's core loop is inert.

3. **The irreversibility warning arrives too late to inform the decision it is about.** It is shown before the first encryption, which is after the user has already committed to a password they cannot recover.

4. **The empty state does not carry its own weight.** It names the situation but does not lead anyone anywhere.

Driving the journey in full will find more, and is expected to. These four are what a single partial attempt surfaced.
