# Intent

## What & why

The interface itself: everything the user sees and does. The cross-repo view of registered repos and their managed files with sealed or unsealed state, the import flow that scans a folder and presents candidates for confirmation, the environment-variables editor for env files, and the two flows whose behaviour the [desktop Approach](../README.md) fixes because they carry more weight than their screens suggest — the alert when a file that should be sealed is found in the clear, and the supervised master-password change. It is done when a user can do everything the root intent promises without needing to know that a command line exists.

## Approach

Built from [the UX research](_docs/ux-research.md), which surveyed the environment-variable editors, repo lists, folder-scan flows and vault-lock surfaces this interface will be judged against, and tiered every affordance against Seal's constraints. That document is the design input; this Approach states what follows from it.

### One visual language, established here

This is the first surface in the product, so there is no existing family to mirror — the family is set here. That makes internal consistency across the three surfaces the thing to hold, which is why the behavioural rules below are fixed once rather than per screen.

### The three surfaces

**The cross-repo view** is home: repos as sections, each listing its managed files with a state tag. With nothing imported it *is* the import call to action rather than an illustration beside one, since the application can do nothing else until a repo exists.

**The import flow** is a folder picker then a candidate list grouped by classification with counts — secret, ambiguous, template — with only secrets preselected, per-group select-all, and a confirmation that states plainly that importing encrypts nothing. Preselecting conservatively is not timidity: over-inclusion encrypts a file that was meant to stay readable and breaks the user's build.

**The environment-variables editor** is a per-variable row list: name, masked value, reveal, copy once revealed, edit, delete. Duplicate keys appear as the distinct lines they are rather than being collapsed. A managed file that is not an env file opens as a plain statement of what it is, with no editing surface at all.

### The alert is resolved, never dismissed

A file recorded as sealed but found in the clear means a secret is exposed right now. It has no close control; it disappears when the file is sealed, because its exit condition is the fix. It carries that fix inline — a seal action inside the alert itself — since an insistent alert with no adjacent remedy is what users experience as obnoxious.

Two proportionality rules keep insistence from becoming wallpaper. The treatment is reserved for the genuine regression only, never for a missing file or one the user deliberately never sealed. And the chrome scales to the count including to zero: no exposed files means no banner at all.

### Friction is spent deliberately, and only twice

Confirmation dialogs fail by habituation, so this interface spends real friction exactly twice: the first-seal acknowledgement of the two irreversible facts, and the master-password change. Everywhere else a confirmation names its objects and labels its buttons with outcomes rather than Yes and No. Import gets no confirmation at all — it encrypts nothing and is fully reversible, so a dialog there would train users to click through the two that matter.

Removing a file from management never touches the disk as a side effect, and the on-disk consequence is stated in the dialog rather than defaulted.

### The session, and the operation that must not be left half-done

Unlock is a single field whose primary button names the state's exit, with a visible working state while the key derivation runs, since several hundred milliseconds of nothing reads as a hang.

The master-password change plans before applying, keeps a **durable per-item record on disk from the moment the plan is committed**, retries transient failures automatically, and offers scoped retry of only what failed. The record is durable because a crash mid-run would otherwise leave a repo with some files on each password and no record of which are which — and that is the dangerous state the whole operation is designed to avoid. Its completion answers the user's actual question, which files are on which password and what they need now, never a bare count of failures.

### What the interface may never do

Reveal is not an edit and must never mark a file dirty — a demonstrated failure mode in a product with this exact feature combination. The interface holds no secret beyond the row being displayed and persists nothing. Reveal controls are buttons carrying their state in `aria-pressed` with a constant accessible name that names the variable, because every row has one and an identical name on all of them leaves a screen-reader user unable to tell which field they are toggling. Secret inputs opt out of spellcheck, autocapitalisation and autocomplete.

# Supporting docs

- Before designing or changing any screen, follow [_docs/ux-research.md](_docs/ux-research.md) — it holds the tiered findings, the behavioural rules, and the out-of-scope decisions with their reasons.

# Plans

- [~] shell.md -> the frontend's own shell: the page the webview loads, the build that produces it, and the typed command module

# Cursor

Framed, and now unblocked: the shell, the command surface and the env parser are all complete, so there is a running application and a typed boundary to build against.

A placeholder page currently stands in for the frontend, purely so a fresh clone compiles — `generate_context!` fails at build time when the configured frontend directory is missing. Replacing it with the real build output, and repointing the configuration at it, is the first step here.

Next: sketch the cross-repo view and the import flow, then the editor. Two commands are deliberately deferred into this plan — importing a repo and the supervised password change — because both are shaped by the flow around them rather than by the boundary.

# Open threads

- Whether a bulk import of variables is offered at all. Settled in the research as out of the first build: the shapes the hosted platforms use all force every value across the boundary at once. If it returns, the only acceptable form is parse-and-preview applied in Rust, never round-tripping existing values through the interface.
- The clipboard timer's duration. Ninety seconds is the only concrete reference found; whether it suits a desktop editing session wants observation.
- Whether the exposed-file count belongs in the window frame from the first build, or only once several repos are common. The row-level alert carries the weight regardless.
