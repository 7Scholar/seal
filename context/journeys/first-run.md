Operated per [the journeys manual](../../docs/plans/JOURNEYS.md).

# Who and why

Someone has just installed Seal and is opening it for the first time. They have a repository with a `.env.production` in it that they would rather not have sitting readable on disk, and they came here to fix that.

What they know: roughly what encryption is, and that this tool encrypts secret files in their repositories. That is all.

What they do **not** know, and must never be assumed to know: that there is such a thing as a master password until the product tells them; that the password is unrecoverable; that a password is being *created* rather than *entered*; that anything is called a registry, a session, or a repo record; that sealing is separate from bringing a file under management; that the product cannot undo an exposure that already happened.

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
- That managing a file and encrypting it are different actions.

**Never assumed:**

- That the user knows any internal vocabulary. Every word on screen is one they would use themselves.
- That the user will read a wall of text. The unrecoverability warning must land in a form people actually absorb.

# Demonstration

**Driven end to end, automated, 2026-07-31; re-driven 2026-08-01** after the intake surface became a tree, by the journey harness ([the harness plan](../plans/app/desktop/journey-harness.md)) against a release build of the real application on macOS, from a scratch home holding nothing — no registry, no password, no repositories. Three consecutive full runs green. What the run asserts, in order: the application opens to *choosing* a master password, saying so and stating that it can never be recovered; a mistyped confirmation sets nothing and starts over; matching entries establish and land in the empty state with the add action; the password exists on disk only as a sealed age file that does not contain it; adding a repository runs through the folder picker, draws the repository as its own tree, and preselects only the real secret; sealing is refused until the two irreversible facts are acknowledged behind typed confirmation; the file in the repository is genuinely armored age text with no trace of the secret; and locking, a wrong password is refused saying nothing was changed, then the right one reopens to the sealed file.

The drive also caught what only a real webview shows: a synthesized Enter never triggers implicit form submission, so the unlock shield now submits on its own keydown — the exact class of defect this axis exists to catch.

The earlier baseline — a password prompt with no explanation and an intake button that did nothing — is preserved in history; both defects are fixed and the fixes are what the demonstration exercises.

# Findings

1. **The product has no concept of a first run.** It cannot distinguish a new user from a returning one, so it asks a first-time user to unlock something that does not exist. **Routed:** framed as [first-open](../plans/app/desktop/first-open.md), carrying the decided shape — one identical surface on every open, the first open setting the master password, later opens checking it.

2. **Choosing a folder does not work.** The only route into the product's core loop is inert. **Routed and closed:** the pick became a purpose-built command backed by the native dialog ([commands](../plans/app/desktop/commands.md)); the automated demonstration drives through it.

3. **The irreversibility warning arrives too late to inform the decision it is about.** It is shown before the first encryption, which is after the user has already committed to a password they cannot recover. **Routed:** to [first-open](../plans/app/desktop/first-open.md), whose bar is that both facts land at establishment.

4. **The empty state does not carry its own weight.** It names the situation but does not lead anyone anywhere. **Routed:** to [first-open](../plans/app/desktop/first-open.md) — the decided shape makes the empty state the onboarding vehicle, so its weight is that plan's concern.

Driving the journey in full found one more, now closed: relying on implicit form submission made Enter dead under the real webview's synthesized events ([screens](../plans/app/desktop/ui/screens.md) owns the fix). No findings remain open — **this journey is satisfied on macOS by the automated demonstration.**
