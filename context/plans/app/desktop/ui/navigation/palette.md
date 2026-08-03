Part of [the navigation plan](README.md).

# Scope

The **chosen palette** and its application across the whole interface: which shade of white, which shade of black, which accent and which primary the product uses, and the rule that governs where each one may appear. Out of scope: the token *mechanism*, which [shape.md](shape.md) owns and which this plan consumes rather than rebuilds, and the theme-switching machinery ([theme.md](theme.md)).

The boundary between this plan and [shape.md](shape.md) is worth stating precisely, because the two are easy to conflate. `shape.md` established **that every colour is a semantic token resolved per theme** — the plumbing. This plan decides **what those tokens are set to and when each is used** — the palette and its discipline. The plumbing is done and correct; the palette was never deliberately chosen.

# What & why

The product owner asked for a **proper style set throughout the application**, and specified its character rather than leaving it open: **minimal — a shade of white, a shade of black, one accent, one primary, applied consistently everywhere.** The owner also stated this need not be invented from scratch.

The gap this names is not that colour is unmanaged. [shape.md](shape.md) already routed every rule through a semantic token, so the mechanism for applying a palette consistently is in place and working. The gap is that **no palette was ever chosen** — the token values are the ones the first screens happened to be built with, carried forward and then tokenised in place. The tokenisation preserved them faithfully; it did not decide them.

Two consequences follow, and they are what makes this a plan rather than a preference.

**The palette is wider than the stated intent.** The interface currently resolves distinct values for background, panel, raised, line, field, text, muted, accent, on-accent, danger, danger-surface, success, hover, selected and shadow, in each of two themes. The owner asked for four decisions; the interface holds fifteen surfaces of decision per theme. Some of that width is genuinely load-bearing — [shape.md](shape.md)'s two elevation levels need distinct surfaces, and danger and success are states rather than decoration. Some of it is accumulation. Sorting which is which is this plan's substance.

**The accent and the primary are currently the same thing.** The owner named them as two: an accent colour *and* a primary colour. The interface has one `--accent`, used for the filled primary button, the focus ring, hover borders, the selected-row treatment, the tick in the switcher, and the checked file's name in the tree. When one value carries both the product's identity and every interactive state, neither reads as deliberate — and a surface where hover, focus, selection and the primary action are all the same colour is one where nothing stands out because everything does. Whether the owner's *accent* and *primary* should resolve to two distinct values, and which roles each takes, is the central question this plan settles.

Why it matters beyond appearance: this is the same judgement that produced [the manage surface plan](manage-surface.md) — the product owner finding the interface reads as amateur. A palette that was inherited rather than chosen is one of the reliable sources of that impression, and it is the one that shows on every surface simultaneously.

# Approach

TBD.

Three constraints are recorded now because they bound the solution and are already settled:

- **Minimal is the specification, not a starting position.** The direction is toward fewer deliberate values, not a richer scale. A proposal that adds tokens has to argue for each one.
- **Established palettes are to be surveyed rather than a palette invented.** The owner stated the wheel need not be reinvented, and [docs/UX_RESEARCH.md](../../../../../../docs/UX_RESEARCH.md) governs how that survey runs.
- **Both themes are first-class.** [theme.md](theme.md) ships light, dark and system, so a palette is not chosen in dark and then derived for light. A value that works in one and is illegible in the other is not a candidate — [shape.md](shape.md) already recorded this for shadows, and it holds for the whole palette.

The one thing this plan must **not** do is re-derive the accessibility floor from scratch: contrast minimums are a constraint on the palette, applied to whatever candidate emerges, and any candidate failing them at text sizes is rejected rather than adjusted after the fact.

# What exists

The full token mechanism, per [shape.md](shape.md) — every rule in the stylesheet names a semantic token, and both themes resolve the complete set. Nothing needs to be re-plumbed to change the palette; that is the work `shape.md` already did.

What does not exist is a chosen palette, a stated distinction between accent and primary, or any rule governing which token a new surface should reach for.

# What is missing

- The palette decision itself: the white, the black, the accent, the primary.
- The **role rule** — what each token is *for*, so a future surface picks correctly rather than by eye. Without this the palette drifts back apart the moment a new surface is built, which is how the current state arose.
- The reconciliation of the fifteen existing tokens against the chosen palette: which survive as deliberate, which collapse into another, which were accumulation.
- Whether accent and primary are two values or one.

# Steps

- [ ] Survey established minimal palettes and the accent/primary distinction as the leaders in the field draw it, per [docs/UX_RESEARCH.md](../../../../../../docs/UX_RESEARCH.md).
- [ ] Audit the fifteen live tokens against both themes and against the stated four-decision intent, separating load-bearing values from accumulation.
- [ ] Solution the Approach, raising the accent-versus-primary fork in `QUESTIONS.md` if the survey does not settle it — it is a decision about the product's identity and belongs to the owner.

# Open threads

- This plan changes every surface in the product at once, which makes it unusually hard to verify by driving one screen. How it is checked — and against which states, since [states.md](states.md) is mid-flight and some states do not yet exist to be looked at — wants deciding before the change lands rather than after.
- Sequencing against [manage-surface.md](manage-surface.md) and [states.md](states.md) is unsettled. Both build surfaces that this palette would then restyle. Whether the palette lands first, so the new work is built in it, or last, so it sweeps a settled interface, is a real call and not merely an ordering preference.
