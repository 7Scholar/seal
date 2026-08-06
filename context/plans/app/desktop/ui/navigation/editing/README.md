Part of [the navigation plan](../README.md).

# Intent

## What & why

The file altitude can **read** an env file and **change the value of a variable that already exists**. That is the whole of its editing vocabulary, and it is not enough for the product to be the place environment variables live.

The gap is stated most sharply by what a user cannot do without leaving Seal and opening the file in an editor — which, for a sealed file, means unsealing it first and so undoing the protection the product exists to provide:

- **Create** a variable. There is no add control anywhere, and no command that carries a new key across the boundary.
- **Delete** a variable. Nothing removes a line.
- **Rename** a key. The edit path is keyed *by* the key, so a rename is expressible only as a delete plus a create, neither of which exists.
- **Reorder** variables, or move one between the groupings a real env file expresses with blank lines and comment headings.
- **Duplicate** a variable, the ordinary way a user creates a near-identical entry.

The product owner's stated end state is that they **stop writing environment variables by hand and manage them entirely in Seal**. That is the bar this concern is measured against, and it is a higher bar than "add the missing CRUD verbs": a user only stops reaching for their editor when the interface can express everything the file can express. So the concern includes asking what *else* that end state requires beyond the five verbs above — bulk entry by pasting a block of `KEY=value` lines, comments as editable things rather than preserved opaque ones, search within a large file, and the safety affordances an editing surface needs once it can destroy data (undo, and what a mistake costs when the file is sealed).

Two existing guarantees make this harder than it looks, and neither may be weakened to make room for it:

- [dotenv.md](../../../dotenv.md) holds **byte-exactness**: an untouched file round-trips byte-identical, and an edited one differs only where the user changed something. Comments, blank lines, quoting style, unparseable lines and the file's newline style all survive. Its line model is built for *changing a value in place* — every new verb here is a structural mutation of the line sequence, which is the operation that model does not yet have.
- [screens.md](../../screens.md) holds that **revealing a value is never an edit**, and that **a save preserves the file's on-disk state** rather than sealing or unsealing as a side effect. A larger editing vocabulary multiplies the ways both rules can be broken, and the second one acquires a new case the current design never faced: what a *structural* change means for a file whose contents the session is holding.

The concern spans four layers, which is why it is framed as a folder rather than a plan `.md`: the surface at the file altitude ([file.md](../file.md)), the editor's own rules ([screens.md](../../screens.md)), the IPC boundary whose `save` command currently carries `(key, value)` pairs and can express nothing else ([commands.md](../../../commands.md)), and the line model beneath it ([dotenv.md](../../../dotenv.md)). A vocabulary designed at only one of those layers cannot be honoured by the others.

**Done** means a user managing environment variables in Seal never needs to open the file in an editor — and that every state the enlarged surface can occupy is designed, not only the one where the edit succeeds.

## Approach

The vocabulary is **create, read, edit, rename, delete, reorder, duplicate, and enable/disable**, expressed as a structural edit list against stable row identity, applied to the line model, and committed by one deliberate save.

### What the file is, once it can be edited structurally

The parser draws a line between what the interface *manages* and what it merely *carries*. Three kinds of line become rows; everything else is invisible and untouched.

**An assignment** is a row, as today.

**A commented-out assignment is a disabled variable**, not a comment. A line whose leading run of `#` and following whitespace strip away to something that parses as a valid assignment on its own is that assignment, disabled. The leading run is stripped without regard to how many `#` characters it holds or how much whitespace follows, so `# FOO=bar`, `#FOO=bar` and `## FOO=bar` are all the variable `FOO`, disabled. This is what a user means when they comment out an env line, and the interface says so: the row carries a plain enabled/disabled control, and toggling it is an ordinary edit like any other.

The rule is deliberately **strict, and fails towards treating a line as prose.** A comment that merely contains an equals sign — `# Set DEBUG=true to enable verbose logging`, `# TODO: rename API_KEY=... before launch` — is not a disabled variable, and falls out correctly without a special case because `Set DEBUG` and `TODO: rename API_KEY` are not valid keys. The asymmetry is the point and is load-bearing: wrongly reading prose as a disabled variable puts a row on screen that the user can *enable*, which writes a live variable into their file that was never meant to exist, whereas wrongly leaving a genuinely-disabled variable as prose only fails to show it, and the line survives untouched. One direction changes what the file does; the other does not.

Enabling a disabled variable emits it as an ordinary assignment, so a doubled or padded prefix is not restored if it is disabled again — `## FOO=bar` enabled and re-disabled settles at `# FOO=bar`. This is the one place a round trip does not reproduce the original bytes, and it is accepted: once the line is live there is nowhere to keep the prefix, and normalising it is more honest than remembering a decoration the user cannot see.

**A malformed line is a row too**, rather than a count in a notice. It shows its raw text, is directly editable as free text, and carries a **Correct** action that attempts to parse the edited text into an assignment. Correct **refuses** when the text does not parse, saying so and leaving the row exactly as it was; it never guesses. A best guess at a malformed secret is how a silently wrong value reaches a sealed file, which is the one outcome this surface may not produce.

**Ordinary comments and blank lines are ignored entirely.** They are not drawn, not selectable, not reorderable, and not editable. They keep their positions in the file and are emitted verbatim.

### Position, identity, and what reordering means

Every row the parser produces is assigned a **stable id** at open time — a sequence number the model allocates and never reuses within an open. All edits reference rows by id. Identity is *not* the key, so a rename is an ordinary operation that preserves the row's value, position and enabled state rather than routing through delete-and-create; and identity is not the line number, because a line number is not stable across the operations this concern adds — deleting a row shifts every line beneath it, so a number identifying one row changes as a side effect of editing a different one. The failure that prevents is specific and unrecoverable: an interface holding line numbers from the last open, applying an edit to the row that number now names rather than the row the user chose, against a sealed file.

A line number remains what it truthfully is — where a line currently sits — and is used for display and for anchoring the malformed-row flow, never as identity.

**Order is expressed as the sequence of ids the interface sends back**, and reordering permutes managed rows only. Ignored comments and blank lines hold their line positions and do not move with the variables around them. This is a deliberate trade of fidelity for determinism, taken knowingly: a comment heading that labels a group of variables does not follow those variables when they move, so a reorder can leave a heading labelling something other than what it did before. The interface does not draw those comments and therefore cannot warn about them. Determinism is preferred because the alternative — inferring which comments belong to which variable and moving them along — is a heuristic that fails silently inside a file the user cannot easily inspect, since it is sealed.

### How an edit crosses the boundary

As a **structural edit list**: an ordered sequence of operations — set a value, rename a key, set enabled or disabled, insert a new variable at a position, delete a row, replace a malformed row's text, and the final ordering — applied by the line model to the sequence it parsed.

This is chosen over sending the whole document back for the model to reconcile, because it is what keeps [dotenv.md](../../../dotenv.md)'s byte-exactness a guarantee that holds **by construction**: a line no operation names is never re-rendered, so it is emitted verbatim because nothing could have changed it. Under whole-document replacement the same guarantee becomes reconciliation logic that must be *kept* right on every edit forever — including which comment stayed attached to which variable — and its failures are quiet ones inside a sealed file.

`save`'s current `Vec<(String, String)>` signature can express none of this and is replaced by the edit list. [commands.md](../../../commands.md) owns the boundary; the operations above are its vocabulary.

### Committing: one deliberate save

Every operation — including delete, reorder and the enabled toggle — changes **local state only**. Nothing reaches disk until the user saves, which preserves the existing footer model rather than adding a second one beside it, and keeps the existing rules intact: revealing a value is never an edit, Cancel is always enabled, Save is enabled only when something is pending, and a save preserves the file's on-disk state rather than sealing or unsealing as a side effect.

It is also the cheaper model on a sealed file, where every commit is a full unseal-modify-reseal cycle: a batch of changes is one cycle rather than one per gesture.

The cost this accepts is that the surface must **draw pending structural change honestly** — a row marked for deletion stays visible as marked, and a pending order is the order shown. A surface that hid pending deletions would be showing a list that matches neither disk nor intent.

### What a destructive save costs

**Deleting a row raises no dialog.** It marks the row locally, and is undone by Cancel like any other pending change.

**The save inspects the pending batch.** If it contains any deletions, one confirmation appears before the write, stating that the change is destructive and naming what will be removed. With no deletions pending, saving proceeds directly.

The confirmation is a plain confirm-and-cancel, with **no typed phrase**. That is a deliberate departure from the acknowledgement gate's shape ([screens.md](../../screens.md)): the typed phrase is reserved for the irreversible acts a user meets once, and a delete is a routine part of managing variables. Responsibility rests with the user, stated once, at the only moment anything irreversible happens.

The placement is the whole of the argument. Ceremony sits exactly where the destructive act is — at the write — rather than in front of each click on the way there, which is what the root intent's rule asks for: consequences carry ceremony, routine reversible acts do not. A per-delete dialog would tax the cleanup pass this feature invites while guarding an act that, until save, has not happened.

# Plans

- [x] model.md -> the line model grown from value-in-place to structural mutation: stable row identity, the disabled-variable rule, malformed rows, and the edit list applied with byte-exactness intact
- [x] boundary.md -> `save` replaced by the edit-list vocabulary, and what the open returns once a row is more than a key and a mask
- [x] surface.md -> the row and its verbs: create, rename, delete, duplicate, the enabled toggle, the malformed row's free-text field and Correct, and pending structural change drawn honestly
- [x] reordering.md -> moving a row, the interaction that does it, and the keyboard-reachable equivalent
- [x] destructive-save.md -> the batch inspection and the one confirmation standing in front of a save that removes variables
- [x] row-density.md -> how the row presents its vocabulary: three controls and one overflow menu, one tab stop per row, and the geometry that keeps it to a single line
- [ ] bulk-entry.md -> pasting a block of `KEY=value` lines, the path by which a user actually stops hand-writing these files

# Cursor

**Six of seven children are complete, and the vocabulary is both driven end to end and designed rather than merely present.** What remains is `bulk-entry.md`, framed and unstarted.

A user can now create, read, edit, rename, delete, duplicate, reorder and enable-or-disable a variable, correct a malformed line, and carry all of it through one save. Nine driven checks in the real webview (`bun run e2e:editing`) confirm it where unit tests cannot see: a commented-out assignment appears as a disabled variable with its value still masked, prose containing an equals sign stays a comment, `Correct` refuses text that is still not a variable, and a session of five changes lands on disk with the file's comment heading and blank line exactly where they were.

**Three findings from the work are worth carrying forward.** A latent defect was closed on the way past: `reveal` addressed values by key, so in a file defining a key twice — the case the interface already warns about — the second row handed back the first row's secret. Every created row shared one accessible name until a test could not tell two apart, which was the same defect a screen-reader user would have met. And a guard that read as load-bearing turned out **unreachable**, established by three attempts to break it; it is removed rather than left reading as a live check.

**The row was then redesigned**, because the first pass put all eight verbs side by side in the row — working, driven, and not a design. [_docs/row-density-research.md](_docs/row-density-research.md) surveyed how Carbon, Atlassian, Primer, Linear and NN/g handle a dense row, and [row-density.md](row-density.md) applied it: three controls stay (reveal, Edit, the switch, the last because it is a *state* rather than a command), everything else collapses into the `Overflow` menu the repository tile and file row already use, and the row is one toolbar with one tab stop instead of seven.

Two things about that pass are worth carrying. Its central claim is **measured, not argued** — a row was 192px, four lines, and is now 66px — and the cause was not density alone but a flex row that let the key take 355px at `flex: 1` and squeezed the controls into a column they stacked inside. And **three defects survived every measurement and were caught by looking at a screenshot**: the malformed row's controls wrapped, the value's CSS selector named a class the component does not render, and a narrow window wrapped a row to four lines. That is the [surface audit](../../../../../../docs/plans/SURFACE_AUDIT.md) pass working exactly as it is meant to.

**What was deliberately not built** is `bulk-entry.md` — pasting a block of `KEY=value` lines. It is the largest remaining step towards the owner's stated end state, since setting up a new environment is the case where a per-row create is slowest, and it sits cleanly on top of the create verb rather than changing its design.

# Open threads

- Nothing virtualizes at this altitude ([file.md](../file.md)'s own open thread): 400 variables is 2,850 DOM nodes. Every verb here adds per-row controls, so the cost per row rises exactly where it is already highest. Worth measuring before the row grows, not after.
- A rename is unremarkable inside the file and consequential outside it — nothing reading the variable knows it moved. The surface says nothing about that today; whether it should is still open, and wants a real user meeting the case rather than a guess.
- The row now carries eight controls at populated width. That is the most any surface in this product holds, and it has been driven but never judged at a small window size against a long variable name. A density pass belongs here once the surface has been lived in.
