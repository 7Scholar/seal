Part of [the interface plan](README.md).

# Scope

The screens themselves and the shared primitives beneath them: the cross-repo view, the import flow, the environment-variables editor, the unlock gate, and the first-seal acknowledgement. Out of scope: the frontend build and typed boundary (`shell.md`), and the supervised master-password change (`password-change.md`), which is a flow rather than a screen.

# Approach

The behaviour is fixed by [the interface Approach](README.md) and the [research](_docs/ux-research.md) beneath it. What this plan adds is where each rule is enforced, so a later change cannot quietly drop one.

## The primitives carry the rules

Three shared components exist because their rules are easy to violate independently in every screen that needs them.

**The secret value control** holds the reveal contract: the masked text, a toggle whose state lives in `aria-pressed` rather than in its label or its glyph, an accessible name that names its variable so rows are distinguishable, a live announcement of the state, and copy offered only once a value is actually revealed. Every one of those is a separate assertion, because a surveyed product shipped this control with state conveyed by icon alone — twice.

**The exposure alert** renders nothing at all when nothing is exposed, has no dismiss control of any kind, and carries a seal action per exposed file. It also says to rotate, because sealing cannot undo an exposure that already happened.

**The confirmation** labels its buttons with outcomes rather than Yes and No, and optionally demands a typed phrase. The typed phrase is what makes a confirmation something other than theatre: it cannot be satisfied by the reflex that opened the dialog.

## Where each screen's weight sits

**The repo list** treats its empty state as the import action itself, since nothing else is possible until a repo exists. Its alert is derived from the per-file flag rather than from the file's state, which is what keeps the treatment reserved for the genuine regression — a file recorded sealed and found readable — and away from a missing file or one the user never sealed. Sealing is offered only where it applies, and stopping management is offered per file.

**The import flow** groups candidates by classification with counts, preselects only what the scan judged genuinely secret, and scopes select-all to a group. The conservative preselection is load-bearing rather than timid: over-inclusion here encrypts a file that was meant to stay readable and breaks the user's build. It states plainly that importing encrypts nothing, and shows why each candidate was proposed.

**The environment-variables editor** holds the rule with the most evidence behind it: **revealing a value must never mark the file dirty.** Reveal and edit write to separate state, and only the edit map feeds the unsaved-changes count and the save payload. Saving sends only changed pairs. Duplicate keys and unparseable lines are explained as preserved rather than reported as errors.

**The unlock gate** names the state's exit in its primary button and shows a working state while the key is derived. A wrong password says the files were not opened and nothing was changed, rather than implying damage.

**The acknowledgement** states both irreversible facts, tells the user to rotate an already-exposed credential, and is gated on a typed phrase.

## The interface holds nothing

A revealed value lives in component state for the row displaying it and nowhere else. Nothing is persisted, which the memory-only webview enforces regardless of what the interface attempts.

# What exists

All of the above, with sixty-three tests.

Three guards were confirmed non-vacuous by reintroducing the exact defect each prevents:

- conveying reveal state by label and glyph instead of `aria-pressed`, the shape shipped in a real product, fails 5 tests
- making reveal write into the edit map, the bug a surveyed product shipped when it added click-to-reveal, fails 2
- preselecting every candidate on import, the select-everything default, fails 5

One defect was caught during the work by a test rather than by review: the unsaved-changes indicator and the reveal announcement both claimed the same live region, so assistive technology would have had two competing status sources on one screen.

# What is missing

Nothing on this plan. The folder picker is currently the platform prompt rather than a native dialog, which is a packaging concern rather than a screen one.

# Steps

- [x] The shared primitives, each with its rules asserted separately.
- [x] The cross-repo view with the alert derived from the per-file flag.
- [x] The import flow with grouped candidates and conservative preselection.
- [x] The environment-variables editor, with reveal and edit as separate state.
- [x] The unlock gate and the first-seal acknowledgement.
- [x] Tests, with each load-bearing guard confirmed non-vacuous.

# Open threads

- The folder picker uses the platform prompt. A native dialog is the obvious improvement and belongs with packaging, where the dialog capability is configured.
- Copy currently places a revealed value on the clipboard with no timer. The research names ninety seconds as the only concrete reference found; the duration wants observation rather than a guess.
