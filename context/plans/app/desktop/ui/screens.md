Part of [the interface plan](README.md).

# Scope

The screens themselves and the shared primitives beneath them: the cross-repo view, the manage flow, the environment-variables editor, the unlock gate, and the first-seal acknowledgement. Out of scope: the frontend build and typed boundary (`shell.md`), and the supervised master-password change (`password-change.md`), which is a flow rather than a screen.

# Approach

The behaviour is fixed by [the interface Approach](README.md) and the [research](_docs/ux-research.md) beneath it. What this plan adds is where each rule is enforced, so a later change cannot quietly drop one.

## The primitives carry the rules

Three shared components exist because their rules are easy to violate independently in every screen that needs them.

**The secret value control** holds the reveal contract: the masked text, a toggle whose state lives in `aria-pressed` rather than in its label or its glyph, an accessible name that names its variable so rows are distinguishable, a live announcement of the state, and copy offered only once a value is actually revealed. Every one of those is a separate assertion, because a surveyed product shipped this control with state conveyed by icon alone — twice.

**The exposure alert** renders nothing at all when nothing is exposed, has no dismiss control of any kind, and carries a seal action per exposed file. It also says to rotate, because sealing cannot undo an exposure that already happened.

**The confirmation** labels its buttons with outcomes rather than Yes and No, and optionally demands a typed phrase. The typed phrase is what makes a confirmation something other than theatre: it cannot be satisfied by the reflex that opened the dialog.

## Where each screen's weight sits

**The cross-repo view** treats its empty state as the add action itself, since nothing else is possible until a repo exists. Its alert is derived from the per-file flag rather than from the file's state, which is what keeps the treatment reserved for the genuine regression — a file recorded sealed and found readable — and away from a missing file or one the user never sealed. Sealing is offered only where it applies, and stopping management is offered per file. That view is realized by the repositories grid and the files surface, whose layout is [navigation/](navigation/README.md)'s and whose disclosure rules are [shell-layout.md](shell-layout.md)'s; the behavioural rules stated here hold wherever it is rendered.

**The manage flow** preselects only what the scan judged genuinely secret and shows why each candidate was proposed. The conservative preselection is load-bearing rather than timid: over-inclusion here encrypts a file that was meant to stay readable and breaks the user's build. That rule is stated here and holds wherever the flow is rendered; the surface rendering it is now a tree over the whole repository rather than candidates grouped by classification, which [repo-layer/adopting.md](repo-layer/adopting.md) owns along with the folder-selection invariant that keeps the same over-inclusion from arriving in bulk.

**The environment-variables editor** holds the rule with the most evidence behind it: **revealing a value must never mark the file dirty.** Reveal is held outside the draft entirely, and only the draft's difference from the opened view feeds the unsaved-changes count and the save payload. Saving sends only what actually changed.

Its vocabulary is now the full one — create, rename, delete, duplicate, reorder, and enabling or disabling a variable — which [navigation/editing/](navigation/editing/README.md) owns. Two of its rules replace what this plan previously stated: a **commented-out assignment is a disabled variable** with its own toggle rather than a comment, and an **unparseable line is an editable row** with a `Correct` that refuses rather than guessing, so the notice that counted them is retired. Duplicate keys are still explained as preserved rather than reported as errors.

The editor opens a managed file **whatever its on-disk state**, a readable one exactly as a sealed one, and **a save preserves the state it found**: a sealed file is re-sealed, a readable one is written back readable. Saving is an edit, not a state change — the file's state is the user's own choice, made through Seal and Unseal, and a save that silently sealed would undo that choice at the moment the user was thinking about something else. The save control names which it will do, `Save and seal` or `Save`, so the outcome is stated before it happens rather than discovered after.

**The unlock gate** is a shield of coal-fine sand drawn over a lit ground: the pointer parts the grains and they close again at once, and every typed character answers with a brief glow somewhere in the shield. The password is typed straight at the screen — the field is real but visually hidden, which keeps the label, the masking, and the autocomplete opt-outs — and Enter is the single verb: it attempts the unlock, a working state shows while the key is derived, and a wrong password says the files were not opened and nothing was changed, rather than implying damage, clearing the attempt so retyping and Enter always submit fresh. The shield honours the reduced-motion preference and renders nothing at all where no drawing context exists, which is also what keeps the screen testable.

The same gate carries the establishing mode ([first-open.md](../first-open.md)): when no master password exists, the heading and hint say one is being *chosen*, state that it can never be recovered, and demand it twice — the first Enter asks for confirmation, a mismatch sets nothing and starts over, and a failure to set says nothing was changed.

**The acknowledgement** states both irreversible facts, tells the user to rotate an already-exposed credential, and is gated on a typed phrase.

## The application-level flows around the screens

The application shell that hosts the screens carries three flows of its own. The add entry asks the folder-pick command for a path and only then scans, so cancelling the native dialog is a quiet no-op. Sealing first asks for the recency warning and, when one comes back, interposes a confirmation stating the modification gap, what Seal cannot see — an editor's unsaved buffer — and the instruction that actually works, closing the file in the editor first; only confirming proceeds to the acknowledgement gate and the seal. And every failure a screen does not handle inline surfaces through the problem banner per [errors.md](errors.md), with a locked-session failure re-locking to the shield instead. The shield accepts an outside notice for exactly that arrival, shown until typing starts.

## The interface holds nothing

A revealed value lives in component state for the row displaying it and nowhere else. Nothing is persisted, which the memory-only webview enforces regardless of what the interface attempts.

# What exists

All of the above, with sixty-two tests. The cross-repo view's own assertions — the alert derived from the per-file flag, sealing offered only where it applies, a missing file never treated as an exposure — moved with it onto the shell's surfaces and are asserted under [shell-layout.md](shell-layout.md).

Three guards were confirmed non-vacuous by reintroducing the exact defect each prevents:

- conveying reveal state by label and glyph instead of `aria-pressed`, the shape shipped in a real product, fails 5 tests
- making reveal write into the edit map, the bug a surveyed product shipped when it added click-to-reveal, fails 2
- preselecting every candidate, the select-everything default, fails 5

One defect was caught during the work by a test rather than by review: the unsaved-changes indicator and the reveal announcement both claimed the same live region, so assistive technology would have had two competing status sources on one screen.

# What is missing

Nothing on this plan. The folder picker is currently the platform prompt rather than a native dialog, which is a packaging concern rather than a screen one.

# Steps

- [x] The shared primitives, each with its rules asserted separately.
- [x] The cross-repo view with the alert derived from the per-file flag.
- [x] The manage flow with grouped candidates and conservative preselection.
- [x] The environment-variables editor, with reveal and edit as separate state.
- [x] The unlock gate and the first-seal acknowledgement.
- [x] Tests, with each load-bearing guard confirmed non-vacuous.

# Open threads

- The folder picker uses the platform prompt. A native dialog is the obvious improvement and belongs with packaging, where the dialog capability is configured.
- Copy currently places a revealed value on the clipboard with no timer. The research names ninety seconds as the only concrete reference found; the duration wants observation rather than a guess.
