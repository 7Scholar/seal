Part of [the editing plan](README.md).

# Scope

The line model grown from changing a value in place to **structural mutation**: stable row identity, the disabled-variable rule, malformed rows as first-class things, and an edit list applied without weakening byte-exactness. Pure Rust, no Tauri and no session. Out of scope: what the command carries ([boundary.md](boundary.md)) and what the interface draws ([surface.md](surface.md)).

# What exists

[dotenv.md](../../../dotenv.md)'s model, whose shape this grows rather than replaces. A file is a sequence of `Line` — `Blank`, `Comment`, `Entry`, `Unparseable` — each retaining its original text alongside the file's newline style and trailing newline. `Entry` holds an `edited` flag, and `render` returns the untouched `raw` whenever that flag is clear. **That flag is the byte-exactness guarantee**: an untouched line is emitted verbatim because nothing re-rendered it, not because the renderer took care.

Mutation today is `entry_mut(key)` plus `set_value`, which reaches an entry *by key* and can only change its value. There is no insertion, no removal, no reordering, and no identity other than the key.

# Approach

## Identity

Every line the parser produces is assigned a `RowId` — an opaque, monotonically allocated `u32`, unique within one parsed file and never reused as lines are added and removed. It is allocated for **every** line, not only entries, so that a position can be expressed relative to any line including the ignored ones.

Identity is not the key: a rename must preserve a row rather than route through removal and insertion. Identity is not the index: an insertion or a removal shifts every index beneath it, so an index naming one row would name a different row after an unrelated edit ([MEMORY.md](MEMORY.md) holds why this is a landmine rather than a preference).

`EnvFile` carries a `next_id` counter. Ids allocated during one parse are dense and ascending, which is an implementation detail no consumer may rely on; the only guaranteed property is uniqueness within the file's lifetime.

## What a line is, once comments can be variables

`Line` gains one variant and one field.

**`Entry` carries `disabled: bool`.** A line whose leading run of `#` and following whitespace strip away to something that parses as a valid assignment *is* that assignment, with `disabled` set. The strip is indifferent to how many `#` characters lead and how much whitespace follows, so `# FOO=bar`, `#FOO=bar` and `##  FOO=bar` are all `FOO`, disabled. The prefix that was stripped is **not** retained: rendering a disabled entry emits exactly one `# ` before the assignment, so a disable→enable→disable round trip settles at the canonical form. This is the model's one deliberate departure from byte-exactness, and it is bounded to entries the user actually toggled — an untouched disabled entry still renders from `raw` like any other untouched line.

The rule is strict and **fails towards prose**: the stripped remainder must satisfy the same `parse_line` an ordinary line does, so `# Set DEBUG=true to enable verbose logging` stays a `Comment` because `Set DEBUG` is not a plausible key. The asymmetry is load-bearing and is stated in [MEMORY.md](MEMORY.md).

Parsing is therefore: strip the comment prefix, attempt an ordinary line parse on the remainder, and take the result as a disabled entry only if it parsed as an entry. Anything else remains `Comment`. Reusing the ordinary parser rather than writing a second one is what makes the two paths agree by construction — a quoting form the ordinary parser accepts cannot be one the disabled path rejects.

**`Malformed` replaces `Unparseable`.** The old name described a line the model refused to interpret; the new one is a line the *user* can act on, carrying its raw text and able to have that text replaced wholesale. It is the same preserved-verbatim line with a mutation path attached.

## The operations

The model exposes one entry point, `apply(&mut self, ops: &[Op]) -> Result<(), ApplyError>`, over:

- **`SetValue { row, value }`** — as today's `set_value`, reached by id.
- **`SetKey { row, key }`** — rename in place. The row keeps its value, position, quoting, `export` prefix, trailing comment and disabled state. Rejected if the key is not plausible.
- **`SetDisabled { row, disabled }`** — toggle. Marks the entry edited so it re-renders with or without the canonical prefix.
- **`Insert { after, key, value, disabled }`** — a new entry placed after the given row, or at the top of the file when `after` is `None`. Returns its new id. A new entry is `edited` from birth, since it has no `raw` to fall back on.
- **`Remove { row }`** — removes the line entirely.
- **`ReplaceMalformed { row, text }`** — replaces a malformed row's raw text, re-parses it, and **fails if the result is not a valid entry**, leaving the row untouched. This is the `Correct` action's engine: it refuses rather than guessing, because a best guess at a malformed secret is how a silently wrong value reaches a sealed file.
- **`Reorder { rows }`** — the managed rows in their intended order.

Each operation names rows by id, so an ordering of operations within one list cannot make a later operation address the wrong row. Applying an op whose id is absent is `ApplyError::UnknownRow` and **aborts the whole list without mutating anything** — a partially-applied edit list on a sealed file is the failure mode with no recovery, so application is all-or-nothing. It is implemented by validating every op's ids against the file before any mutation runs, which is cheap and needs no rollback path.

## What reordering moves

`Reorder` carries **managed rows only** — entries, enabled and disabled, and malformed rows. Blank lines and ordinary comments are **not** in the list and do not move.

The rule: the positions in the file currently occupied by managed rows are collected, and the reordered rows are written back into exactly those positions in order. Every other line stays at its own index untouched. So a file's non-variable furniture stays where it was while the variables permute among the slots they already occupied.

The consequence is stated rather than hidden: a comment heading labelling a group does not follow the variables it labels, so a reorder can leave a heading standing over something else. This is a deliberate trade of fidelity for determinism ([MEMORY.md](MEMORY.md) holds why the alternative is worse), and the interface does not draw those comments so it cannot warn about them.

`Reorder` is rejected as `ApplyError::IncompleteOrder` when its list is not exactly the file's managed rows — a permutation that dropped or duplicated a row would otherwise silently delete or clone a variable. Removal is `Remove`'s job and must not be reachable by omission.

## What byte-exactness still means

Unchanged where it was, and honestly narrowed where it could not hold:

- A file parsed and rendered with **no operations applied** is byte-identical. Untouched lines still render from `raw`.
- A file with operations applied differs **only at the lines those operations named**, plus the positions changed by an insertion, a removal or a reorder. Every unnamed line still renders from `raw`.
- A **disabled entry the user toggled** renders canonically rather than reproducing its original prefix. This is the single stated exception, and it is invisible unless the user toggled that row.

# What was built

All of the Approach, verified by **24 tests** in the crate's structural suite alongside the **14 existing round-trip tests, which pass unchanged** — the strongest available evidence that growing the model into structural mutation did not weaken byte-exactness, since those fourteen are the guarantee's own suite.

Three load-bearing guards were confirmed non-vacuous by reintroducing the exact defect each prevents:

- **Loosening the comment rule** to take the last word before `=` as the key — the "obviously intended" heuristic a later reader would reach for — turns `# Set DEBUG=true to enable verbose logging` into a live variable and fails 1.
- **Dropping the reorder length check**, so a short list silently deletes the rows it omits, fails 1.
- **Applying without validating first**, so a list whose later op names an absent row leaves the earlier ops applied, fails 2.

The first of those is worth recording precisely, because the first attempt at breaking it **failed to fail**: adding a redundant `contains('=')` test in front of the parse changed no behaviour, since the ordinary parser was still the thing deciding. A guard is only shown non-vacuous by breaking the mechanism it actually guards, not something adjacent to it.

# Steps

- [x] `RowId`, allocation at parse, and id-addressed lookup.
- [x] `disabled` on `Entry`, the strict comment-stripping parse reusing the ordinary parser, and canonical rendering.
- [x] `Malformed` replacing `Unparseable`, with `ReplaceMalformed` refusing invalid text.
- [x] The `Op` list and `apply`, validated all-or-nothing.
- [x] `Reorder` over managed rows, holding furniture in place, rejecting a non-permutation.
- [x] Tests: the existing round-trip suite still passing unchanged, plus each operation's contract and each refusal.

# Open threads

- Nothing yet.
