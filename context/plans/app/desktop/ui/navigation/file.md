Part of [the navigation plan](README.md).

# Scope

The **file altitude**: the surface a managed file opens into, and how the environment-variables editor is re-homed onto it. Out of scope: the editor's own internals — the row list, the masking, the reveal contract, the save semantics — which [screens.md](../screens.md) owns unchanged.

# What & why

The bottom altitude. For an env file it is the per-variable editor the root intent names as the product's editing surface, modelled on Vercel's; for anything else it is the opaque statement, because Seal contains no general-purpose editor.

The editor already exists and is close to its reference. What changes is its **container**: it had a header with a Close button because it was a screen that replaced the window, and it is now an altitude the trail navigates out of.

# Approach

## The trail replaces the close button

Leaving a file is navigating up, which the trail already does. So the editor's own **Close** control is gone: two ways to leave one surface, one of which looks like dismissing a dialog, is exactly the ambiguity the routing model exists to remove.

What Close *did* beyond navigating still happens — navigating up from a file closes it through the same command, releasing the plaintext the session holds rather than merely hiding it ([breadcrumbs.md](breadcrumbs.md) owns that rule). The behaviour is preserved; only the control is gone.

## The surface's header

The trail states which file is open, so the surface does not repeat it as a heading. The header carries what the trail cannot: the file's **path within its repository**, its **state**, and the operation that changes that state — **Seal** on a readable file, **Unseal** on a sealed one. The state and the control that changes it belong together, which is why this is the header's job rather than the footer's: the footer is about the *edit* in progress, and sealing is about the *file*.

## The footer is about the edit, and holds exactly two controls

**Cancel** and **Save**, in that order, at the trailing edge. Nothing else — a footer that also holds a state-changing verb makes a user reason about two unrelated axes in the same row.

- **Cancel is always enabled.** Leaving is never blocked, and a disabled way out is how a surface traps someone.
- **Save is enabled only when something has changed.** With nothing pending there is nothing to save, and an enabled control that would do nothing is a lie about the state of the work.
- **Save says what it will do**: `Save and seal` on a sealed file, plain `Save` on a readable one. A save honours the file's state rather than overriding it — sealing on save would silently undo a deliberate unseal, which is exactly the choice the user just made.
- **Cancel with pending changes confirms first**, naming how many values would be lost and stating that the file itself is unchanged. With nothing pending it leaves immediately: a confirmation that fires when there is nothing to lose is the ceremony [the disclosure rules](../shell-layout.md) reserve for consequences.

The unsaved-changes indicator keeps its position and its behaviour exactly — including that revealing a value is never an edit and never marks the file dirty, which is the defect [the interface memory](../MEMORY.md) records a comparable product shipping.

## Meeting an expired file mid-task

The plaintext a session holds expires on its own, so a user who steps away and comes back can press **Edit** on a row whose secret Seal no longer holds. What happened then was the surface's worst failure of its own rule: a banner said the file was no longer open and offered **no way to open it again** — a dead end reached by doing nothing wrong.

The interface now treats an expired file as what it is: **the session is over**. A refusal that reports the plaintext is gone **locks the application**, exactly as a `locked` refusal does, because the two are the same situation reached by different routes. The lock screen says Seal locked itself and that unlocking picks up where the user left off.

**Unlocking then restores where they were**, not the repositories grid: the same file, reopened, with the same row already in edit and its value in the field. That is what makes the lock a continuation rather than a punishment — the user's next action after unlocking is the one they were trying to take before.

Two bounds on it. The resume is recorded only for a lock the *application* imposed; locking deliberately from the title bar returns to the grid, because the user asked to leave rather than to be interrupted. And a resume naming a variable the file no longer holds is dropped silently rather than failing, since the file may have changed while the session was gone.

## The notices

The duplicate-key notice stays. The unparseable-line notice is **retired**: those lines are now editable rows that [editing/surface.md](editing/surface.md) owns, and a count of things the user can see and act on is noise. It is a statement of fact about the file that affects what saving will do, which makes it state rather than the disallowed explanatory prose — the rule permits neither more nor less than that.

## A non-env file

Opens as a statement of what it is and what Seal does with it, with no editing surface. Unchanged from [screens.md](../screens.md) beyond losing its Close button for the same reason the editor did.

## Every state the surface can occupy

The rule the other two altitudes established holds here: **a surface's states are the same surface, not different screens, and a surface never states a fact it does not have.** This altitude is where that rule is hardest to satisfy, because arriving is asynchronous — the route names the file before the file's contents exist — so the interface must be able to draw *"this file, opening"* and *"this file, which would not open"* without leaving the altitude.

**Loading.** Navigating into a file sets the route and then awaits the open, so there is a window in which the altitude is current and its contents are absent. It draws the **file surface's own skeleton**: the header in place with the file's path — which the route already knows and the open does not supply — and a short run of placeholder rows in the row shape, marked `aria-busy`. The skeleton pulses, and the pulse is dropped under `prefers-reduced-motion`, exactly as the grid's is. What it must never do is render nothing, which is what the surface did: the content region was measured empty for the whole open, so the window below the trail was blank while the trail said the user was inside a file.

**Error.** An open that fails states the failure **on the surface**, not only in the window's problem banner. The banner is dismissible and global; dismissing it left the altitude current, `opened` still absent, and every render branch guarded on it — so the user was left in a file with a blank window and no way to tell what had happened. The surface now says that Seal could not open **this file**, gives the reason from the same vocabulary the banner uses, offers a **retry**, and offers a way **back to the repository**. The two affordances matter equally: retry addresses the transient causes, and back addresses the rest, because a failed open must never be a dead end at an altitude with no content.

**Excessive.** A file with hundreds of variables is the state that broke the frame. Measured at 400 variables in a 720px window: the surface rendered **26,756px tall inside a 673px content region**, the document itself scrolled, and the save control sat at **26,776px** — unreachable without scrolling past every row. A user cannot save a large file, which makes this the surface's one genuinely broken state rather than an unfinished one.

The fix is the frame the manage surface already established and this surface never received: **three bands at the window's height — a fixed header, the rows as the only scrolling region, and a pinned footer.** The save control, the dirty count and *Seal and close* are always on screen whatever the file holds, and the document does not scroll at all. The surface also states its **variable count** beside the path, the same fact its two sibling altitudes state, so the size of what is below the fold is knowable without scrolling.

The frame alone did not settle it, and the second cause is not this surface's at all. With every element in the chain measuring correctly — the shell, the content region, the surface and the row region all at the window's height or less — **the document still scrolled, to 26,695px**. The cause is the visually-hidden utility every masked value carries a copy of: absolutely positioned with no offsets, it resolves against the initial containing block rather than the scrolling region, so each of the 394 escaped spans sat at its own flow offset and extended the document. It is fixed on the utility, where it belongs, since any surface rendering enough of them would have met it. [The interface memory](../MEMORY.md) holds why the offsets must stay.

**Empty** is a real and already-handled case — an env file with no variables is an ordinary file — and it renders the frame with an empty row region saying the file defines no variables. **Unavailable** is the non-env file above. **Degraded** is not reachable at this altitude: an open either yields the file's variables or fails, with no partial result to report.

# What exists

The row's own presentation — which verbs hold a slot and which collapse into an overflow menu — is [editing/row-density.md](editing/row-density.md)'s, and the three-band frame below is what makes its collapse worth having at four hundred variables.

All of the Approach: the editor re-homed with its internals untouched, the header carrying path, state, count and the seal/unseal control, the two-control footer with its confirmation, the expiry re-lock and its resume, the opaque surface, and every state above — the skeleton, the surface-level failure with its retry and its way back, and the three-band frame.

Interface tests cover that navigating up from a file closes it, that the editor's reveal and save contracts are unchanged in the new container, that a non-env file offers no editing surface, that the skeleton renders while an open is in flight, that a failed open states itself on the surface with both affordances, and the variable count in both singular and plural. The footer's own set: exactly two controls and no more, the label following the file's state in both directions, Cancel enabled while Save is not, an immediate leave with nothing pending, the confirmation appearing with changes pending and leaving only on confirming, and the edits surviving a declined discard. The resume's set: the row reopens with its value, nothing resumes when no row was being edited, and a resume naming a missing variable is dropped without failing.

Driven against the real application by two scenarios. `bun run e2e:largefile`: at 400 variables every row renders, the surface is the window's height rather than its content's, the document does not scroll, the save control is on screen with the rows scrolled to their end, and the surface states the true count. And a scenario of its own for the expiry path, run against a **three-second** held-plaintext lifetime through the harness seam: pressing Edit after the plaintext has gone locks the application and says why, unlocking returns to the same file with the same row carrying its real value, and the resumed edit then saves with the file still sealed.

Guards confirmed non-vacuous by reintroducing the defect each prevents:

- navigating up without closing the file — leaving plaintext held in the session — fails 1
- rendering nothing while an open is in flight fails 1
- routing a failed open only to the global banner, leaving the altitude blank, fails 2
- letting the surface size to its content, putting the save control below the fold, fails 1
- removing the count fails 2

# Steps

- [x] Re-home the editor, removing its Close control and preserving the close on navigation.
- [x] The header carrying the file's path, state and operations.
- [x] The opaque surface for a non-env file.
- [x] Tests, including that navigating up actually closes the file.
- [x] The states beyond populated: the skeleton, the surface-level failure, the three-band frame and the count.
- [x] The two-control footer, its state-following save label, and the discard confirmation.
- [x] The expiry re-lock and the resume that returns to the same file and row.

# Open threads

- Nothing virtualizes. At 400 variables every row is in the document — 2,850 nodes measured — which the frame now contains but does not reduce. The count makes the size visible; the DOM cost is untouched, as on the grid and the files list.
