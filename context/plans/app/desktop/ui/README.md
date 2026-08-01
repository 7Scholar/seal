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

Unlock is the sand shield: coal-fine grains over a lit ground, parted by the pointer and closing at once, with the master password typed directly — into a real but visually hidden field, so the label, the masking, and the autocomplete opt-outs survive — and Enter as the single verb. Each keystroke answers with a brief glow somewhere in the shield, a visible working state runs while the key derivation runs, since several hundred milliseconds of nothing reads as a hang, and a failed attempt clears itself so Enter after retyping always submits a fresh attempt. The same shield carries establishing a password that does not yet exist — choosing language, unrecoverability stated, and a double entry that catches the typo — per [first-open.md](../first-open.md).

The master-password change plans before applying, keeps a **durable per-item record on disk from the moment the plan is committed**, retries transient failures automatically, and offers scoped retry of only what failed. The record is durable because a crash mid-run would otherwise leave a repo with some files on each password and no record of which are which — and that is the dangerous state the whole operation is designed to avoid. Its completion answers the user's actual question, which files are on which password and what they need now, never a bare count of failures.

### What the interface may never do

Reveal is not an edit and must never mark a file dirty — a demonstrated failure mode in a product with this exact feature combination. The interface holds no secret beyond the row being displayed and persists nothing. Reveal controls are buttons carrying their state in `aria-pressed` with a constant accessible name that names the variable, because every row has one and an identical name on all of them leaves a screen-reader user unable to tell which field they are toggling. Secret inputs opt out of spellcheck, autocapitalisation and autocomplete.

# Supporting docs

- Before designing or changing any screen, follow [_docs/ux-research.md](_docs/ux-research.md) — it holds the tiered findings, the behavioural rules, and the out-of-scope decisions with their reasons.
- Before changing the shell, the navigation between screens, or anything about what is shown versus collapsed, follow [_docs/shell-research.md](_docs/shell-research.md) — it holds the disclosure rules and where disclosure stops.
- When placing an operation on any surface, follow [_docs/shell-operations.md](_docs/shell-operations.md) — it assigns every operation a scope, a home, and a disclosure posture.

# Plans

- [x] shell.md -> the frontend's own shell: the page the webview loads, the build that produces it, and the typed command module
- [x] screens.md -> the screens and the shared primitives that carry the behavioural rules
- [x] password-change.md -> the supervised master-password change, whose danger is the half-done state
- [x] errors.md -> how a command failure reaches the user: plain language for every kind, the problem banner, and the re-lock on an ended session
- [x] shell-layout.md -> the application shell: the repository sidebar, the detail surface, and the disclosure architecture
- [~] repo-layer/ -> making the product read as a layer over an existing repository rather than a tool that extracts files into itself

# Cursor

The frontend and every screen are built: the unlock sand shield, the cross-repo view with its non-dismissible alert, the import flow, the environment-variables editor, and the first-seal acknowledgement — all but unlock on a design taken from [the research](_docs/ux-research.md) rather than invented. Ninety-three interface tests across the screens, the failure surface, and the password change, with each load-bearing guard confirmed by reintroducing the exact defect it prevents.

`password-change.md` is complete too, on a manifest that outlives the process: removing that durability fails eight of its ten Rust tests, which is the measure of how much the guarantee was carrying.

Every child above `shell-layout.md` is complete as code. The interface is **not** done in the sense that matters: driving the built application showed a first-time user cannot get past the opening screen, and the route into the product's core loop does nothing. See [the journeys axis](../../../../journeys/README.md), which governs whether this is finished.

`shell-layout.md` is complete. The screens had been built as full-screen replacements with no persistent frame, which does not scale past a couple of repositories and gives the user no sense of place. The shell now holds them: a two-level sidebar of repositories expanding to their files, present for the whole session including while a file is open; a detail surface that is never blank; a selection model no operation moves; and the disclosure architecture, bounded by the rule that disclosure defers explanation and secondary action but never an alert, a state, or a consequence.

Its two research documents are the design input rather than invention, and the four forks its research surfaced were settled by the product owner. The batch seal was the one part that added Rust scope: an explicitly chosen set, each member through the same guarded single-file path, reported per path.

Every child above `repo-layer/` is complete as code. What that does **not** mean is stated below.

`repo-layer/` is **solutioned and carved into four children, none started**. It names a gap none of the finished children hold: the interface does not yet say that Seal is a layer over a repository the user still owns. A repository enters through a screen headed *Import* that shows three flat lists of paths Seal chose, so the act reads as extraction — and nothing else about the repository is ever shown. Satisfying it changes what the scan returns, so it carries Rust scope the way `shell-layout.md` carried the batch seal.

Its four design forks were settled by the product owner and its Approach is written: one tree seen at two fidelities — the whole repository while adopting, the managed set alone while living with it — with every file individually selectable, a folder's checkbox scoped to the detected files beneath it rather than all of them, the skipped build directories shown inert and unexpandable, and *import* retired from the vocabulary everywhere. The sidebar's *two levels, never a third* rule is scoped to the sidebar rather than overturned: it was written about navigation and keeps holding there.

Its children split on the seam the Approach names: `vocabulary.md` (the rename, which depends on nothing and lands first), `scan-shape.md` (the scan returning structure rather than candidates), `adopting.md` (the whole-repository surface, owning the tree primitive), and `managed-view.md` (the steady state reusing it). Two of this group's finalized plans will need their Approach updated as those land — `screens.md`, whose import flow is grouped candidate lists, and `shell-layout.md`, whose detail surface is a file list.

# Open threads

- Whether a bulk import of variables is offered at all. Settled in the research as out of the first build: the shapes the hosted platforms use all force every value across the boundary at once. If it returns, the only acceptable form is parse-and-preview applied in Rust, never round-tripping existing values through the interface.
- The clipboard timer's duration. Ninety seconds is the only concrete reference found; whether it suits a desktop editing session wants observation.
- Whether the exposed-file count belongs in the window frame from the first build, or only once several repos are common. The row-level alert carries the weight regardless.
