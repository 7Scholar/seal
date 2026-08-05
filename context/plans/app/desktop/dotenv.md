Part of [the desktop plan](README.md).

# Scope

Lossless parsing and rendering of env files: reading a file into a structure the editor can present, and writing it back so that an untouched file is byte-identical and an edited one differs only where the user changed something. Pure Rust with no dependency on Tauri, the engine, or the registry, so it is testable in isolation. Out of scope: the editing interface itself, and any decision about which values are shown.

# What exists

The line model, the parser and the renderer, implemented and verified.

A file is a sequence of lines — blank, comment, entry, or malformed — each retaining its original text and carrying a **stable row identity**, alongside the file's newline style and whether it ends with one. Rendering emits an untouched line verbatim and re-renders only entries an operation actually touched, so an untouched round trip is byte-identical by construction rather than by care.

The model mutates through an **edit list** applied all-or-nothing: set a value, rename a key, enable or disable, insert, remove, replace a malformed line's text, and reorder. A **commented-out assignment is an entry**, disabled, rather than a comment. [ui/navigation/editing/model.md](ui/navigation/editing/model.md) owns that vocabulary in full, including the one bounded departure from byte-exactness — a disabled entry the user toggled renders with a canonical `# ` prefix rather than reproducing the one it was written with.

Parsing covers what real files contain: single quotes taken literally, double quotes with their escapes, the export prefix, full-line and trailing comments, whitespace around the separator, empty values, and values containing a comment character inside quotes. A hash only begins a comment outside quotes and after whitespace, which is the distinction that keeps a URL fragment or a hashed value intact. Duplicate keys are kept as separate entries and reported, since implementations genuinely disagree on whether the first or the last wins and the honest response is to show both.

Editing preserves an entry's quoting style unless the new value forces a change — a single-quoted value that gains an apostrophe becomes double-quoted rather than emitting a broken line — and a value that newly needs quoting gets it.

Verified by fourteen round-trip tests, which **pass unchanged** across the growth into structural mutation — the strongest available evidence that the guarantee survived it — alongside the twenty-four in the structural suite that [model.md](ui/navigation/editing/model.md) records. The fourteen: byte-exact round trips across eighteen file shapes including empty, no-trailing-newline and Windows line endings; parsed values checked against every quoting form; an edit changing exactly one line with no line added or removed; comments, blank lines, unparseable lines and the export prefix all surviving an edit; and edited values re-parsing to what was set. The guarantee was confirmed non-vacuous by substituting a renderer that discards comments and re-renders every line — what every existing library effectively does — which fails seven of the fourteen.

# What is missing

Nothing for the editor's needs. Multi-line quoted values spanning several physical lines are not supported; see the open thread.

# Steps

- [x] Define the line model, retaining each line's original text plus the file's newline style and trailing newline.
- [x] Implement parsing across the quoting forms, the export prefix, comments, empty values and duplicate keys.
- [x] Implement rendering: untouched lines verbatim, edited entries re-rendered with quoting preserved unless the value forces a change.
- [x] Tests holding it to byte-exactness across real-world shapes, and to changing exactly one line per edit.

# Open threads

- Values are held as text, which covers every realistic file but would reject one containing invalid encoding. A tool guarding somebody else's file arguably should tolerate that; revisit if a real file ever fails to parse, since moving to bytes touches the whole model.
- A quoted value spanning several physical lines is not parsed as one value: its opening line becomes a malformed line and is preserved verbatim rather than corrupted. It now reaches the interface as an editable row rather than a count, so a user can replace it by hand — but Seal still cannot parse it as one value, and `Correct` will refuse it. Settle whether to support the shape properly now that the surface makes the failure visible.
