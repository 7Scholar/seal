Part of [the desktop plan](README.md).

# Scope

Lossless parsing and rendering of env files: reading a file into a structure the editor can present, and writing it back so that an untouched file is byte-identical and an edited one differs only where the user changed something. Pure Rust with no dependency on Tauri, the engine, or the registry, so it is testable in isolation. Out of scope: the editing interface itself, and any decision about which values are shown.

# What exists

Nothing implemented. The design is settled in the [desktop Approach](README.md) and grounded in a survey of what existing libraries do.

# What is missing

Everything: the line model, the parser, the renderer, and the tests that hold it to byte-exactness.

# Steps

- [ ] Define the line model: blank lines, comments, entries, and unparseable lines, each retaining its original text, plus the file's newline style and whether it ends with one.
- [ ] Implement parsing, covering the cases real files contain: single and double quotes with their differing escape and interpolation rules, the export prefix, full-line and trailing comments, whitespace around the separator, empty values, and duplicate keys kept as distinct entries.
- [ ] Implement rendering: untouched lines emitted verbatim, edited entries re-rendered with their original quoting preserved unless the new value forces a change.
- [ ] Tests: an untouched round trip is byte-identical across a corpus of real-world shapes; editing one variable changes exactly one line; comments, blank lines, ordering and unparseable lines all survive; both newline styles survive; a value containing a comment character, a quote, or a newline round-trips correctly.

# Open threads

- Whether values are held as text or as bytes. Text is simpler and covers every realistic file; bytes would tolerate invalid encoding, which a tool guarding somebody else's file arguably should. Decide when the model is written, and prefer whichever loses less.
- Which quoting to choose when a new value requires a change of style — the rule needs stating precisely so the same value always renders the same way.
