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

Built from [_docs/palette-research.md](_docs/palette-research.md), which surveys Radix Colors, Material 3, GitHub Primer, Vercel Geist, Shopify Polaris, Linear and Apple's HIG, and reads WCAG 2.1 normatively rather than from memory. That document is the design input; this Approach states what follows from it.

Three constraints bound it and are settled: **minimal is the specification**, so the direction is toward fewer deliberate values and every token must argue for itself; **both themes are authored**, never one derived from the other; and **contrast minimums are a filter applied to candidates**, so a value failing them is rejected rather than nudged afterward.

## Accent and primary are two roles over one hue

The owner named accent and primary as two things, and the distinction is real: Material 3 calls primary, secondary and tertiary collectively the *accent roles*, so accent is the category and primary the most prominent member; Radix splits the same hue into step 9, the solid fill, and step 11, the interactive text.

**`--primary` is the solid fill of the single most important action on a view. `--accent` is the interactive-and-selected signal everywhere else** — focus rings, selection tints, the switcher tick, the checked file's name, interactive text. Two tokens, one blue, not two colours.

The argument is mechanical rather than stylistic, which is why it is not a matter of taste: a fill is a **background that ink sits on**, an accent is a **foreground that sits on the page**, and those are opposite contrast obligations. No single value satisfies both — a blue dark enough to carry white text is too dark to read as text on the same page. This is the defect the split repairs: one value carrying six roles means the primary action, hover, focus and selection are all the same colour, so nothing stands out because everything does.

A second *hue* is refused. It would give the product two identities, and in a security product a second saturated colour competes with the one signal that must never be missed.

## The role rule

The palette drifts apart the moment a new surface picks by eye, which is how the present state arose. A surface picks by answering, in order:

1. **The single most important action on this view?** → `--primary` fill with `--on-primary` ink. At most one per view; if a view seems to need two, one of them is not primary.
2. **Interactive, selected, focused, or currently active?** → `--accent`, as text, ring, or `--selected` tint. Never as a large fill.
3. **Reports danger, exposure, or destruction?** → `--danger` text or `--danger-surface` tint; `--danger` as fill only for a confirmed destructive act. Always with an icon and a label.
4. **Reports success, or a sealed state?** → `--ok`, as text or icon only.
5. **Structural — a surface, boundary, or label?** → the neutral ramp.
6. **None of these?** → it is neutral. Colour is not the default.

## Two boundary tokens, because 1.4.11 asks for two things

The live `--line` is **1.34:1 against the page on dark and 1.23:1 on light**, against the 3:1 that WCAG 2.1 SC 1.4.11 requires of a boundary identifying a control. Lifting one shared token to clear it would turn every divider into a heavy grey rule and destroy the calm the owner asked for.

The token therefore splits by obligation, which is what 1.4.11 actually requires rather than a waiver of it: a boundary must clear 3:1 **only when it is the sole means of identifying a control**. A divider between two rows identifies nothing — the rows are identified by their own text — so `--line` stays subtle and is exempt. A text input's border is the only thing saying *you may type here*, so it is `--line-strong` and clears 3:1.

## The tokens

Fifteen become fourteen. `--panel` and `--field` collapse into `--raised` — all three already resolve to an identical `#ffffff` in light, so they were never distinct decisions, and [shape.md](shape.md) specifies two elevation levels, not four fills. `--on-accent` becomes `--on-primary` and `--danger-bg` becomes `--danger-surface`, each name following its role. `--primary` and `--line-strong` are added. `--selected` is retained and, for the first time, actually used.

Of the owner's four named decisions, `--bg` is the shade of black-or-white, `--text` its opposite, and `--accent` and `--primary` the two blues. The remaining ten are the states and structure the interface cannot draw without.

**Hover is a neutral overlay, selection is an accent tint, focus is a ring.** Three mechanisms, so the three states are never confused — which is the other half of the "nothing stands out" defect.

Every value clears its floor in both themes, verified by computation rather than by eye: all thirteen text pairs at 4.5:1 and all three non-text pairs at 3:1. The tightest is the light `--ok` at 5.03:1.

**Colour is never the sole carrier of meaning.** Every state colour distinguishes also carries text, an icon, or a shape — an accessibility invariant, and in a security product a safety one.

# What exists

All of the Approach, in the stylesheet's token block and applied through it.

The fourteen tokens resolve in both themes, and every rule reaches one of them — no rule names a hex value and none of the retired names survives anywhere in the interface. The primary button is the only filled accent-coloured element in the product; hover is a neutral overlay everywhere it appears, so hover, selection and focus are three visibly different things rather than one blue.

Every contrast pair was verified by computing WCAG 2.1 relative luminance rather than by eye: thirteen text pairs against 4.5:1 and three non-text pairs against 3:1, all passing in both themes, with the light `--ok` tightest at 5.03:1.

The change was seen in the real application, which is the check this kind of change actually answers to: a release build launched against a scratch profile renders every surface, and a harness run on the same build drove the interface from an empty install through establishing a password, adding a repository, sealing a file, and verifying the sealed file on disk as standard age.

# What is missing

Nothing on this plan.

# Steps

- [x] Survey established minimal palettes and the accent/primary distinction as the leaders in the field draw it, per [docs/UX_RESEARCH.md](../../../../../../docs/UX_RESEARCH.md).
- [x] Audit the fifteen live tokens against both themes and against the stated four-decision intent, separating load-bearing values from accumulation.
- [x] Solution the Approach from the research, and apply it across the stylesheet.

# Open threads

- **Whether `--accent` and `--primary` should stay the same value in light.** Both roles land on `#0d5bd1` there because the two contrast obligations converge on a white page. The tokens are separate regardless, since the role rule must not change per theme — but whether the primary action reads as sufficiently distinct from interactive text on light wants looking at once more surfaces exist in it.
- **Whether the checked file's name in the tree should carry `--accent` at all.** An accent repeated fifty times stops signalling, which is the excessive state's argument; a check icon with neutral text may be the better treatment. Best judged against a real tree, so it belongs to [manage-surface.md](manage-surface.md)'s build rather than here.
- The light `--ok` at 5.03:1 has the least headroom of any text pair in the palette and wants re-checking if the light background is ever darkened.
