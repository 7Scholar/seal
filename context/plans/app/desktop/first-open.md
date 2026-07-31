Part of [the desktop plan](README.md).

# Scope

The product's first-open experience, and the state that makes it possible: knowing whether a master password has ever been established, establishing it on the first open, and verifying it on every open after. Also the empty state's onboarding weight — judged when the first-run journey is driven. Out of scope: the unlock screen's visual treatment, which `ui/screens.md` owns, and the import flow itself, which `lifecycle.md` owns.

# What & why

The product had no concept of a first run: the session stored whatever passphrase it was given without verifying it, and nothing on disk recorded whether a master password existed — so a first-time user was asked to unlock a vault that did not exist, any password "unlocked" an empty install, and a typo at the highest-stakes moment was accepted silently. The first-run journey ([context/journeys/first-run.md](../../../journeys/first-run.md)) surfaced this, together with the irreversibility warning arriving too late and the empty state carrying no onboarding weight.

The decided shape: **the product is exactly the same on the first open as on the hundredth.** Every open shows the unlock shield. If no master password exists, the first open *sets* it; otherwise the open *checks* it. After unlock, one single interface whose empty state carries onboarding. There is no separate setup sequence.

# Approach

## The sentinel

Whether a master password exists is recorded by a **sealed sentinel file**, `password-check.age`, in the application's state directory beside the registry. It is an ordinary age file sealed under the master password, with fixed, non-secret content, so it stays inside the standard-age story and adds no exposure class a sealed file has not already accepted — an offline attacker could always grind against any sealed file's scrypt stanza; the sentinel merely makes that true from establishment rather than from the first seal.

**Established means the sentinel exists *and* classifies as sealed.** A plaintext file at the sentinel's path — the residue of a crash between writing the content and sealing it — counts as not established, and the next establishment overwrites and seals it, so a half-written sentinel can never brick unlocking.

## Establishing

Establishment is refused when a sentinel already exists. Before creating one, if the registry records any file as sealed and that file is actually sealed on disk, the entered password must first open it — this is what stops an install that predates the sentinel, with real files already sealed, from silently forking a second password out of a typo. Then the state directory is created if needed, the sentinel's content written and sealed in place under the standard work factor, and the session unlocked with the proven password.

## Verifying

Unlock without a sentinel is refused as not-established rather than accepted. With one, the entered password must unseal the sentinel; a failure is a wrong password and the session stays locked. The session accepts a password only after it has been proven against the sentinel.

## The password change carries the sentinel

A password-change plan lists the sentinel as its **first** manifest entry, ahead of every managed file. The sentinel is an ordinary sealed file, so it rides the existing reseal machinery unchanged — and converting it first means the password that unlocks the application moves to the new password as soon as a run begins, matching the session's own re-unlock with the new password. An interrupted run therefore unlocks with the new password, and the unfinished-rekey banner names what still needs converting.

## The single surface

The interface asks whether a password is established and renders the one unlock shield in one of two modes. **Verify** is the ordinary unlock. **Create** states that a password is being chosen rather than entered and that it can never be recovered, then demands the password twice: the first Enter stores the candidate and asks for confirmation, a matching second Enter establishes, and a mismatch sets nothing and starts over — a typo at this moment must be caught, because it would silently lock the user out of everything they later protect. A create-mode failure says nothing was changed. Until the established answer arrives, nothing is rendered, so the wrong mode can never flash.

# What exists

All of the above, with eight Rust tests covering the sentinel's lifecycle — establishment, refusal when established, verify accepting the right password and rejecting another, the not-established refusal, the self-healing half-written sentinel, the legacy-install password check, and a rekey moving the unlock password — and five interface tests covering the create mode's choosing language, the confirmation, the typo catch, and the failure copy.

# What is missing

The journey re-drive: the first-run journey has to be driven end to end against a built application, which also judges whether the empty state's onboarding weight satisfies its findings.

# Steps

- [x] Settle how the product knows a master password exists — a sealed sentinel, decided in the question channel
- [x] Design the establish and verify flows within the single-shield shape
- [x] Implement, with tests
- [ ] Re-drive the first-run journey against the built application, including the empty state's onboarding weight

# Open threads

No open threads yet.
