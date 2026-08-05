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

TBD.

# Plans

No child plans yet.

# Cursor

Freshly framed from a product-owner request, and **blocked**: the design forks in [QUESTIONS.md](QUESTIONS.md) decide the shape of everything beneath this node, so no carving goes deeper until they are answered.

The most consequential of them is the first: whether the mutation vocabulary is expressed as a **structural edit list** across the existing boundary or as a **whole-document replacement**, because the answer decides what [dotenv.md](../../../dotenv.md) must grow, what `save` carries, and whether byte-exactness survives as a construction guarantee or becomes something the code must take care to preserve.

# Open threads

- The current `save` command takes `Vec<(String, String)>` and `app::save` applies it against keys that already exist. Every verb this concern adds is inexpressible in that signature, so the boundary changes whatever the answer to the first question is — the question decides how much.
- Nothing virtualizes at this altitude ([file.md](../file.md)'s own open thread): 400 variables is 2,850 DOM nodes. Add, delete and reorder each add per-row controls, so the cost per row rises exactly where it is already highest. Worth measuring before the row grows, not after.
