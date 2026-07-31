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

**Steps 1 through 5 driven, automated, 2026-07-31**, in the harness's `return-and-use` scenario running after `first-run` (`npm run e2e:extended`): the sealed file opens as masked structure with the secret provably absent from the page, the file on disk stays armored the whole time it is open, one value reveals on request and conceals again, an edit saves with the dirty count clearing and the file still sealed on disk, and closing returns to the repository view with the file protected.

**Not driven:** step 6 (a non-env file's no-editor treatment), step 7 (the command-line resolve from a script), and step 8 (plaintext expiring after time away). The scenario's tail is also currently limited by a harness defect recorded in [the harness plan](../plans/app/desktop/journey-harness.md). The journey is not satisfied until all steps are driven.

# Findings

None open from the driven steps. Steps 6–8 remain to be driven.
