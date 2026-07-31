Part of [the interface plan](README.md).

# Scope

How a command failure reaches the user: the plain-language explanation of every error kind the boundary can produce, the surface that shows it, and what happens when the failure is the session itself having ended. Out of scope: the exposure alert, which is not an error but a state, and the boundary's error type itself (`../commands.md`).

# What & why

Every operation the interface invokes can fail — a file moved, a disk refused, a password wrong, a session expired — and a failure that surfaces as nothing at all is a dead control: the user clicks, nothing happens, and the product cannot be trusted. The first-run journey names this among the things that must never happen: no raw error, no internal term, no technical failure without a plain-language explanation and a suggested next step.

# Approach

**Every kind the boundary can produce has one plain-language explanation**, written once in a pure mapping from the command error to a sentence naming the attempted action, the file where one is involved, what happened in the user's words, and what to do next. Two rules hold for every message: it states what was *not* changed when that is the reassurance that matters (a wrong password changed nothing; a registry failure touched nothing in the repository), and it never leaks an internal term, an error code, or an underlying error's text. Anything unrecognised gets a safe generic sentence rather than its own words.

**One dismissible problem banner presents them.** It renders as an alert above whatever screen is active and is explicitly dismissible — unlike the exposure alert, whose non-dismissibility is the point. One problem shows at a time; a newer one replaces it.

**A session-expiry failure is not a message but a re-lock.** When any command fails because the session is locked, the application does not explain it in place: it returns to the unlock shield, clears every transient dialog, and hands the shield a notice saying Seal locked itself and everything stayed sealed. The notice shows until typing starts.

**Screens absorb what the application has already surfaced.** Failure handling lives at the application level, where the screen-switching and re-locking decisions belong; the props handed to screens surface the failure there and re-throw, and the screen's own handler then catches and stops. What a screen must preserve on failure is its user's work: the editor keeps unsaved edits when a save fails, so nothing typed is lost. The supervised password change is the exception — its failures display inline beside its fields, through the same mapping, because a wrong current password must be answered where the password was typed.

# What exists

All of the above: the mapping with a message per kind, the banner, the re-lock with its shield notice, the editor keeping its edits on a failed save, and the password change explaining a wrong current password inline. Covered by the mapping's own tests plus per-screen failure tests.

# What is missing

Nothing on this plan.

# Steps

- [x] The mapping, with every kind covered and a generic fallback.
- [x] The banner, dismissible, one at a time.
- [x] The re-lock on a locked-session failure, with the shield notice.
- [x] Per-screen failure behaviour: edits kept, password change inline.

# Open threads

No open threads yet.
