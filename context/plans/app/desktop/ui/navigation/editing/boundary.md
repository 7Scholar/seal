Part of [the editing plan](README.md).

# Scope

What crosses the Tauri boundary once a row is more than a key and a mask: the view an open returns, the edit list `save` carries, and how `reveal` addresses a value. Out of scope: the line model beneath it ([model.md](model.md)) and the interface above it ([surface.md](surface.md)).

# What exists

`open_file` returns an `EnvView` of `VariableView { key, masked, empty }` plus `duplicateKeys` and a count of unparseable lines. `reveal` takes a **key** and returns the first matching entry's value. `save` takes `Vec<(String, String)>` and applies each pair to the entry `entry_mut` finds **by key**.

Every one of those addresses a variable by its key, which is exactly what a structural vocabulary cannot do.

# Approach

## Rows carry their identity outward

`VariableView` gains `id`, the `RowId` the model allocated at parse, and `disabled`. The view becomes a list of **rows** rather than of variables, so it can also carry the malformed ones: a new `MalformedView { id, text }` list sits beside the variables, replacing the bare `unparseableLines` count with the lines themselves. The count the interface currently shows is derivable from its length, so nothing is lost and the surface gains the ability to draw and correct them ([surface.md](surface.md)).

The view keeps its **order**, which is now load-bearing rather than incidental: the interface renders rows in the order the view lists them, and reordering is expressed by sending a permutation of their ids back.

## Addressing by id, not by key

`reveal` takes a `RowId` instead of a key. This is not only for renaming's sake — it fixes a **latent defect** in what exists: `value_of` returns the first entry matching a key, so in a file with duplicate keys (which the model deliberately preserves as separate entries, and which the interface already warns about) revealing the second row returns the **first row's value**. The user is shown one row and handed another row's secret. Addressing by id makes that unrepresentable rather than merely unlikely.

`save` takes the edit list — the `Op` vocabulary [model.md](model.md) defines, serialized as a tagged union — and applies it through one `apply` call.

## What the boundary refuses

The command layer keeps every gate it has: the file must be managed, editable and acknowledged, and the session must hold its plaintext. Two failures are added to the error vocabulary, and both are shapes the interface must be able to state rather than swallow:

- **`unknownRow`** — an op named a row the file no longer holds, which is the shape a stale view produces (the file changed underneath an open editor). The whole list is refused and nothing is written, per the model's all-or-nothing rule.
- **`invalidKey`** — a created or renamed key that is not plausible. The interface validates before sending, so reaching this means the two validators disagree; it is stated rather than assumed unreachable.

`ReplaceMalformed`'s refusal reuses `notAnEnvFile`'s sibling shape rather than inventing a third: it surfaces as **`stillMalformed`**, because the interface's `Correct` action needs to say *this text still is not a variable* and no existing kind carries that.

## Save keeps every rule it had

Unchanged, and stated because a larger vocabulary is exactly when they get dropped: a save preserves the file's on-disk state, re-sealing a sealed file and writing a readable one back readable; it refreshes the session's held plaintext from what was written, so the view the interface reloads matches disk; and it records the file's state in the registry as before.

One consequence of structural editing is new and must be honoured: **`save` returns the reparsed view**. Insertion and removal change which ids exist, so an interface holding the pre-save view would be addressing rows that no longer exist. Returning the fresh view makes the post-save state authoritative in one round trip rather than requiring a follow-up open.

# What was built

All of the Approach. The Rust suite is **49 tests** in the command surface, every prior one still passing.

The **line model stays dependency-free**, which shaped one decision: `Op` carries no serde derives, and the boundary owns an `EditOp` wire type that deserializes and converts. [dotenv.md](../../../dotenv.md) states the crate depends on neither Tauri, the engine nor the registry so it is testable in isolation, and adding serde to satisfy the IPC layer would have spent that property on convenience. The conversion is total and mechanical, so the wire type costs a `From` impl and nothing else.

The **duplicate-key mis-reveal is fixed and guarded**. It was live before this work: `value_of` returned the first entry matching a key, so in a file the interface explicitly warns about — one defining a key twice — revealing the *second* row handed back the *first* row's secret. The user was shown one row and given another's value. `each_duplicate_row_reveals_its_own_value` asserts both rows now reveal their own.

One error message was **corrected rather than added to**: `unknownKey` said the edit was refused "rather than silently adding a new one", which described a product where creation was impossible. Creation is now a verb, so that sentence would have been a lie about the current design.

# Steps

- [x] `VariableView` carrying `id` and `disabled`; `MalformedView` beside it.
- [x] `reveal` addressing by `RowId`, closing the duplicate-key mis-reveal.
- [x] `save` carrying the `Op` list, returning the reparsed view.
- [x] The added error kinds, and the TypeScript boundary types to match.
- [x] Tests: the view's shape, the duplicate-key reveal, and each refusal.

# Open threads

- Nothing yet.
