Part of [the navigation plan](README.md).

# Scope

The **route** and the **breadcrumb trail** that expresses it, and where on the trail its menu hangs. Out of scope: the menu itself ([file-jump.md](file-jump.md)), what any altitude's surface shows, and the strip's other occupants ([theme.md](theme.md), [title-bar.md](title-bar.md)).

# What & why

The navigation model the redesign is built on. Three altitudes deep, with the trail as the only navigation chrome and its menu as the accelerator that keeps a three-level hierarchy from costing three clicks to cross.

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

## The menu the trail carries

**The trail carries one chevron-up-down button, on its last segment**, and what it opens is [file-jump.md](file-jump.md)'s two-level menu rather than a flat list of siblings. That node owns the menu's shape, its keyboard contract and the state language it carries; what belongs here is why the trail hands it a single anchor instead of one per segment.

A per-segment switcher expressed *sideways at this altitude*, so three segments meant three lists and the file list could only ever hold the current repository's files. The two-level menu reaches sideways and down at once, which makes the altitude of the segment it hangs from irrelevant: the content is the same from every altitude, and only the marking of *current* changes. One anchor is then the honest shape — three chevrons opening three identical menus would say there are three different things to open.

The root's chevron is the one that most has to exist, which is the opposite of how it reads at first: on a fresh install the repository list is empty, and the menu carries **+ Add repository**, which on that screen is the only thing a user can do. A control over an empty set would indeed lie about having options if options were all it held; this one holds the action that creates them. At the root nothing is marked current, because the root is not one of its own options: it is the altitude above them.

## Where the exposure indicator sits

In the strip's trailing group, before Lock. It states the number of repositories holding an exposed file and navigates to the first of them; it renders nothing at all when the count is zero. [The navigation plan](README.md) records why it lives here rather than on a surface.

# What exists

All of the Approach: the route with its fallbacks, the trail with its inert current segment, the single menu anchor, and the exposure indicator.

Interface tests cover the trail's navigation, the current segment's inertness, the menu's dismissal, its list and its empty form at the root, and the route's fallback when a repository or file disappears underneath it. The menu's own tests belong to [file-jump.md](file-jump.md).

Driven against the real application in `first-run`, on the empty screen where the absence mattered: the root's menu opens, states that there are no repositories yet, offers the add action, and dismisses on Escape.

Load-bearing guards confirmed non-vacuous by reintroducing the defect each prevents:

- making the current segment navigate fails 1
- dropping a segment to fit rather than truncating its text fails 1
- leaving the route pointing at a removed repository instead of falling back fails 2
- removing the trail's menu fails 4 unit checks and the driven first-run step

# Steps

- [x] The route, with navigation up, down and sideways, and its fallbacks.
- [x] The trail, with the inert current segment and per-segment truncation.
- [x] The trail's single menu anchor, and the empty form the fresh install meets.
- [x] The exposure indicator in the strip.
- [x] Tests, with each load-bearing rule confirmed non-vacuous.

# Open threads

None. The one this node carried — whether the file segment should list every repository's files rather than the current repository's — is **settled and built**: it lists every repository's, by reaching through the repository panel rather than by flattening two lists into one. [file-jump.md](file-jump.md) records the reason the prior art was missing.
