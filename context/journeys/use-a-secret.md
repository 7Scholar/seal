Operated per [the journeys manual](../../docs/plans/JOURNEYS.md).

# Who and why

Someone who has protected files and now needs to actually work with them — read a value, correct one, and use one from a deploy script. This is the journey that decides whether Seal is worth keeping: protection nobody can work with gets abandoned.

# The path

1. **They open a protected file.** They should understand that the file on disk stays protected, and that they are looking at it rather than unlocking it permanently.

2. **They find the value they want.** Values are hidden by default. They should be able to see one when they need it, understand that they are revealing one thing rather than everything, and hide it again.

3. **They correct a value.** A rotated key, a changed URL. They should be able to edit one value without touching anything else, see clearly what is unsaved, and save with confidence.

4. **Their file survives the edit.** The comments they wrote, the order they chose, the spacing, the blank lines — all exactly as they were. Only the value they changed is different. This matters enormously and is invisible when it works.

5. **They close it, and it is protected again.** No ambiguity about whether their secret is still sitting readable somewhere.

6. **A file that is not an env file.** They should understand it is protected and stored as-is, and not be offered an editor that would corrupt it.

7. **Their deploy script reads a secret.** From the command line, at the moment of use, with the password typed then and there. The script should work, and failures should be distinguishable — a wrong password is not the same as a missing file.

8. **They step away and come back.** Something they left open should not still be sitting decrypted in memory an hour later, and returning to it should be unsurprising.

# What good looks like

**Never happens:**

- A saved file differing anywhere the user did not edit.
- More of a file's contents becoming visible than the user asked for.
- Merely looking at a value marking the file as changed.
- A non-env file offered an editor that would mangle it.
- Losing an edit without being warned.
- A script failure that gives no usable indication of what went wrong.

**Obvious without explanation:**

- Whether a file is currently protected.
- What is unsaved, and what saving will do.
- That revealing a value is one value, one time.
- Why a non-env file cannot be edited here.

**Never assumed:**

- That the user remembers which files they left open.
- That the user will check whether their file survived the round trip. It must simply be true.

# Demonstration

**Steps 1 through 5 driven, automated, 2026-07-31**, in the harness's `return-and-use` scenario running after `first-run` (`bun run e2e:extended`): the sealed file opens as masked structure with the secret provably absent from the page, the file on disk stays armored the whole time it is open, one value reveals on request and conceals again, an edit saves with the dirty count clearing and the file still sealed on disk, and closing returns to the repository view with the file protected.

**Step 8 driven, automated, 2026-08-04**, in the harness's `plaintext-expiry` scenario (`bun run e2e:expiry`), six of six green against an application launched with a three-second held-plaintext lifetime. What was witnessed: the value reveals normally while the user is working; after the lifetime elapses the plaintext is gone from Rust, proven by invoking `reveal` across the boundary and requiring the refusal to be `notOpen` specifically rather than any error; the refusal reaches the user as an explanation in their own language rather than as a dead control; the file was left sealed on disk throughout; and opening it again picks straight back up. Confirmed non-vacuous by compiling the lifetime seam out and re-driving — the two checks that measure the deadline fail, the four that do not still pass.

**Step 6 driven, automated, 2026-08-04**, in the harness's `settling-in` scenario (`bun run e2e:settling`), seven of seven green. What was witnessed: a `terraform.tfvars` sealed alongside an env file opens with no editable row, no value input and no save control anywhere on the surface — the shape that was measured corrupting exactly this file type before the name gate existed; the surface states both why there is nothing to edit and that the file is stored exactly as it was written; and the file is still armored on disk after the round trip. Confirmed non-vacuous by removing the editable-env-file name gate and re-driving: those two checks fail while the rest pass, and the file survived on disk in the broken build too — the gate protects the editor, and sealing protects the bytes.

**Not driven:** step 7, the command-line resolve from a script. It is not blocked; it drives the **CLI binary** rather than the desktop app, so it needs a different harness shape. The journey is not satisfied until it is driven.

# Findings

**1. A revealed value stays on screen after its plaintext has expired. — Open, routed.**

Found while driving step 8. Revealing a value copies it into the editor's component state, and nothing clears that state when the deadline passes in Rust — there is no timer, no subscription, and no notification from Rust to the interface. Measured: with a three-second lifetime, the secret was still rendered on screen well after Rust had refused to serve it again. The product's actual guarantee is intact and was verified in the same run — the plaintext really is gone from memory, and the file stayed sealed on disk — so this is not the "held a decrypted secret all afternoon" failure the journey warns about. It is the weaker but real one: the screen keeps displaying a secret the product no longer holds, so a user who steps away leaves a value visible on an unattended display for as long as the window stays open.

Worth stating precisely, because the first version of this check asserted the value would disappear and that assertion was wrong about the product as designed: [screens.md](../plans/app/desktop/ui/screens.md) specifies that a revealed value lives in component state and nowhere else, and says nothing about clearing it on expiry. So this is a missing concern rather than a defect against a stated contract — the interface has no notion of a held secret's lifetime at all. It belongs with the same question the axis has already raised twice: the interface only learns what Rust knows when it asks, and nothing makes it ask. Routed to [freshness.md](../plans/app/desktop/ui/navigation/freshness.md), which owns that gap and is blocked on the product owner.

Step 7 remains to be driven.
