# Taking in a request

This is the operating procedure for **intake** — placing a raw, unplaced request into the recursive plan tree under `context/plans/<root>/`. Read [INSTRUCTIONS.md](INSTRUCTIONS.md) first if you haven't; it carries the background this file assumes. This file is the procedure you act on.

Load this file when you have a request to place. A request is a feature or a bug stated **without saying which node it belongs to** — _"add an unlock screen with a biometric fallback"_, _"fix the bug in cancelling a vault export"_. Your job is to find where in the tree it belongs and frame it there as a new node, so ordinary plan work can take over. The whole point is that the person making the request need not know the tree — a non-technical colleague, eventually a user — and the request still lands correctly without them carving the node by hand.

You do two things in order: **place**, then **frame**. Placement is the work; framing is the ordinary new-node move the system already documents.

A request maps to **a place in the tree** — and "a place" is one location or several. Most requests belong in one spot; a cross-cutting one belongs in several, because its parts are distinct concerns that the tree already keeps in different subtrees (a frontend request might split into a _page_ concern and a _navigation_ concern). This is not an exception bolted onto a single-parent rule — placement finds **the set of places**, and that set usually has one element. Keep that lens through every step below: wherever the procedure says "the place," it means "each place," and the steps simply run once when there is one.

## 1. Place — find where the request belongs

**Start with a coverage search to find candidate plans.** Run, from `context/_scripts/`:

```
uv run find_plans <term...> [--root <plan-root>] [--limit N]
```

It searches every `coverage.json` for plans whose covered files match the terms and prints them ranked by overlap, each with its full plan path and the matching files. Pull terms straight from the request — for _"fix the bug in cancelling a vault export"_ run `find_plans export cancel`; for _"add an unlock screen with a biometric fallback"_ run `find_plans unlock biometric`. It is read-only, so it is always safe to run first.

`find_plans` matches **file paths only**, so it finds a plan when the request's words appear in the code's names. A request is phrased in concept-language, though, and a plan often describes its concern in prose its filenames don't echo (a plan about _cancelling exports_ may own `export.rs` and `progress.ts`). So **also grep the plan prose** for the same terms — from the repo root, e.g. `grep -ril --include="*.md" "cancel" context/plans/<root>` to search the `README.md` and `.md` files — to catch concept matches the path search misses. The two together are your candidate set; a term that matches **neither** paths nor prose is itself a signal that that part of the request may be genuinely new.

**Confirm a candidate into a place by reading concerns.** The candidates tell you _where to look_, not which node is the place — that is still a concern judgement. For the top candidate, read its node's **What & why** and walk **up** through its ancestors' What & why until you reach the **lowest node whose concern contains the request** (or the relevant part of it). That node is **a place** the request attaches under. (You may also walk one level **down** if it fits a child of the candidate more tightly.) You are reading concern boundaries, not cursors — a request can belong under a node nobody is currently working, so the cursor path is irrelevant here.

**If `find_plans` and the grep return nothing**, fall back to the full top-down walk: start at the root `README.md`, read its What & why, descend into whichever child's concern contains the request, and repeat one level at a time until no child contains it. The node you stop at is a place.

**One place or several?** As you read concerns, watch for the request being **more than one concern**. The tell: no single node's What & why contains the whole request, yet each _part_ of it lands cleanly under a different node taken alone. A cross-cutting request is the usual cause — "add an unlock screen with a biometric fallback, and make locking instant from anywhere" is an _unlock-flow_ concern, a _platform-biometrics_ concern, and maybe a _shortcuts_ concern, which a concern-organized tree already holds in different subtrees. When that happens, **decompose the request into its parts and find the place for each part** by the same walk — the result is a set of places, not one. Do not force a genuinely multi-concern request into a single node to keep it tidy; that buries half of it under the wrong concern. (Most requests are one concern and yield one place — this is just the procedure not assuming so.)

What you carry out of step 1 is **the set of places** (commonly one) where the request belongs. Where a place's node has no child whose concern fits but the node itself does, the request — or that part of it — becomes a **new child** of it, the common case. Splitting a request across several places is a real decision: confirm the decomposition before framing (see **When to confirm**).

## 2. Gauge the scope, then choose the form

Steps 2 and 3 run **once per place** — once for a single-place request, once for each place of a split one.

**First, gauge how big the part landing here is** — scope assessment (**Gauge the scope first** in [INSTRUCTIONS.md](INSTRUCTIONS.md)). This is the call that keeps intake from carving a big concern as thin as a small one. It sets both the form below and what happens at framing (step 3):

- **Small** — _"add a dialog for deleting a row."_ A self-contained sub-area. Frame it as a single plan `.md`; the next agent can solution it directly.
- **Large** — _"create an AI chat."_ A sprawling concern that will run several plan folders deep. Frame it as a plan **folder**, and recognize that framing alone is not enough: the major design forks it exposes get raised in its `QUESTIONS.md` at framing (step 3), **even though its placement was never in doubt.** You are not carving the whole structure — you are naming its scale and surfacing the decisions the user must make before anyone carves deeper.

**Then choose the form. Default to a new child plan `.md`** — the part landing here is almost always its own distinct concern, so it becomes its own framed node, a folder if its scope (above) calls for one. Two exceptions, each taken **only on a clear signal**:

- **Fold into an existing plan `.md`** — when the part landing here is plainly a _continuation_ of work an existing child `.md` already scopes (not a new concern, just more of that one). Then it becomes a new step or a note inside that `.md`, not a new node.
- **Promote, then add** — when the part is large enough that the place it lands needs to become a folder to host it (an existing plan `.md` grows into a plan folder so it can be a child of it). This is the promotion move in **Splitting or merging** ([INSTRUCTIONS.md](INSTRUCTIONS.md)); apply it with its distillation and coverage consequences, and confirm it like any reshape.

When neither exception clearly applies, it is a new child plan. Do not reach for fold or promote on a hunch — the default is the safe call.

## 3. Frame — write the node empty-but-framed

At each place, the request (or its part) becomes a new child of that place's node in the **Framed** state — the ordinary new-node move from **Starting a new plan** in [INSTRUCTIONS.md](INSTRUCTIONS.md). Nothing here is intake-specific; intake's contribution was deciding _where_, and this step hands off to the framing the system already documents:

1. **Add the child to the node's Plans index** as a step with a `[ ]` marker, under the no-bare-steps rule — every step is a child plan.
2. **Create the child** — a plan `.md` (the default form) or, if the part needs decomposing, a plan folder with its `README.md` and `MEMORY.md`. State **What & why** from the request: what is being asked and why it matters, the gap it names. Leave **Approach `TBD`** — the solution direction is filled in later by research or brainstorming, not now.
3. **Set the first step.** A freshly framed node's first step is typically `[ ] Research solution directions`.
4. **For a large concern, raise its design forks now.** If scope assessment (step 2) flagged this as large, framing is not finished at a `TBD` node. Surface the major design crossroads you can already see — the decisions that must be settled before anyone carves the folder deeper — as blocking questions in the node's `QUESTIONS.md`, set the research step to `[!]` pointing there, and propagate the marker up (**Blocking on a user decision** in [INSTRUCTIONS.md](INSTRUCTIONS.md)). This holds **even though placement was never in doubt:** a large concern earns its questions from its scale, not from any ambiguity about where it goes. A small concern skips this — it has no forks worth blocking on.
5. **Point the node's Cursor** at the new child if that is where work goes next.

**For a split request, cross-link the framed nodes.** When one request became several nodes in different subtrees, each node's **What & why** names the others (`[[name]]`) as the shared origin, so neither is orphaned and whoever picks up one sees the rest — they are parts of one request even though the tree holds them apart.

**Frame the problem, don't solve it.** Intake structures the request as a problem so it can be reasoned about cold; it does **not** commit to a solution. Do not propose an approach unless the user explicitly asks — state what is missing or broken and why, and stop. (This is the **Framed** state; see the plan lifecycle in [INSTRUCTIONS.md](INSTRUCTIONS.md).) Raising a large concern's design forks (step 4) is **not** a violation of this: you state the crossroad and its plausible directions for the user to choose — "how should chat history persist?" — you do not pick one. Surfacing the fork is framing; answering it is solutioning you were not asked to do.

## When to confirm with the user

Placement is a judgement call, so confirm only when the call is genuinely unclear — the same propose-then-confirm rule as restructuring a plan (a clear mechanical move is yours; a real decision is the user's). Confirming here means the same thing it means everywhere: **write the question into `QUESTIONS.md` and stop** (the mechanism is **Blocking on a user decision** in [INSTRUCTIONS.md](INSTRUCTIONS.md)). The wrinkle intake has is _which_ `QUESTIONS.md` — and the answer follows from whether the request has a home yet:

- **Obvious place(s) → place and report.** When the request's place is clear — one node that plainly contains it, or a clean split where each part has one obvious home — place it, frame it, and tell the user where it landed (and how it was split, if it was). No question needed.
- **Ambiguous, but you can name the candidate places → ask in the candidate's `QUESTIONS.md`.** When the request plainly belongs _somewhere in a known subtree_ but the exact node, altitude, or decomposition is a real decision (fits several nodes equally, the split is unclear, fold-vs-promote is non-mechanical), write the question in the **`QUESTIONS.md` of the most likely candidate node** and stop. Do not frame anything until it is answered.
- **Cannot place it at all → ask in the root `QUESTIONS.md`.** When deciding _where it goes is itself the question_, or the concern is too vague to attach anywhere, there is no node to host the question — so it goes in the **root plan folder's `QUESTIONS.md`** (e.g. `context/plans/app/QUESTIONS.md`), the pre-placement holding area (see **The question channel** in [README.md](README.md)). This covers the underspecified request intake is built to expect: pose the one focused question that would pin the concern down, and stop. Never carve a node off a guess — a wrong placement is worse than a parked question.

## When you are done

The request lives as a framed node at each place it belongs — one node for a single-concern request, several cross-linked nodes for a split one. At every place: the node's **Plans** index lists it as a step, the **Cursor** points at it if it is next, and the node states **What & why** with **Approach `TBD`** and a research-first step. A **small** concern's step is `[ ]` — ready for the next agent to solution directly. A **large** concern's step is `[!]`, blocked on the design forks intake raised in its `QUESTIONS.md` (step 4), so the user's answers gate the deeper carving. A cold-resume read from the root now descends to each like any other plan: it solutions an unblocked node, or reads the open questions on a blocked one. Intake's job ends at a well-placed, well-framed problem — sized correctly, with its forks surfaced; it never solves it.
