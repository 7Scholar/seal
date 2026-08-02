Part of [the navigation plan](README.md).

# Scope

The **route**, the **breadcrumb trail** that expresses it, and the **switcher popover** that moves sideways within an altitude. Out of scope: what any altitude's surface shows, and the strip's other occupants ([theme.md](theme.md), [title-bar.md](title-bar.md)).

# What & why

The navigation model the redesign is built on. Three altitudes deep, with the trail as the only navigation chrome and the switcher as the accelerator that keeps a three-level hierarchy from costing three clicks to cross.

# Approach

Built from [the research](_docs/navigation-research.md); this states what follows.

## The route

One value with three shapes: `repositories`, `repository` with a root, or `file` with a root and a path. It is held in interface state, never persisted, and every launch starts at `repositories`.

The route is the **only** navigation state. There is no separate selection, no expansion set, and no open-file state beside it — a file is open exactly when the route names it. Collapsing those axes into one is what makes the surfaces stateless enough to be correct on a cold start every time.

Navigating **up** discards everything below: leaving a file closes it through the same explicit close the file altitude performs, so the plaintext the session holds is released rather than merely hidden. Navigating **sideways** at an altitude leaves the altitudes above untouched.

A route naming something that no longer exists — a repository that was removed, a file released or gone from disk — falls back to its parent altitude rather than to an error or a blank surface. This is the withdrawn shell's selection-fallback rule, which survives the change intact because it answers a question the new model still asks.

## The trail

`Repositories / <repository> / <file>`, rendered in the title bar's leading group after the platform's control inset.

Every segment before the current one is a control that navigates to that altitude. **The current segment is inert** — no link affordance, no hover treatment, not focusable as a navigation target — because a control that returns you to where you already are is a control that appears broken.

Segments truncate their own text rather than being dropped. A dropped segment is an unreachable altitude, which a breadcrumb may never produce.

The trail is a `nav` landmark with an ordered list inside it, and the current segment carries `aria-current="page"` — the shape assistive technology already knows, rather than a bespoke one.

## The switcher

The repository and file segments each carry a **chevron-up-down** button immediately after the segment's text. The `Repositories` root carries none: it has no siblings, and a control opening an empty popover lies about having options.

The popover holds three parts in a fixed order: a **search field**, focused on open; the **filtered sibling list**, with the current item marked by a checkmark rather than only by styling; and a single **add action** pinned at the foot, visually separated from the list — `+ Add repository` at the repository level, `+ Add file` at the file level.

Filtering is a case-insensitive substring match over the item's displayed name. Not fuzzy: the sets are small, the user usually knows the name, and predictable matching beats clever ranking when both are instant.

**It is a combobox-family control, not a menu.** A `menu` may not contain a text field, and building it as one captures the arrow keys and strands the search field for keyboard and screen-reader users. The trigger carries `aria-expanded` and `aria-haspopup`; the field owns the list through `aria-controls` with `aria-activedescendant` tracking the highlighted option; the list is a `listbox` of `option`s.

The keyboard contract: typing filters; Down and Up move the active option; Enter chooses it; Escape dismisses and returns focus to the trigger; an outside click dismisses. Tab from the field reaches the add action, so the whole popover is traversable without a pointer.

Choosing a sibling navigates at that altitude. Choosing the add action starts the same flow the altitude's own surface offers — one add path per altitude, whatever opened it.

## Where the exposure indicator sits

In the strip's trailing group, before Lock. It states the number of repositories holding an exposed file and navigates to the first of them; it renders nothing at all when the count is zero. [The navigation plan](README.md) records why it lives here rather than on a surface.

# What exists

All of the Approach: the route with its fallbacks, the trail with its inert current segment, the switcher with its combobox semantics and keyboard contract, and the exposure indicator.

Interface tests cover the trail's navigation, the current segment's inertness, the switcher's filter, its keyboard contract, its dismissal, and the route's fallback when a repository or file disappears underneath it.

Load-bearing guards confirmed non-vacuous by reintroducing the defect each prevents:

- building the popover as a `menu` containing the search field — the shape that strands keyboard users — fails the two tests naming the roles
- making the current segment navigate fails 1
- dropping a segment to fit rather than truncating its text fails 1
- leaving the route pointing at a removed repository instead of falling back fails 2

# Steps

- [x] The route, with navigation up, down and sideways, and its fallbacks.
- [x] The trail, with the inert current segment and per-segment truncation.
- [x] The switcher popover with its combobox semantics, filter, and keyboard contract.
- [x] The exposure indicator in the strip.
- [x] Tests, with each load-bearing rule confirmed non-vacuous.

# Open threads

- Whether the file segment should list every repository's files rather than the current repository's. Mirrors an unresolved question in the prior art; wants a reason before it is built.
