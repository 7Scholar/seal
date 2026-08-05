# Intent

## What & why

The interface itself: everything the user sees and does. The cross-repo view of registered repos and their managed files with sealed or unsealed state, the manage flow that scans a folder and presents candidates for confirmation, the environment-variables editor for env files, and the two flows whose behaviour the [desktop Approach](../README.md) fixes because they carry more weight than their screens suggest — the alert when a file that should be sealed is found in the clear, and the supervised master-password change. It is done when a user can do everything the root intent promises without needing to know that a command line exists.

## Approach

Built from [the UX research](_docs/ux-research.md), which surveyed the environment-variable editors, repo lists, folder-scan flows and vault-lock surfaces this interface will be judged against, and tiered every affordance against Seal's constraints. That document is the design input; this Approach states what follows from it.

### One visual language, established here

This is the first surface in the product, so there is no existing family to mirror — the family is set here. That makes internal consistency across the three surfaces the thing to hold, which is why the behavioural rules below are fixed once rather than per screen.

### The three surfaces

**The cross-repo view** is home: every managed repository as a tile in a grid, over a search field and the add action ([navigation/repositories.md](navigation/repositories.md)). With nothing added it is the same grid holding a single **add tile**, rather than a different screen that happens to appear when the list is short — the application can do nothing else until a repo exists, and the tile is that one act in the grid's own language.

**The manage flow** is a folder picker then a candidate list grouped by classification with counts — secret, ambiguous, template — with only secrets preselected, per-group select-all, and a confirmation that states plainly that confirming encrypts nothing and that files stay where they are. Preselecting conservatively is not timidity: over-inclusion encrypts a file that was meant to stay readable and breaks the user's build.

**The environment-variables editor** is a per-variable row list: name, masked value, reveal, copy once revealed, edit, delete. Duplicate keys appear as the distinct lines they are rather than being collapsed. A managed file that is not an env file opens as a plain statement of what it is, with no editing surface at all.

### The alert is resolved, never dismissed

A file recorded as sealed but found in the clear means a secret is exposed right now. It has no close control; it disappears when the file is sealed, because its exit condition is the fix. It carries that fix inline — a seal action inside the alert itself — since an insistent alert with no adjacent remedy is what users experience as obnoxious.

Two proportionality rules keep insistence from becoming wallpaper. The treatment is reserved for the genuine regression only, never for a missing file or one the user deliberately never sealed. And the chrome scales to the count including to zero: no exposed files means no banner at all.

### Friction is spent deliberately, and only twice

Confirmation dialogs fail by habituation, so this interface spends real friction exactly twice: the first-seal acknowledgement of the two irreversible facts, and the master-password change. Everywhere else a confirmation names its objects and labels its buttons with outcomes rather than Yes and No. Adding a repository gets no confirmation at all — it encrypts nothing and is fully reversible, so a dialog there would train users to click through the two that matter.

Removing a file from management never touches the disk as a side effect, and the on-disk consequence is stated in the dialog rather than defaulted.

### The session, and the operation that must not be left half-done

Unlock is the sand shield: coal-fine grains over a lit ground, parted by the pointer and closing at once, with the master password typed directly — into a real but visually hidden field, so the label, the masking, and the autocomplete opt-outs survive — and Enter as the single verb. Each keystroke answers with a brief glow somewhere in the shield, a visible working state runs while the key derivation runs, since several hundred milliseconds of nothing reads as a hang, and a failed attempt clears itself so Enter after retyping always submits a fresh attempt. The same shield carries establishing a password that does not yet exist — choosing language, unrecoverability stated, and a double entry that catches the typo — per [first-open.md](../first-open.md).

The master-password change plans before applying, keeps a **durable per-item record on disk from the moment the plan is committed**, retries transient failures automatically, and offers scoped retry of only what failed. The record is durable because a crash mid-run would otherwise leave a repo with some files on each password and no record of which are which — and that is the dangerous state the whole operation is designed to avoid. Its completion answers the user's actual question, which files are on which password and what they need now, never a bare count of failures.

### Prose is a last resort, not a layout element

Stated by the product owner and binding on every surface here: **if the interface needs a sentence to explain itself, the interface is insufficient.** Subtitles, ledes, helper text and explanatory paragraphs sitting in the layout are not allowed — their presence is evidence that the arrangement, the labels, or the affordances failed, and the fix is the surface rather than the sentence.

Full sentences are permitted in exactly two places. Inside an **info affordance the user chose to open**, where an explanation or a description belongs. And in a **confirmation for a destructive act**, where the sentence states the consequence or the constraint the user is about to accept.

This tightens the disclosure architecture by one notch rather than restating it. Disclosure says explanation always collapses; this says the collapsed thing must be genuinely explanatory rather than a paragraph that survived by being relocated, and that a surface with nothing worth collapsing should simply be quiet.

### What the interface may never do

Reveal is not an edit and must never mark a file dirty — a demonstrated failure mode in a product with this exact feature combination. The interface holds no secret beyond the row being displayed and persists nothing. Reveal controls are buttons carrying their state in `aria-pressed` with a constant accessible name that names the variable, because every row has one and an identical name on all of them leaves a screen-reader user unable to tell which field they are toggling. Secret inputs opt out of spellcheck, autocapitalisation and autocomplete.

# Supporting docs

- Before designing or changing any screen, follow [_docs/ux-research.md](_docs/ux-research.md) — it holds the tiered findings, the behavioural rules, and the out-of-scope decisions with their reasons.
- Before changing the shell, the navigation between screens, or anything about what is shown versus collapsed, follow [_docs/shell-research.md](_docs/shell-research.md) — it holds the disclosure rules and where disclosure stops.
- When placing an operation on any surface, follow [_docs/shell-operations.md](_docs/shell-operations.md) — it assigns every operation a scope, a home, and a disclosure posture.
- Before changing navigation, the themes, or the title bar, follow [navigation/_docs/navigation-research.md](navigation/_docs/navigation-research.md) — it holds the prior-art survey behind the breadcrumb model and the rules it fixes.
- **Before building any surface, enumerate the states it can occupy** — empty, one, populated, excessive, loading, error, degraded, unavailable — and design each one, per [docs/UX_RESEARCH.md](../../../../../docs/UX_RESEARCH.md) (**Step 5**). A surface built only for its populated case is unfinished however well that case works, and the empty state is both the first thing a new user sees and the one most often reduced to a heading and a button in a language the rest of the product does not use.
- **When a screenshot or a named product is supplied, it is specification** — follow **Building against a reference** in [docs/UX_RESEARCH.md](../../../../../docs/UX_RESEARCH.md). Account for every element, match the affordance rather than its position, and raise a deviation as a question instead of resolving it quietly in the build.
- **Before calling any interface change done, drive it** — [docs/RUNNING.md](../../../../../docs/RUNNING.md) has the procedure, and `bun run e2e:build && bun run e2e` is the check. This is not belt-and-braces: this plan group has now twice shipped a defect that every unit test on both sides passed and only the running application revealed, the second being a boundary casing mismatch that selected every file in a tree while the interface's fixtures and the Rust's own assertions both stayed green. A frontend change reaches a real binary only by rebuilding both, so a surface that "looks unchanged" after a rebuild is a stale `dist/`, not a working change.

# Plans

- [x] shell.md -> the frontend's own shell: the page the webview loads, the build that produces it, and the typed command module
- [x] screens.md -> the screens and the shared primitives that carry the behavioural rules
- [x] password-change.md -> the supervised master-password change, whose danger is the half-done state. Driven end to end in the real application; the interrupted run its journey requires is still to be driven.
- [x] errors.md -> how a command failure reaches the user: plain language for every kind, the problem banner, and the re-lock on an ended session
- [x] shell-layout.md -> the application shell: the repository sidebar, the detail surface, and the disclosure architecture
- [x] repo-layer/ -> making the product read as a layer over an existing repository rather than a tool that extracts files into itself
- [~] navigation/ -> the navigation model: breadcrumb routing over three full-width altitudes, the themes, and the title bar as a real window surface. **Its depth pass is complete across all three altitudes. `editing/` is freshly framed and blocked on the product owner — the file altitude can change a variable's value and nothing else, and the owner's end state is managing environment variables in Seal rather than by hand.**

# Cursor

The frontend and every screen are built: the unlock sand shield, the cross-repo view with its non-dismissible alert, the manage flow, the environment-variables editor, and the first-seal acknowledgement — all but unlock on a design taken from [the research](_docs/ux-research.md) rather than invented. Ninety-three interface tests across the screens, the failure surface, and the password change, with each load-bearing guard confirmed by reintroducing the exact defect it prevents.

`password-change.md` is complete, on a manifest that outlives the process: removing that durability fails eight of its ten Rust tests, which is the measure of how much the guarantee was carrying. It is now also **driven in the real application** as the last step of the returning scenario — the run, the old password refused afterwards, the new one opening the file — and that step is confirmed non-vacuous by dropping the sentinel from the rotation's manifest, which makes it fail. The interrupted run its journey additionally requires is still to be driven.

Every child above `shell-layout.md` is complete as code. The interface is **not** done in the sense that matters: driving the built application showed a first-time user cannot get past the opening screen, and the route into the product's core loop does nothing. See [the journeys axis](../../../../journeys/README.md), which governs whether this is finished.

`shell-layout.md` is complete. The screens had been built as full-screen replacements with no persistent frame, which does not scale past a couple of repositories and gives the user no sense of place. The shell now holds them: a two-level sidebar of repositories expanding to their files, present for the whole session including while a file is open; a detail surface that is never blank; a selection model no operation moves; and the disclosure architecture, bounded by the rule that disclosure defers explanation and secondary action but never an alert, a state, or a consequence.

Its two research documents are the design input rather than invention, and the four forks its research surfaced were settled by the product owner. The batch seal was the one part that added Rust scope: an explicitly chosen set, each member through the same guarded single-file path, reported per path.

Every child above `repo-layer/` is complete as code. What that does **not** mean is stated below.

`repo-layer/` is **complete**. It named a gap none of the finished children held: the interface did not say that Seal is a layer over a repository the user still owns. A repository now enters through a surface that draws the repository itself — every file and directory, the detected secrets checked, everything else selectable — rather than three flat lists of paths Seal chose, and the steady-state surface draws the managed set the same way. The word *import* is gone from the product.

It brought Rust scope with it, as `shell-layout.md` did: the scan returns the repository's structure with candidates as an annotation, measured one-shot at 42,123 rows in 0.09 seconds, with the rendering bounded instead by a collapsed directory costing one row.

Its defining lesson is recorded in the desktop `MEMORY.md`: a serde casing mismatch on a tagged union made every field arrive `undefined` in the webview and selected every file including the template, while both sides' unit suites passed. Only the driven application showed it.

`navigation/` replaced this group's navigation model wholesale. The product owner withdrew the sidebar shell in favour of Supabase-style routing: a breadcrumb trail in the title bar over three full-width altitudes — a grid of repository tiles, a repository's files as large rows, and the file itself — with a chevron switcher on the repository and file segments for moving sideways without navigating up. `shell-layout.md`'s frame is withdrawn; its disclosure architecture, batch seal and removal survive unchanged and are marked as such in it.

It is **in flight, and nearly complete.** The model works and is driven end to end. The depth pass [SURFACE_AUDIT.md](../../../../../docs/plans/SURFACE_AUDIT.md) exists for has now run over all three altitudes: every state each surface can occupy is designed and built, or recorded as not reachable with its reason; the breadcrumb carries a switcher on every segment including the root, closing the reference deviation; and the four collapsed controls share one disclosure contract instead of four drifted copies. Its last open item — the manage surface's relock that discards a live selection — was pursued to a reproduction and **found not to be a defect**: nothing reachable delivers a relock while a selection is live, and the one path that discards a selection is the confirm itself failing, which is correct. Its cursor holds the specifics.

Two of what that pass found were **broken** rather than unfinished, and both were invisible to every test, journey and drive that existed: a file of four hundred variables put its own save control 26,000px below the fold, so a large file could not be saved at all; and a failed open left the user inside a file with a blank window and a dismissible banner. Both were established by measuring the running application rather than by reading it.

Two further concerns taken in from the product owner have since been worked. The **palette** is done: it had never been chosen, only tokenised in place, and it now carries a role rule, a `--primary` split from `--accent` on the mechanical grounds that a fill and a foreground have opposite contrast obligations, and a fix for a `--line` that failed SC 1.4.11 at 1.34:1. The **manage surface** is built but for one item: the frame, the inert folder that fired no callback while drawing itself as clickable, the surface owning its own scan — a 42-second wait that previously happened on the previous screen with no feedback — the filter, the rescan's own statement, its two channels as real columns, and its degraded state saying where the scan deliberately did not look. `navigation/`'s cursor holds what remains.

It carried two things that were not layout. The interface gained **light, dark and system themes** with a switcher in the strip — which needed a Rust-side store, because the memory-only webview cannot persist a preference and `localStorage` does not survive a restart here. And the **title bar became a real window surface**: dragging and double-click zoom were absent, and the fix was not the one the markup implied. Its lesson is in `navigation/MEMORY.md`: dragging is decided by an injected script reading the framework's attribute, the CSS `app-region` property is inert and discarded by this webview, and a bare attribute drags only on a direct press of the element itself — so the strip needs the subtree value or every child of it is dead to the pointer.

**`navigation/editing/` is where this group's work now stands, and it is blocked.** The product owner asked for the file altitude to become a full way of working with an environment-variables file, against the end state of no longer writing those files by hand. What exists is reading a file and changing the value of a variable that already exists — there is no create, delete, rename, reorder or duplicate anywhere in the stack, and `save`'s `(key, value)` signature can express none of them. It is framed as a folder because the answer reaches the surface, the editor's rules, the command boundary and `dotenv.md`'s line model together, and its forks are unanswered in that node's `QUESTIONS.md`.

# Open threads

- Whether a bulk paste of variables is offered at all. Settled in the research as out of the first build: the shapes the hosted platforms use all force every value across the boundary at once. If it returns, the only acceptable form is parse-and-preview applied in Rust, never round-tripping existing values through the interface.
- The clipboard timer's duration. Ninety seconds is the only concrete reference found; whether it suits a desktop editing session wants observation.
- Whether the exposed-file count belongs in the window frame from the first build, or only once several repos are common. The row-level alert carries the weight regardless.
- **Surfaces still carrying prose the rule above disallows.** The rule was stated after most screens were built, so it has only been applied to the surfaces `repo-layer/` and `navigation/` touched. The repositories grid's two-sentence paragraph is gone — the product owner settled it, and the empty state is now an add tile inside the grid with no explanatory copy at all. Known remaining: the acknowledgement's explanatory copy, which may well be legitimate, since it is a destructive-act confirmation stating a consequence, which the rule permits. This wants a deliberate sweep judging each surface against the two allowed cases, not a blanket deletion.
