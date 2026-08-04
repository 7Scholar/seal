# Surface audit — the four navigation surfaces

Produced by following [the surface audit procedure](../../../../../../../docs/plans/SURFACE_AUDIT.md). Its product is findings and framed plans, not fixes.

Everything below was seen in the **real application** — a release binary built per [RUNNING.md](../../../../../../../docs/RUNNING.md), driven against a scratch profile, read through the platform accessibility tree and measured where geometry mattered. Where a finding is a measurement it says so; where it could only be established from source it says that too.

The product owner re-supplied the two reference screenshots, which now live beside this document at [reference/projects.png](reference/projects.png) and [reference/breadcrumbs.png](reference/breadcrumbs.png). **The fidelity pass is complete** and is recorded in *Reference fidelity* below.

Going back to the images was not a formality. The transcription in [navigation-research.md](navigation-research.md) missed several elements outright — most consequentially that **the reference's root segment does carry a switcher**, which turns the missing one from a judgement call into a plain deviation.

## How the states were reached

- **Empty** — a scratch `HOME`, so the app started from genuinely nothing.
- **One** — the folder-pick stub (`SEAL_E2E_PICK_FOLDER`) against a harness build, driving the real add flow.
- **Excessive** — 25 repositories written into the registry, including one with a 120-character name, then the app restarted.
- **Loading, error, degraded, unavailable** — established from source, because **they do not exist to be reached**. That is itself the finding.

## Repositories grid — the landing surface

| State | Verdict |
| --- | --- |
| Empty | **absent** — a different visual language, and a different label for the same action |
| One | designed |
| Populated | designed |
| Excessive | **absent** — no count, no virtualization, and a long name breaks the tile |
| Loading | **absent** — indistinguishable from empty |
| Error | **absent** — indistinguishable from empty |
| Degraded / partial | **absent** |
| Unavailable | **absent** |

**R1 — While the repository list loads, and if it ever fails, the user is told Seal manages nothing.** *(broken)*

`repos` initialises to `[]`, and `Repositories` returns the empty state on `repos.length === 0`. `refresh()` sets no loading flag, and the launch call at [App.tsx:76](../../../../../../../ui/App.tsx#L76) is `void refresh()` — the promise is discarded, so a rejection is unhandled and nothing reaches the user. A returning user with twenty repositories sees **"Seal manages nothing yet"** on every launch until the call returns, and *permanently* if it fails. The three states — empty, loading, failed — are one screen, and it is the screen that says the user's data does not exist. This is the most severe finding in the audit and the only one that misreports the product's state.

**R2 — The empty state is a different surface, not the same surface with nothing in it.** *(unfinished)*

Measured by comparing the two screens in the running app. Empty renders a centred `h1`, a two-sentence paragraph and **"Add a folder"**. One-or-more renders a `Repositories` heading, a toolbar with a search field, **"+ Add repository"**, and a grid. So the empty state does not merely restyle the grid — it **removes the toolbar and renames the primary action**. One flow has two names depending on how many repositories exist, which is the inconsistency finding R3 as well.

The paragraph also violates this plan group's own rule that a surface needing a sentence to explain itself is insufficient ([ui/README.md](../../README.md)). It survives because the first-run journey asserts it.

**R3 — The same add flow is labelled two ways.** *(inconsistent)*

"Add a folder" in the empty state; "+ Add repository" in the toolbar and in the switcher popover. Same flow, three entry points, two names — and the product calls the thing a *repository* everywhere else.

**R4 — A long repository name inflates its tile and breaks the grid row.** *(unfinished)*

Measured in the running app: a normal tile is **338×177**; the tile for a 120-character name is **338×283**. The name is emitted unbroken into `.tile__name` (`overflow-wrap: anywhere`) and the full path into `.tile__path`, so the tile grows 106px taller than its neighbours and the row it sits in is visibly ragged. Nothing truncates, and no tooltip carries the full value.

**R5 — Nothing states how many repositories there are, and nothing virtualizes.** *(unfinished)*

All 25 tiles are in the accessibility tree at once. There is no count anywhere on the surface, so at 25 the user cannot tell how much is below the fold, and the DOM grows without bound.

**R6 — The no-match state is a bare sentence under a grid.** *(inconsistent)*

Searching for something absent replaces the grid with `<p>No repository matches "…"</p>` — the same class of language mismatch as R2, at a moment the user is definitely looking.

## Files list

| State | Verdict |
| --- | --- |
| Empty | **absent** — a bare sentence where the populated case is large rows |
| One / Populated | designed |
| Excessive | **absent** — untested; same no-count, no-virtualization shape as the grid |
| Loading | **absent** |
| Error | **absent** — no per-surface failure state |
| Degraded / partial | designed — the batch seal reports per file with its reason |
| Unavailable | partial — a missing file's row disables its open control, but nothing says why |

**F1 — The empty repository is a sentence.** *(unfinished)*

`<p className="surface__empty">Seal manages no files in this repository yet.</p>` with an inline scan button, where the populated surface is a list of deliberately large rows. The same failure as R2 at the middle altitude.

**F2 — A "Not found" row disables its open button and never says why.** *(unfinished)*

`disabled={file.state === "missing"}` with no explanation. The procedure's *unavailable* state requires the interface to say why rather than silently disabling — this is precisely the silent disable.

## File surface

| State | Verdict |
| --- | --- |
| Populated | designed |
| Empty | designed — an env file with no variables is a real case the editor handles |
| Loading | **absent** — opening a file awaits a command with no indication |
| Error | partial — failures route to the global `Problem` banner, not the surface |
| Excessive | **not audited** — a file with hundreds of variables was not reached |
| Unavailable | designed — a non-env file opens opaque |

The two absences and the unaudited state were reached afterwards, and both absences were worse than this table records. **Loading** is not "no indication": the content region was measured holding zero bytes for the whole open, so the window below the trail was blank. **Error** is not merely mis-routed: a rejected open leaves the altitude current with no contents, and every render branch guards on those contents — so dismissing the global banner leaves a blank window under a trail claiming the user is inside a file.

**Excessive, once reached, was the only *broken* state on any of the four surfaces.** At 400 variables the surface rendered **26,756px inside a 673px content region**, the document scrolled, and the save control sat at 26,776px in a 720px window — so a user could not save a large file. All of it is fixed and driven; [states.md](../states.md) and [file.md](../file.md) record what was built.

## Title bar and breadcrumb

| State | Verdict |
| --- | --- |
| Populated | designed |
| Empty | **absent** — the root segment carries no switcher |
| Excessive | **absent** — long segment truncation not verified in the running app |

**T1 — The `Repositories` root segment has no switcher, so the landing screen's trail is inert.** *(broken)*

Confirmed in the running app: at the root the breadcrumb contains **only static text**. At the repository altitude the same trail carries a **"Switch repository"** control. So the affordance the reference showed exists at every altitude *except* the one screen a new user sees, and the "+ Add repository" the popover carries is unreachable exactly when it is the only thing a user can do.

The plan rationalised this as *"a popover over an empty set is a control that lies about having options."* The popover carries the add action, so with zero siblings it is not lying — it is the shortest path to the only available action.

**T2 — The chevron is two ASCII carets.** *(unfinished)*

`<span aria-hidden="true">⌃⌄</span>` where the reference shows a chevron-up-down icon.

**T3 — There is no icon system; every glyph is a text character.** *(unfinished)*

The complete inventory, from source:

| Glyph | Where | Should be |
| --- | --- | --- |
| `⌃⌄` | `Switcher` trigger | chevron-up-down |
| `···` | `Overflow` trigger | horizontal ellipsis / kebab |
| `◐` | `ThemeControl` trigger | theme icon |
| `✓` | `Switcher`, `ThemeControl` | check |
| `▾` / `▸` | `FileTree` twisty | caret |

These are typographic characters standing in for icons: they inherit font metrics, sit off the optical centre of their buttons, and render differently across fonts. This is systemic and larger than the breadcrumb — it is a substantial part of why the product reads as unpolished.

## Reference fidelity

Element by element, with [reference/projects.png](reference/projects.png) and [reference/breadcrumbs.png](reference/breadcrumbs.png) beside the running application.

### The breadcrumb strip

| Reference element | Ours |
| --- | --- |
| A switcher on **every** segment, root included | **absent at the root** — see T1 |
| Chevron-up-down glyph, drawn as an icon | **approximated** — `⌃⌄`, two text characters |
| The chevron is its **own control** with its own hover and press box, visually separate from the segment text | **approximated** — no separate affordance box |
| A **leading icon per segment** (org mark, project cube) | **absent** |
| A status badge per segment (`PRO`, `PRODUCTION`) | **excluded**, and rightly — Seal has no plan tiers or environments. No Seal fact belongs here. |
| `/` separators between segments | present |
| Popover: magnifier icon in the search field | **absent** — placeholder text only |
| Popover: `Find project…` placeholder | present in kind (`Search for a repository`) |
| Popover: **right-aligned check icon** on the current item | **approximated** — a `✓` text character |
| Popover: add action as a **full-width pinned footer row**, separated by a rule, with a `+` icon | **approximated** — a button, no separator rule, `+` as a text character in the label |

### The projects grid

| Reference element | Ours |
| --- | --- |
| Page title (`Projects`) | present (`Repositories`) |
| Search field with a **magnifier icon** | **approximated** — no icon |
| `Status` filter and `Sorted by name` controls | **excluded** with a stated reason — refused for scale in the research |
| Grid/list view toggle | **excluded** with a stated reason — same |
| `+ New project` primary button, trailing edge, with a `+` icon | **approximated** — `+` is a text character in the label |
| **Fixed-height tiles with generous empty space below the content** | **absent** — our tiles size to content, which is what lets a long name grow one to 283px against its neighbours' 177px (R4) |
| Tile: name, then a secondary metadata line | present (name, then path) |
| Tile: a small badge (`SMALL`, `MICRO`) | **adapted** — replaced by the managed-file count and the exposure treatment, which are Seal's equivalent facts |
| Tile: **vertical ellipsis (`⋮`)** in the top-right corner | **approximated on two counts** — ours is a *horizontal* `···`, and it is a text character rather than an icon |
| Tile menu: **an icon per entry** (copy, gear) | **absent** |
| Whole tile navigates | present |

**The deviations that matter**, in the order a user meets them: the absent root switcher (T1), every glyph being a text character (T2, T3), the tile ellipsis being horizontal where the reference is vertical, and tiles sizing to content rather than to a fixed height.

## Across surfaces

**X1 — Four disclosure components implement the same dismissal logic independently.** *(inconsistent)*

`Overflow`, `ThemeControl` and `Toggletip` are **byte-identical** in their Escape and outside-click handling — the same `keydown` capture listener and the same `mousedown` listener at the same lines. `Switcher` implements the same behaviour differently: it has **no document `keydown` listener**, handling Escape only on the popover's own subtree.

That difference is a real divergence, not a stylistic one: the three siblings dismiss on Escape from anywhere, and the switcher dismisses only while focus is inside it. Four copies of one contract, already drifted.

**X2 — No surface has a loading state.** *(unfinished)*

Confirmed by search: no spinner, skeleton or pending treatment exists anywhere in the interface. Every command that awaits a Rust call leaves the surface showing its previous or empty content.

## What was not audited

- **Breadcrumb truncation with long segments** in the running app.
- **The title bar drag**, which [MEMORY.md](../MEMORY.md) records as undrivable by the harness and needing a hand check.
