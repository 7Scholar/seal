Part of [the navigation plan](README.md).

# Scope

The **chosen palette** and its application across the whole interface: which shade of white, which shade of black, which accent and which primary the product uses, and the rule that governs where each one may appear. Out of scope: the token *mechanism*, which [shape.md](shape.md) owns and which this plan consumes rather than rebuilds, and the theme-switching machinery ([theme.md](theme.md)).

The boundary between this plan and [shape.md](shape.md) is worth stating precisely, because the two are easy to conflate. `shape.md` established **that every colour is a semantic token resolved per theme** — the plumbing. This plan decides **what those tokens are set to and when each is used** — the palette and its discipline. The plumbing is done and correct; the palette was never deliberately chosen.

# What & why

The product owner asked for a **proper style set throughout the application**, and specified its character rather than leaving it open: **minimal — a shade of white, a shade of black, one accent, one primary, applied consistently everywhere.** The owner also stated this need not be invented from scratch.

The gap this names is not that colour is unmanaged. [shape.md](shape.md) already routed every rule through a semantic token, so the mechanism for applying a palette consistently is in place and working. The gap is that **no palette was ever chosen** — the token values are the ones the first screens happened to be built with, carried forward and then tokenised in place. The tokenisation preserved them faithfully; it did not decide them.

Two consequences follow, and they are what makes this a plan rather than a preference.

**The palette was wider than the stated intent.** Fifteen surfaces of decision per theme answered four named decisions. Some of that width is genuinely load-bearing — [shape.md](shape.md)'s two elevation levels need distinct surfaces, and danger and success are states rather than decoration — and some was accumulation: `--panel`, `--raised` and `--field` all resolved to an identical `#ffffff` in light, so two of the three were never distinct decisions, and `--selected` was declared in both themes and referenced by no rule at all.

**The accent and the primary were the same thing.** The owner named them as two. One `--accent` carried the filled primary button, the focus ring, hover borders, the selected-row treatment, the switcher tick, and the checked file's name — six roles on one value, so nothing stood out because everything did. Which roles each takes is the central question this plan settles, and the Approach settles it.

Why it matters beyond appearance: this is the same judgement that produced [the manage surface plan](manage-surface.md) — the product owner finding the interface reads as amateur. A palette that was inherited rather than chosen is one of the reliable sources of that impression, and it is the one that shows on every surface simultaneously.

# Approach

The values are the product owner's, designed outside this repository and specified exactly; [_docs/palette-research.md](_docs/palette-research.md) — a survey of Radix Colors, Material 3, GitHub Primer, Vercel Geist, Shopify Polaris, Linear and Apple's HIG, reading WCAG 2.1 normatively — is what this Approach reasons with rather than what supplies them.

Two constraints bound it and are settled: **minimal is the specification**, so every token must argue for itself; and **both themes are authored**, never one derived from the other. Contrast is measured against every pair rather than assumed, and where the specified palette misses a floor the miss is stated under **What is missing** rather than quietly corrected.

## Copper means sealed, and the primary is ink

**`--accent` is oxidized copper, and it carries exactly one meaning: this file is sealed.** It appears as the state bar on a sealed row, as the wash under one (`--accent-surface`), and as a sealed tick in a repository's row of ticks. Nothing else in the interface may take it — not focus, not hover, not selection, not the primary action, not interactive text.

**`--primary` is ink**, the same value as `--text`, and it fills the single most important action on a view with `--on-primary` on top of it. The most prominent button in the product is therefore neutral, which is what leaves the one saturated colour free to mean one thing.

The reasoning is the reservation rather than the hue. A security product has exactly one signal a user must never misread, and a colour that also marks the focused field, the hovered row and the Save button is a colour that says nothing. Narrowing the accent to a single condition is what makes the row of ticks readable at a glance from across the desk, which is the question this product exists to answer.

**Red is reserved in the same way.** `--danger` appears on the broken-seal condition — the bar, the wash `--danger-surface`, and the fix action beside it — and on verbs that destroy. It is never the ordinary unsealed state: a file the developer chose to leave readable is a resting state, and painting it red makes a normal condition look like an emergency.

**A third neutral, `--faint`, carries absence.** Ghosted things: a file gone from disk, a disabled control, and the tick of a file that is simply not sealed. It is the visual opposite of copper rather than a warning.

## The role rule

A surface picks by answering, in order:

1. **Is this file sealed?** → `--accent` as the bar, `--accent-surface` as the wash. Nothing else, anywhere, for any other reason.
2. **Did the seal break, or does this verb destroy?** → `--danger` text, bar or border; `--danger-surface` as the wash. Always with an icon or a label beside it.
3. **The single most important action on this view?** → `--primary` fill with `--on-primary` ink. At most one per view.
4. **Absent, disabled, or gone?** → `--faint`.
5. **Interactive, focused, or hovered?** → the neutral ramp: a `--text` ring for focus, a `--hover` overlay for hover.
6. **Structural — a surface, boundary, or label?** → the neutral ramp.
7. **None of these?** → it is neutral. Colour is not the default.

## Two boundary tokens, because 1.4.11 asks for two things

A boundary must clear 3:1 **only when it is the sole means of identifying a control**. A divider between two rows identifies nothing — the rows are identified by their own text — so `--line` stays subtle and is exempt. A text input's border is the only thing saying *you may type here*, so it is `--line-strong` and is the token that has to clear the floor.

## The tokens

Sixteen per theme. `--faint` and `--accent-surface` are the two the state language needs and the previous palette had no way to say: absence, and the wash under a sealed row.

**Hover is a neutral overlay, selection is an accent tint, focus is a neutral ring.** Three mechanisms, so the three states are never confused — and none of them borrows the sealed signal.

**Colour is never the sole carrier of meaning.** Every state also carries a shape: the bar's height distinguishes sealed from not-sealed from broken, a file gone from disk is struck through, and the broken-seal row carries an explanation and an action.

## Dark is a palette swap and nothing else

Every role keeps its meaning after dark, every layout and metric is identical, and the state language reads the same way. Only the values differ: copper and oxblood are both lifted so they hold on the dark ground, and `--primary` inverts to light-on-dark because the filled button is the ink of its theme.

# What exists

All of the Approach, in the stylesheet's token block and applied through it.

The sixteen tokens resolve in both themes and every rule reaches one of them. The reservation holds: a search of the stylesheet finds `--accent` on exactly two kinds of rule — the sealed condition, and the already-managed marker that means the same thing — and nowhere else. Focus rings, hover borders and the checked file's name all moved to the neutral ramp when the reservation was applied, which is what the two open threads the previous palette left had been asking about.

Prose is Geist and everything the machine owns is Geist Mono, both vendored as `woff2` into `ui/fonts/` with the SIL Open Font License text beside them, since the application is offline and [the CSP](../../shell.md) forbids fetching either.

Seen in the real application in both themes, on every surface, against a scratch profile.

# What is missing

**Three contrast pairs no longer clear their floor, and the plan states them rather than implying the palette passes.** Computed against WCAG 2.1 relative luminance:

- **`--muted` on `--bg` in light is 4.44:1**, against the 4.5:1 SC 1.4.3 requires. `--muted` carries repository paths and machine-owned labels at 11.5px, so the large-text exemption does not apply. On the two washes it is worse — 4.16:1 on `--accent-surface` and 3.75:1 on `--danger-surface`.
- **`--line-strong` is 1.78:1 on light and 2.13:1 on dark**, against the 3:1 SC 1.4.11 requires of a boundary that identifies a control. A field's fill is 1.08:1 against the page, so the border is the sole identifier and cannot be exempt.
- **`--faint` is 1.50:1 on light**. Where it marks a disabled control that is exempt, and where it marks a not-sealed tick the bar's height carries the distinction — but it also draws the **filename of a file gone from disk**, which is text a user has to read.

These are the design as specified, not a misapplication of it, so they are recorded here and put to the product owner rather than nudged. Until they are answered the palette's earlier guarantee — that every value clears its floor — does not hold, and no plan should be read as saying it does.

# Steps

- [x] Survey established minimal palettes and the accent/primary distinction as the leaders in the field draw it, per [docs/UX_RESEARCH.md](../../../../../../docs/UX_RESEARCH.md).
- [x] Audit the fifteen live tokens against both themes and against the stated four-decision intent, separating load-bearing values from accumulation.
- [x] Solution the Approach from the research, and apply it across the stylesheet.
- [x] Replace the palette with the one the product owner designed, narrow `--accent` to the sealed condition alone, and vendor the two typefaces the design specifies.

# Open threads

- The three failing pairs above are with the product owner. Nothing else in the interface depends on their answer, so the rest of the redesign proceeds around them.
