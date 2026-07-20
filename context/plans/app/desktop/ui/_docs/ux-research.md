# UX research: Seal's interface

Produced by following [the research procedure](../../../../../../docs/UX_RESEARCH.md). This document is the design input for `ui/`: the Approach is built from it rather than re-derived.

# Concern

Seal's entire interface, in a Tauri 2 desktop window with a React + TypeScript frontend. It is a **single-user, local-only** application: no accounts, no teams, no roles, no server, no audit log, and no network at all. Everything it shows lives on this machine.

Three surfaces make up the whole product, and each has strong prior art:

- **The cross-repo view** — registered repos and their managed files, each tagged sealed, plaintext or missing. One state is an alert rather than a tag: a file Seal recorded as sealed but found in the clear means a secret is exposed right now.
- **The import flow** — point at a folder, scan it, present candidates classified secret / ambiguous / template with only secrets preselected, toggle and confirm. Import never encrypts anything.
- **The environment-variables editor** — per-variable rows for env files, modelled on Vercel's, which the product intent names explicitly.

Plus two session-shaped flows: unlock/lock, and the supervised master-password change.

## Constraints the interface cannot design around

These are fixed by the layers beneath and are the yardstick for every finding below.

- **The frontend never holds a file's plaintext.** It receives variable names with values masked. One value crosses only when the user reveals that single row, and it arrives as raw bytes. Anything sent to the webview has left Seal's control permanently, so the design minimises what crosses rather than cleaning up after.
- **Reveal-per-row is required, not optional.** Hosted platforms make sensitive values permanently unreadable once written. That is right for a service holding a secret for you and wrong here: Seal edits a file the user owns, and an unreadable value can only be overwritten blind.
- **Only env files are editable.** Every other managed file opens opaque — name and size, no content, no editing.
- **Saving preserves the file byte-for-byte except where a value changed**, including comments, ordering, quoting and newline style.
- **Two irreversible facts must be acknowledged before anything is sealed**, and the acknowledgement is enforced in Rust: a forgotten password loses the data permanently, and sealing cannot reach backwards over a secret already exposed on disk.
- **The window persists nothing.** The webview's store is memory-only and a strict content-security policy applies, so no interface state survives a restart and nothing may be fetched from a network.
- **There is no existing visual family to mirror.** This is the first surface in the product, so the family is being established here rather than matched. That makes internal consistency across the three surfaces the thing to hold, and it is why the synthesis fixes shared behaviour once rather than per screen.

# Sources surveyed

**Environment-variable editors.** Vercel (the model named in the product intent) contributes the write-only tier and the immutable-key-on-sensitive rule. Netlify contributes the only explicit **merge-strategy step on bulk import** — paste a `.env`, choose skip-conflicts or update-conflicts — and treats export as first-class. Railway contributes two co-equal modes, a per-row form and a whole-file RAW editor, with all mutations staged as reviewable changes rather than autosaved, and a deliberate keystroke for multi-line values. Doppler contributes a **three-state visibility model** — unmasked, masked, restricted — where masked means "not displayed until there is an intent performed by the user to reveal, typically a mouse click", and states the only key-name validation rules found anywhere.

**Secret fields.** 1Password and Bitwarden contribute clipboard behaviour: 1Password clears the clipboard after 90 seconds by default; Bitwarden ships "Never" and has taken sustained criticism for it. Bitwarden also contributes a cautionary defect — it shipped the eye/eye-slash glyph **inverted** between two field types, and separate accessibility defects where toggle state was conveyed by icon alone.

**Repo lists and folder-scan flows.** VS Code Workspace Trust contributes modelling a security decision about a folder as first-class persistent state, with a status-bar badge alongside a banner — and a cautionary tale, having been compared to a cookie banner for prompting on folders where the decision is meaningless. 1Password Watchtower is the closest analogue to our exposed-file alert: items with issues show a banner **throughout the app**, alerts are **resolved by action rather than dismissed**, each carries a remediation verb, and categories appear **only if they contain items**. GitHub Desktop contributes the best degraded-state handling — a missing repo stays in the list offering Locate / Clone / Remove — and separates "remove from app" from "delete from disk" as a checkbox opt-in, with the safety property that a failed disk operation leaves the item in the list. Tower and Sourcetree confirm the check-to-add scan model. Arq and Backblaze contribute two opposed selection philosophies, opt-in versus select-everything, and Arq contributes a regression worth avoiding: it replaced a checkbox list with a text box of paths and globs and was criticised for it.

**Vault lock and irreversible operations.** Cryptomator is the closest analogue to our session: it gates the password-change button on a checkbox acknowledgement, communicates locked-versus-unlocked through **the primary button naming the exit**, and **rejects a valid-but-incorrect recovery key** rather than accepting it and stranding the user. 1Password contributes auto-lock bound to *system* events — idle, sleep, screensaver, user switch — rather than an arbitrary app timer. Bitwarden contributes the only explicit naming of the half-done state as the hazard: making changes with a stale encryption key "will cause data corruption that will make your data unrecoverable". FileVault contributes presenting an irreversible consequence as a **fork in the road** with mutually exclusive options rather than a buried setting. Atlas contributes plan-then-apply as separate verbs and durable per-item records that make a partially applied run resumable. GitHub Actions contributes **scoped retry** — "Re-run failed jobs" as a first-class action distinct from re-running everything. Cyberduck contributes a transfer queue that **survives application restart**.

**Standards and guidance.** PatternFly states the rule our alert needs: error and critical alerts "should disappear only when the underlying issue that caused the alert is resolved". USWDS reserves `role="alert"` for messages demanding immediate attention and warns against too many notifications. Nielsen Norman Group supplies the confirmation-dialog findings: vague confirmations fail outright, buttons must be labelled with outcomes rather than Yes/No, type-to-confirm works because it "prevents automated behavior" but must stay "reserved for the most serious cases", and undo beats confirmation wherever undo exists. Accessibility guidance for reveal controls converges on a `<button>` with `aria-pressed`, a **constant accessible name**, and a name that disambiguates which field it belongs to.

# Findings

## Tier 1 — table stakes

- **Per-row masking with an explicit reveal.** Universal across secret managers, and required here: values arrive masked and one crosses only on request.
- **Reveal as a `<button aria-pressed>` with a constant, disambiguated accessible name.** Every row has a reveal control, so an identical "Show value" name on all of them leaves a screen-reader user unable to tell which field they are toggling. The name must carry the variable, and the state must live in `aria-pressed` rather than in a changing label or a glyph. Bitwarden shipped this wrong twice.
- **Add, edit and delete a variable, with delete confirmed by naming the variable.** Universal.
- **Empty state that is the primary action.** With no repos imported the application can do nothing else, so the empty state is the import call to action rather than an illustration beside one.
- **A scan-and-confirm import presenting real discovered paths as a checkbox list.** Tower and Sourcetree both do exactly this, and Arq's move away from it was a regression.
- **Per-item status badges with counts on the container.** Watchtower's model.
- **Unlock screen whose primary button names the state's exit**, and a visible working state while the key derivation runs — several hundred milliseconds of nothing otherwise reads as a hang.
- **Outcome-labelled buttons on every confirmation**, never Yes/No.

## Tier 2 — strong, high-value for our surface

- **Reveal that stays revealed per row**, so a user editing several rows is not fighting the control. This is the honest alternative to a global unmask, which would force a bulk plaintext crossing.
- **Copy per row, gated on the value being revealed, with a clipboard timer.** 1Password's 90-second default is the reference; Bitwarden's "Never" is the anti-pattern.
- **The exposed-file alert carrying its own remediation.** Watchtower's alerts are verbs. Ours is a **Seal now** button inside the alert, because an insistent alert with no adjacent fix is what users experience as obnoxious.
- **The alert visible from wherever the user is**, as a count in the frame that scrolls to the offending item, mirroring VS Code's badge-plus-banner pairing.
- **Grouping scan results by classification with counts**, secret expanded and preselected, ambiguous expanded and unchecked, template collapsed. Preselecting only secrets is the conservative default, which is correct here because over-inclusion encrypts a file that must stay readable and breaks a build.
- **Per-group select-all rather than a global one**, since a global control silently promotes templates into managed state.
- **Separating "stop managing this file" from "what happens on disk"**, following GitHub Desktop, with the disk consequence stated explicitly rather than defaulted.
- **Key-name validation on add** — uppercase, digits and underscore, not starting with a digit — the only such rule stated in any surveyed product.
- **Surfacing duplicate keys.** Only Netlify handles them at all, via a merge strategy; the parser already reports them and the file legitimately contains both.
- **Plan-then-apply with a durable per-item record for the password change**, and scoped retry of only what failed.
- **Type-to-confirm, used exactly twice**: the first-seal irreversibility acknowledgement and the master-password change.

## Tier 3 — out of scope, with reasons

- **Write-only values (Vercel, Railway sealed).** Correct for a service holding a secret on your behalf, where the authoritative copy is server-side and a credential can be re-minted. Seal edits a file the user owns and holds the only copy, so unreadable-after-write turns every edit into a blind overwrite. This is the intent's stated divergence and the survey confirms the reasoning.
- **Immutable keys on sensitive variables (Vercel).** A server-side constraint from re-encrypting under a new key. In a text file a rename is a byte-range edit; forbidding it would be cargo-culted friction.
- **A whole-file RAW editor (Railway) and paste-a-whole-`.env` (Netlify).** Both require every value to cross into the frontend at once, collapsing the one-row-at-a-time guarantee that is the point of the architecture, and neither can preserve comments and formatting byte-for-byte through a textarea round trip. Railway's own carve-out is instructive: sealed variables are excluded from their RAW editor. In Seal everything is sealed.
- **Copy-all-as-`.env` to the clipboard (Netlify).** One click placing every plaintext secret on the system clipboard is the inverse of the threat model.
- **A global reveal-all toggle (Infisical).** Reasonable when the frontend already holds the values; here it forces a bulk crossing and defeats masking.
- **Search by value (Doppler).** Requires the searcher to hold plaintext. Possible only as a Rust-side match returning row indices, which is not worth building now.
- **Reveal-as-audit-event (Doppler).** Their click-to-reveal exists to log who saw what. Single user, no server, no audit log — the interaction transfers, the justification does not.
- **Recovery keys and escrow (Cryptomator, FileVault, 1Password).** Every surveyed vault offers an escape hatch. Adopting one contradicts the threat model, and the age format forecloses it anyway. The wording must also be **colder** than theirs: 1Password can frame unrecoverability warmly because a family organiser can still recover you, and we have no such backstop.
- **Remembering the password in the OS keychain, and biometric unlock.** Both work by holding key material in an OS-protected store, which is exactly what the design refuses. Biometrics is therefore not a lighter unlock to add later — it is a different threat model.
- **A "never" session timeout.** Bitwarden ships one with a warning attached; a warning is an admission the option should not exist.
- **Blocking modal folder-trust gate (VS Code).** Justified there because trust gates code execution. Import encrypts nothing, so a modal security gate would be unearned interruption that trains users to click through the dialogs that do matter.
- **Unscoped bulk rescan (Fork).** Reclassifying every file at once is dangerous and was a complaint against Fork. Rescan is per-repo and reviewable.
- **Toasts for the exposed-secret state.** PatternFly is explicit that a toast must never be the only means of acting on an alert; a self-dismissing toast for an exposed secret is the wrong container outright.
- **Confirmation on import.** It encrypts nothing and is fully reversible, so a dialog there is precisely the routine-action habituation that makes the important dialogs ignorable.

# Best-practice rules

Cross-cutting invariants the build must honour:

1. **Reveal is not an edit.** Revealing a row must never mark the file dirty. Doppler shipped a bug where adding click-to-reveal corrupted their unsaved-changes counter — our exact feature combination, already demonstrated as a failure mode.
2. **An alert is resolved, never dismissed.** The exposed-secret alert has no close control; it disappears when the file is sealed. Its exit condition is the fix.
3. **Scale alert chrome to the count, including to zero.** No exposed files means no banner at all. Persistence without proportionality becomes wallpaper, and then the alert has failed.
4. **Reserve the exposed-file treatment for the genuine regression only** — recorded sealed, found plaintext. Never for `missing`, never for a file the user deliberately never sealed.
5. **Every confirmation names its objects and labels its buttons with outcomes.** "Delete `API_KEY`" and "Keep it", never "Are you sure?" with Yes/No.
6. **Type-to-confirm is a scarce resource, spent twice.** Any wider use degrades it into the automated behaviour it exists to interrupt.
7. **Never offer an option that manufactures the half-done state.** Failures during a password change arrive from the system; the user is never given a per-file skip control.
8. **A partially finished password change is remembered on disk and resumable from the main surface**, not only from a dialog that can be dismissed into oblivion. If progress lives only in interface state, a crash mid-run leaves a mixed-password repo with no record of which files are which.
9. **After a partial run, answer the user's real question** — which files are on which password and what they need now — never a bare "N of M failed".
10. **Removing a file from management never touches the disk as a side effect**, and the on-disk consequence is stated in the dialog rather than defaulted.
11. **Secret inputs opt out of spellcheck, autocapitalise and autocomplete**, and a revealed field returns to masked before any form submission.
12. **Every control is keyboard reachable with a visible focus ring**, and controls meet 3:1 contrast.
13. **A revealed value is disclosed to a screen reader as well as to the eye.** Reveal state changes are announced; the disclosure is not only visual.
14. **The interface stores nothing.** No secret in component state beyond the row being displayed, and nothing persisted anywhere, which the memory-only webview enforces regardless.

# Synthesis / proposal

## What to build

Three surfaces plus two session flows, in one visual language established here.

**The cross-repo view** is the home surface: repos as sections, each listing its managed files with a state tag. It carries the alert as a count in the application frame that resolves to the offending row, and each alerting row carries its own **Seal now** action. With no repos it is the import call to action and nothing else.

**The import flow** is a folder picker followed by a grouped candidate list — secret, ambiguous, template — with counts per group, only secrets preselected, per-group select-all, and a confirm that states plainly it encrypts nothing.

**The environment-variables editor** is a per-variable row list modelled on Vercel: name, masked value, reveal, copy-when-revealed, edit, delete. Duplicate keys are shown as the distinct lines they are. Unparseable lines are reported as a count that is preserved rather than an error. A non-env file opens as a plain statement of what it is, with no editing surface at all.

**Unlock** is a single field whose button names the exit, with a working state during derivation. **Lock** is always reachable.

**The password change** is plan-then-apply with a durable manifest, automatic retry, scoped retry of failures, and a completion state that says which files sit on which password.

## Load-bearing versus rounding out

Load-bearing — the feature is not itself without these: masked rows with per-row reveal and its accessibility contract; the non-dismissible exposed-file alert with inline remediation; the grouped import with conservative preselection; the first-seal type-to-confirm; unlock and lock; save preserving the file.

Rounding out — cut first under pressure without losing the essence: copy-with-timer, per-group select-all, key-name validation on add, search and filter within a file, the duplicate-key explainer, the ambient badge in the frame (the row-level alert carries the weight alone).

## Out of scope, carried forward

Everything in Tier 3, with the reasons recorded there. The two most likely to be re-proposed are a bulk `.env` paste and a global reveal-all; both are refused for the same reason, that they force every value across the boundary at once, and both are already settled here rather than open.

# Open threads

- Whether a bulk import of variables is offered at all. If it is, the only acceptable shape is the one Infisical's own users asked for: parse the incoming pairs, **preview** them, and apply in Rust — never round-tripping existing values through the interface. It is deliberately not in the first build.
- The clipboard timer's duration. 1Password's 90 seconds is the only concrete reference found; whether it fits a desktop editing session wants observation rather than a guess.
- Whether the exposed-file count belongs in the window frame from the first build or only once more than one repo is common. The row-level alert is load-bearing; the ambient badge is not.
