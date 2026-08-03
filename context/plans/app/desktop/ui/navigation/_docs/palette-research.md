# UX research: a minimal colour palette, and the accent-versus-primary distinction

Produced by following [the research procedure](../../../../../../../docs/UX_RESEARCH.md). This document is the design input for [the palette plan](../palette.md). It consumes the token mechanism [shape.md](../shape.md) built and the two-theme resolution [theme.md](../theme.md) ships; it decides what the tokens are set to and what each one is for, and it re-plumbs nothing.

# Concern

The product owner asked for a proper style set throughout the application and specified its character rather than leaving it open: **minimal — a shade of white, a shade of black, one accent, one primary, applied consistently everywhere** — and stated that established practice should be followed rather than a palette invented. The concern is therefore not "what colours are nice" but **which small set of deliberate values the whole interface draws from, and the rule that decides which one a given surface reaches for**.

The central question the research must settle is the one the specification itself raises: the owner named **accent** and **primary** as two distinct things. The interface has one `--accent`, and it carries the filled primary button, the focus ring, hover borders, the selected-row treatment, the tick in the switcher, and the checked file's name in the tree. Six roles on one value. Whether mature design systems draw a real accent/primary distinction, and what each owns if they do, is what the synthesis has to answer concretely enough that a future surface picks correctly rather than by eye.

The state being corrected is specific: the token values are the ones the first screens happened to be built with, tokenised faithfully in place. The mechanism is deliberate; the values were never chosen.

## Constraints this palette cannot design around

- **Minimal is the specification, not a starting position.** The direction is toward fewer deliberate values, not a richer scale. Every token a proposal keeps must earn its place, and every token it adds must be argued for individually.
- **Both themes are first-class.** [theme.md](../theme.md) ships light, dark and system, and system is the default. A palette is not chosen in dark and derived for light. [shape.md](../shape.md) already recorded that a shadow tuned for dark is invisible on light and a shadow tuned for light is a smudge on dark; that holds for the whole palette, and it is why each theme's values are authored rather than computed from the other's.
- **Contrast minimums are a filter, not a finishing pass.** WCAG 2.1 AA: 4.5:1 for body text, 3:1 for large text and for non-text UI component boundaries and state indicators. A candidate that fails at text sizes is rejected, not nudged afterward.
- **This is a security product.** The interface reports whether a user's secrets are encrypted or exposed. Danger must be unmistakable and must never be the only channel carrying that meaning, and the palette must not read as playful.
- **The family it must mirror.** [shape.md](../shape.md)'s four radii and its two elevation levels — a raised surface with a border and no shadow, a floating surface with a tokenised shadow — plus the surfaces [navigation-research.md](navigation-research.md) specified: the breadcrumb strip, the repository grid, the switcher popovers with their checkmarked current item, and the exposure alert that is resolved rather than dismissed.

# Sources surveyed

**Radix Colors** is the reference implementation for semantic colour scales, and it is the source that most directly answers this plan's question. Its twelve steps are not lightness gradations but **named jobs**: step 1 app background, step 2 subtle background, steps 3/4/5 UI element background in normal, hovered and active-or-selected states, steps 6/7/8 borders — subtle separators, then "UI element border and focus rings", then hovered borders — steps 9/10 solid backgrounds and their hover, and steps 11/12 low- and high-contrast text. Two properties are load-bearing here. **Step 9 is the purest step of the scale**, carrying the highest chroma and the least white or black, and it is the fill of a solid button. **Steps 11 and 12 are the text steps**, guaranteed to Lc 60 and Lc 90 APCA against step 2. The scale therefore already separates *the colour you fill a button with* from *the colour you set text in* — they are different steps of the same hue, not one value used twice. Radix also recommends pairing one accent scale with a gray, rather than running several accents.

**Material 3** draws the accent-versus-primary distinction explicitly, and its vocabulary is the closest match to the owner's wording. Primary is "used for key components across the UI, such as the FAB, prominent buttons, and active states". Secondary is "used for less prominent components in the UI, such as filter chips". Tertiary is for "contrasting accents that can be used to balance primary and secondary colors or bring heightened attention to an element", and is explicitly left "for makers to use at their discretion" to support broader colour expression. The structural finding is that M3 calls primary, secondary and tertiary collectively **accent colour roles** — so in M3 "accent" is the *category* and "primary" is the *most prominent member of it*, which is a hierarchy of prominence, not two unrelated colours. M3 also pairs each with an `on-` role (on-primary) whose only job is legibility of content placed on that fill.

**GitHub Primer** is the strongest counter-model, and the one closest to this product's register. Primer has **no brand-primary token in its functional colour set at all**. Its semantic roles are accent, success, danger, attention, plus the status roles, and `accent` owns "links, selected, active, and focus states, and neutral information" — precisely the cluster this interface's `--accent` currently carries minus the button fill, which Primer handles through button component tokens layered on the same accent hue (`#0969da`). Primer states the discipline directly: functional tokens are preferred over component-specific ones, which stay limited. On themes, Primer authors light and dark separately with the neutral scales inverted, so both share functional tokens without per-theme overrides — the same posture [theme.md](../theme.md) already took.

**Vercel's Geist** is the most aggressive minimal palette among serious products, and it validates the owner's instruction as achievable rather than merely aspirational. It runs a near-white `#fafafa` page, a near-black `#171717` ink, and one gray ramp where every divider, border and disabled state sits on a deliberate step — with a single blue `#0070f3` reserved for links and informational use and a single error red. Its stated philosophy is the finding worth carrying: **there is no marketing accent because the ink is the brand**, and solid accent colour is kept for state and for the single most important action on a view. The premium impression comes from consistency applied to a narrow palette, not from the palette being rich.

**Shopify Polaris** supplies the semantic discipline for a dense, information-heavy admin surface. Its admin deliberately runs a black-and-white scheme as a neutral backdrop, so that elements which do carry colour gain heightened visual impact — colour as a scarce resource whose scarcity is what makes it legible. Its semantic assignments are fixed and non-negotiable: red is critical, green positive, blue interactive, yellow attention, orange warning. Polaris is also explicit that colour with semantic meaning must not be spent decoratively.

**Linear** is the peer whose register this product should sit closest to. It runs a near-monochrome grey interface with one sharp accent (`#5e6ad2`) reserved for interactive states, status indicators and subtle highlights. Its character comes from restraint; monochrome palettes derive contrast from lightness variation rather than competing hues, which is what keeps a dense information surface calm.

**Apple's Human Interface Guidelines** governs because this is a macOS-first desktop app. Semantic, dynamic system colours (`labelColor`, `controlColor`, `separator`) are defined by purpose rather than by appearance or value, and adapt automatically across appearances — the same semantic-token posture [shape.md](../shape.md) adopted. HIG directs designers to supply explicit bright and dim variants per appearance rather than hard-coding values or letting a colour fail to adapt. On contrast, HIG asks for a minimum of 4.5:1 in all appearances and recommends striving for 7:1 for custom foreground/background pairs, especially at small text. Two macOS specifics bind: the system accent colour is user-selectable, and when a user sets it to anything other than multicolour the system applies **their** chosen colour to relevant standard controls — so a custom accent will sit beside a user-chosen one on native chrome. And dark mode is not an inversion of light; each appearance is designed.

**WCAG 2.1 AA**, the accessibility floor, read normatively rather than from memory. **SC 1.4.3 Contrast (Minimum)**: text and images of text have a contrast ratio of at least 4.5:1, except large-scale text at 3:1, with large defined as 18pt or 14pt bold — approximately 24px and 18.5px in CSS — and exceptions for incidental text, inactive components and logotypes. **SC 1.4.11 Non-text Contrast**: 3:1 against adjacent colours for user interface components ("visual information required to identify user interface components and their states") and for graphical objects required to understand content, computed without rounding, so 2.999:1 fails. Two exemptions are load-bearing for this palette: **inactive/disabled components are exempt**, and a boundary is only required to meet 3:1 **when it is the sole means of identifying the control** — a component identified by its own text or icon does not need its border to clear 3:1. Hover effects are treated as supplemental and are not themselves required to meet 3:1.

**Colour in security-product interfaces.** The convergent guidance is that blue and grey carry trust, stability and professionalism, that overly bright or playful tones undermine perceived trustworthiness in this category, and that red should be reserved rather than spread — a red used for decoration is a red that cannot raise an alarm. Recommended palette width for the category is three to five colours total.

# Findings

## Tier 1 — table stakes

- **Neutrals carry the interface; colour is scarce.** Vercel, Linear, Polaris and Primer all run a near-monochrome base with colour reserved for action and state. This is the owner's "shade of white and shade of black" as the leaders actually implement it, and it is the single finding that most shapes the proposal.
- **Colour roles are semantic, never literal.** Radix, Primer, Polaris and HIG all name tokens by job rather than by value. [shape.md](../shape.md) already did this; the finding confirms the mechanism is right and only the values are in question.
- **The solid fill and the coloured text are different values of the same hue.** Radix's step 9 versus step 11 is the clearest statement, and it is the mechanism that resolves this plan's central question without adding a second hue.
- **Every theme is authored, not derived.** Primer inverts its neutral scales deliberately; HIG requires explicit per-appearance variants. Confirms [theme.md](../theme.md)'s posture and forecloses computing light from dark.
- **A fill needs a paired "on" colour whose only job is legibility.** M3's `on-primary`. The interface already has `--on-accent`; the finding is that it is correct and must be verified per theme.
- **Danger is red, success is green, and neither is spent decoratively.** Polaris's fixed assignments. In a security product this is a requirement rather than a convention.
- **Contrast is a filter applied to candidates.** 4.5:1 text, 3:1 non-text, verified per theme before a value is adopted.

## Tier 2 — strong, high-value

- **One accent hue paired with one neutral ramp.** Radix's explicit recommendation and Linear's practice. Gives the product an identity without a second hue to govern.
- **Separating the border that identifies a control from the border that merely separates content.** Radix splits these across steps 6/7/8, and WCAG 1.4.11 requires only the former to clear 3:1. This is the finding that resolves the one genuine contrast failure in the current palette without turning every divider into a heavy grey rule.
- **A tinted surface for state, distinct from the solid fill.** M3's `*-container`, Radix's steps 3–5. The selected row and the danger banner are tints, not fills, so text stays legible on them.
- **Blue as the interactive hue for this category.** Converges from three directions: Primer, Vercel and Linear all use it; the security-category guidance names it for trust; and it is macOS's own default accent, so it sits naturally beside native chrome.
- **Restraint is what reads as premium.** Vercel's stated philosophy, and the direct answer to the owner's "reads as amateur" judgement recorded in [palette.md](../palette.md).

## Tier 3 — out of scope, with reasons

- **A full 12-step scale per hue, in the Radix manner.** The mechanism is excellent and the semantics are worth stealing, but installing ~36 tokens contradicts "minimal is the specification". The proposal takes Radix's *step semantics* as the role rule and instantiates only the steps this interface actually draws.
- **M3's secondary and tertiary roles.** A third and fourth accent exists to support "broader colour expression" — explicitly a expressiveness feature. This product wants the opposite, and a tertiary hue in a security tool is decoration competing with the danger signal.
- **Following the user's macOS system accent colour.** Technically available and genuinely native, but it would let the OS repaint the product's identity — including, on some settings, painting the primary action red or pink, which in a product where red means *exposed* would be actively unsafe. Named so it is not re-proposed as a nativeness improvement.
- **A saturated-grey neutral tinted toward the accent hue** (Radix's `slate` with a blue accent). A real refinement, but it makes every neutral a second decision to maintain in two themes and the effect is nearly invisible at this interface's density. The neutrals stay hue-neutral.
- **`attention`/`warning` as a third status colour.** Polaris and Primer both carry yellow or orange. This interface's states are binary — a file is managed or exposed — and a third status colour would be a token with no current caller and would dilute the danger signal.
- **Colour-coded per-repository or per-file identity.** No source suggests it for this surface and it would spend the scarce colour budget on decoration.

# States

Colour is not a screen, so the states enumerated here are the states **each token must remain correct in** — the conditions under which a palette is discovered to have been chosen against one case only.

- **Empty.** The repository grid with no repositories, per [navigation-research.md](navigation-research.md), is a grid containing an add tile — the same visual language as the populated grid. In palette terms the empty surface is where the interface is *most* neutral and has the least colour on screen, so it is the state where the primary action is the only saturated thing visible. This is the first screen a new user sees and it must not read as unfinished: the add tile uses the same raised surface, the same line, and the same radius as a populated tile, with the primary action carrying the only fill.
- **One.** A single tile or row. No palette consequence beyond the empty case, but it is the state where a selected treatment is indistinguishable from a hover treatment if the two are the same value — which is exactly the failure the current single `--accent` produces.
- **Populated.** The ordinary case. The constraint is that with many rows on screen, the tinted selected surface must remain distinguishable from the hovered surface and from the plain raised surface at a glance, and the count of saturated elements must stay low enough that the primary action still reads as primary.
- **Excessive.** Many repositories or a long file tree. Colour's job here is scanability: if every row carries an accent-coloured element, the accent stops being a signal. The palette must survive a screen where the same token appears fifty times, which is the argument for the checked-file name in the tree not being the same value as the primary button.
- **Loading.** Skeleton or pending surfaces draw from the neutral ramp only — a loading state carries no accent, because nothing is yet actionable and colour would promise interactivity that is not there.
- **Error.** The danger token as text and as a tinted surface, never as the only channel: an error carries an icon and a text label as well as its colour, so that a red-blind user or a monochrome display loses none of the meaning. The destructive action is a filled danger button whose "on" colour clears 4.5:1.
- **Degraded / partial.** Some files sealed, some exposed. This is the state where the danger tint and the neutral raised surface appear in the same list, and the palette must keep them separable without either shouting — the exposure alert scales its chrome to the count, including zero, per [navigation-research.md](navigation-research.md).
- **Forbidden or unavailable.** Disabled controls. WCAG exempts inactive components from both contrast minimums, so a disabled control is drawn with muted text on the plain surface and no accent. The interface must still say *why* rather than silently disabling, so the explanation is text, not a colour.
- **Focused.** Not in the default list but mandatory here: every control is keyboard-reachable with a visible focus ring, and the ring must clear 3:1 against whatever surface it lands on — including on top of a filled primary button, which is the hardest case and the one usually missed.

# Best-practice rules

- **Every colour in the interface is a semantic token. No rule names a hex value.** Carried from [shape.md](../shape.md) unchanged.
- **A token is chosen by its job, never by how it looks.** If a surface needs a value that does not exist for its job, it gets a token — it does not borrow one whose colour happens to suit.
- **Both themes are authored. A value is not adopted until it is checked in both.**
- **Text pairs clear 4.5:1; UI component boundaries and state indicators clear 3:1.** Verified against the actual surface the element sits on, not against the page background, because a raised surface is a different backdrop from the page.
- **Colour is never the sole carrier of meaning.** Every state that colour distinguishes also carries text, an icon, or a shape. This is an accessibility invariant and, in a security product, a safety one.
- **The solid fill of an action and the colour of interactive text are different values.** One is a background, one is a foreground; they have different contrast obligations and cannot be the same number.
- **Red means exposed, and nothing else is red.** A red spent on decoration is a red that can no longer raise an alarm.
- **Hover is a neutral overlay; selection is an accent tint; focus is a ring.** Three distinct mechanisms, so the three states are never confused with one another.
- **The scarce colour is the point.** A surface that adds a saturated element must justify it against everything else on screen already competing for the same attention.
- **Disabled is muted neutral, never a faded accent.** A faded accent reads as a broken accent.

# Synthesis / proposal

## The answer to the accent-versus-primary question

**The distinction is real, it is standard, and the leaders draw it as a difference of role rather than a difference of hue.** Material 3 makes it explicit — primary, secondary and tertiary are collectively *accent roles*, with primary the most prominent member — so "accent" names a category and "primary" names the loudest thing in it. Radix makes the same split mechanically, in the same hue: step 9 is the solid fill, step 11 is the interactive text. Primer keeps a single `accent` covering links, selection, active and focus, and layers the button fill on top of the same hue through component tokens.

**The recommendation: two tokens, one hue.** `--primary` is the solid fill of the single most important action on a view. `--accent` is the interactive-and-selected signal everywhere else — focus rings, selection tints, the switcher tick, the checked file's name, interactive text. They are two steps of one blue, not two colours.

This is the right answer for three converging reasons. It honours the owner's naming of accent and primary as two things. It fixes the actual defect [palette.md](../palette.md) names — one value carrying six roles, so nothing stands out because everything does — because after the split exactly one element on any view carries `--primary` and it is unambiguously the primary action. And it costs **one net new token** rather than a second hue to govern in two themes, which is what "minimal is the specification" permits. A second *hue* is rejected: it would give the product two identities, and the security-category guidance is against spending a second saturated colour where blue already carries the interactive meaning.

The mechanical necessity is decisive on its own. `--primary` is a background that white or near-black ink sits on; `--accent` is a foreground that sits on the page. Those are opposite contrast obligations, and no single value satisfies both well in either theme — a blue dark enough for white text on a light page is too dark to read as text on that same page.

## The role rule

This is the part that stops the palette drifting apart the moment a new surface is built, which is how the current state arose. A future surface picks by answering, in order:

1. **Is it the single most important action on this view?** → `--primary` fill with `--on-primary` ink. At most one per view. If a view seems to need two, one of them is not primary.
2. **Is it interactive, selected, focused, or currently-active?** → `--accent`, as text, as a ring, or as `--selected` tint. Never as a large fill.
3. **Does it report danger, exposure, or destruction?** → `--danger` as text or `--danger-surface` as tint; `--danger` as fill only for a confirmed destructive action. Plus an icon and a label, always.
4. **Does it report success or a sealed/managed state?** → `--ok`, as text or icon only.
5. **Is it structural — a surface, a boundary, a label?** → the neutral ramp: `--bg`, `--raised`, `--line`, `--line-strong`, `--text`, `--muted`.
6. **None of the above?** → it is neutral. Colour is not the default.

## The palette

Two themes, authored independently, verified in both. All ratios below are computed WCAG 2.1 relative-luminance contrast, unrounded.

**Dark**

| Token | Value | Job |
| --- | --- | --- |
| `--bg` | `#0f0f12` | The shade of black. Page background. |
| `--raised` | `#17171b` | Raised surface: tiles, rows, alerts, toolbar. |
| `--line` | `#33333d` | Decorative separators and dividers. |
| `--line-strong` | `#66667a` | Boundaries that *identify* a control: input and field borders. |
| `--text` | `#eceef2` | The shade of white. Body text. |
| `--muted` | `#a0a3ad` | Secondary text, metadata, disabled. |
| `--accent` | `#6ea8fe` | Interactive text, focus ring, tick, checked file. |
| `--primary` | `#3b82f6` | The primary action's fill. |
| `--on-primary` | `#0f0f12` | Ink on the primary fill. |
| `--danger` | `#ff7b8a` | Exposure, error, destructive. |
| `--danger-surface` | `#311e23` | Danger tint behind text. |
| `--ok` | `#8fd06a` | Sealed, succeeded. |
| `--selected` | `rgba(110, 168, 254, 0.16)` | Selected-row tint. |
| `--hover` | `rgba(255, 255, 255, 0.05)` | Neutral hover overlay. |
| `--shadow` | `0 12px 40px rgba(0, 0, 0, 0.5)` | Floating elevation only. |

**Light**

| Token | Value | Job |
| --- | --- | --- |
| `--bg` | `#fafafa` | The shade of white. Page background. |
| `--raised` | `#ffffff` | Raised surface. |
| `--line` | `#e4e4e9` | Decorative separators. |
| `--line-strong` | `#8a8a95` | Control-identifying boundaries. |
| `--text` | `#17171b` | The shade of black. Body text. |
| `--muted` | `#5f6270` | Secondary text, metadata, disabled. |
| `--accent` | `#0d5bd1` | Interactive text, focus ring, tick, checked file. |
| `--primary` | `#0d5bd1` | The primary action's fill. |
| `--on-primary` | `#ffffff` | Ink on the primary fill. |
| `--danger` | `#c02434` | Exposure, error, destructive. |
| `--danger-surface` | `#fdeef1` | Danger tint behind text. |
| `--ok` | `#3d7a1d` | Sealed, succeeded. |
| `--selected` | `rgba(13, 91, 209, 0.12)` | Selected-row tint. |
| `--hover` | `rgba(0, 0, 0, 0.04)` | Neutral hover overlay. |
| `--shadow` | `0 12px 32px rgba(20, 20, 40, 0.16)` | Floating elevation only. |

**In light, `--accent` and `--primary` resolve to the same value, and that is deliberate rather than an oversight.** On a white page the blue that is dark enough to fill a button with white ink (6.11:1) is also the blue that reads correctly as interactive text (5.86:1 on `--bg`) — the two obligations converge. In dark they must diverge: `--accent` `#6ea8fe` is light enough to read as text on the page (7.92:1), while `--primary` `#3b82f6` is saturated enough to read as a *fill* with dark ink on it (5.20:1). The tokens stay separate in both themes because the **role rule** is what a surface consults, and the rule must not change per theme; that they coincide in one theme is a property of that theme's values, not a merge of the roles.

### Computed contrast, both themes

Every text-bearing pair, verified against the actual surface it sits on:

| Pair | Dark | Light | Floor | |
| --- | --- | --- | --- | --- |
| `--text` on `--bg` | 16.47:1 | 17.13:1 | 4.5 | pass |
| `--text` on `--raised` | 15.39:1 | 17.88:1 | 4.5 | pass |
| `--muted` on `--bg` | 7.60:1 | 5.80:1 | 4.5 | pass |
| `--muted` on `--raised` | 7.10:1 | 6.06:1 | 4.5 | pass |
| `--accent` as text on `--bg` | 7.92:1 | 5.86:1 | 4.5 | pass |
| `--accent` as text on `--raised` | 7.40:1 | 6.11:1 | 4.5 | pass |
| `--on-primary` on `--primary` | 5.20:1 | 6.11:1 | 4.5 | pass |
| `--danger` on `--bg` | 7.70:1 | 5.68:1 | 4.5 | pass |
| `--danger` on `--raised` | 7.19:1 | 5.93:1 | 4.5 | pass |
| `--danger` on `--danger-surface` | 6.30:1 | 5.27:1 | 4.5 | pass |
| `--text` on `--danger-surface` | 13.49:1 | 15.90:1 | 4.5 | pass |
| `--ok` on `--bg` | 10.39:1 | 5.03:1 | 4.5 | pass |
| `--text` on `--selected` | 12.89:1 | 13.50:1 | 4.5 | pass |

Non-text pairs against the 3:1 floor of SC 1.4.11:

| Pair | Dark | Light | Floor | |
| --- | --- | --- | --- | --- |
| `--accent` focus ring on `--bg` | 7.92:1 | 5.86:1 | 3.0 | pass |
| `--line-strong` on `--bg` | 3.41:1 | 3.27:1 | 3.0 | pass |
| `--line-strong` on `--raised` | 3.19:1 | 3.41:1 | 3.0 | pass |

Every proposed value clears its floor in both themes. Two verifications are worth stating because they are the ones usually skipped: `--muted` is checked against `--raised` as well as `--bg`, since metadata mostly sits on tiles rather than on the page; and `--danger` is checked against `--danger-surface`, since danger text on a danger tint is the pairing an alert actually draws.

### The one genuine failure in the current palette, and how it is resolved

The live `--line` is `#2e2e38` on dark, which is **1.34:1** against `--bg`, and `#dfdfe6` on light, which is **1.23:1**. Both fail 3:1 by a wide margin. Raising a single `--line` token to clear 3:1 would require roughly `#66667a` on dark and `#8a8a95` on light — values that turn every divider in the interface into a heavy grey rule and destroy exactly the calm the owner asked for.

The resolution is the Tier 2 finding, and it is what SC 1.4.11 actually requires rather than a relaxation of it: **split the token by obligation.** A boundary is only required to meet 3:1 when it is *the sole means of identifying a control*. A divider between two rows identifies nothing — the rows are identified by their own text — and is decorative, so `--line` stays subtle and is exempt. The border of a text input, where the border is the only thing saying "you may type here", must clear 3:1, and that is `--line-strong`. This is one net new token and it buys genuine conformance rather than a waiver. The proposed `--line` is lifted slightly in both themes (`#33333d` dark, `#e4e4e9` light) for legibility, but its job is separation, not identification.

### Load-bearing versus rounding-out

**Load-bearing** — the change is not worth making without these: the two neutrals (`--bg`, `--text`) and the raised surface, since they are every pixel the user looks at; the accent/primary split and its role rule, since that is the plan's central question and the source of the "nothing stands out" defect; `--danger` and `--danger-surface` at conforming contrast in both themes, since this is a security product; and the `--line`/`--line-strong` split, since it is the only outright accessibility failure in the current palette.

**Rounding-out** — real improvements that could be staged later under time pressure: the exact tuning of `--muted` (the current values already pass), the `--ok` green, and the shadow values, which [shape.md](../shape.md) already tuned per theme and which this plan carries forward unchanged.

### What is out of scope, carried forward

The full Radix scale, M3's secondary and tertiary roles, following the user's macOS system accent, hue-tinted neutrals, a third `attention` status colour, and per-repository colour identity — each with its reason recorded in Tier 3, so the build does not re-open them.

## The fifteen existing tokens, reconciled

| Token | Verdict | |
| --- | --- | --- |
| `--bg` | **Survives as deliberate.** | The shade of black/white the owner named. Retuned to `#0f0f12` / `#fafafa`. |
| `--panel` | **Collapses into `--raised`.** | Accumulation. Two tokens for one of [shape.md](../shape.md)'s two elevation levels — and in light they already resolve to the identical `#ffffff`, so one of them was never a distinct decision. [shape.md](../shape.md) specifies two levels: the page and the raised surface, with floating distinguished by shadow rather than by a third fill. |
| `--raised` | **Survives as deliberate.** | The raised elevation level. Absorbs `--panel`. |
| `--line` | **Survives, with its job narrowed.** | Decorative separation only. Its control-identifying duty moves to `--line-strong`, which is the one net new structural token. |
| `--text` | **Survives as deliberate.** | The shade of white/black. |
| `--muted` | **Survives as deliberate.** | Secondary text is a real hierarchy level and clears 4.5:1 in both themes, so it is not merely faded text. Also absorbs the disabled state, which needs no token of its own. |
| `--accent` | **Survives, with its job narrowed.** | Keeps focus ring, selection, tick, checked file, interactive text. Sheds the primary fill to `--primary`. |
| `--on-accent` | **Survives, renamed `--on-primary`.** | The M3 `on-` role. Its job is legibility on the fill, and after the split the fill is `--primary`, so the name follows the role. |
| `--danger` | **Survives as deliberate.** | Non-negotiable in a security product. |
| `--danger-bg` | **Survives, renamed `--danger-surface`.** | A tint is a different thing from a fill and both are needed; the rename says which it is, since `-bg` reads as a page background. |
| `--ok` | **Survives as deliberate.** | Sealed/succeeded is a state, not decoration. Retained as text and icon colour only. |
| `--field` | **Collapses into `--raised`.** | Accumulation. On light it already resolves to `#ffffff`, identical to `--panel` and `--raised`. An input is a raised surface; what identifies it as an input is its `--line-strong` border, which is where that work correctly belongs. |
| `--hover` | **Survives as deliberate.** | A neutral alpha overlay, deliberately not the accent — this is what keeps hover distinguishable from selection, which is half the "nothing stands out" defect. Alpha rather than a solid value so it composites correctly over both `--bg` and `--raised`. |
| `--selected` | **Survives as deliberate.** | The accent tint. Distinct from `--hover` (neutral) and from `--primary` (solid fill); the three-state separation is a stated rule. |
| `--shadow` | **Survives as deliberate.** | [shape.md](../shape.md)'s floating elevation, already tuned per theme for the exact reason this plan generalises. Carried forward unchanged. |

Net: fifteen tokens become fourteen. Three collapse (`--panel`, `--field` into `--raised`; `--on-accent` is a rename, not a removal), two are added (`--primary`, `--line-strong`), and two are renamed to state their job. Against the owner's four named decisions — a white, a black, an accent and a primary — those four are exactly `--bg`, `--text`, `--accent` and `--primary`; the remaining ten are the states and structure the interface cannot draw without, each argued individually above.

# Open threads

- **Whether `--accent` and `--primary` resolving to the same value in light is right, or whether light's primary should be a step darker than its accent** to preserve the visible two-token relationship across themes. Both pass contrast; the question is whether the primary action reads as sufficiently distinct from interactive text on a white page. It wants seeing at a real window size, and [theme.md](../theme.md) already logged the neighbouring question of whether the light accent wants a different hue rather than a darkened one.
- **The `--ok` green in light is the tightest value in the proposal at 5.03:1.** It passes, but it has the least headroom of any text pair and should be re-checked if the light background is ever darkened.
- **How this change is verified** remains open, as [palette.md](../palette.md) recorded: it repaints every surface at once, and some states from [states.md](../states.md) do not yet exist to be looked at. A per-theme screenshot pass over the surfaces that do exist is the minimum.
- **Sequencing against [manage-surface.md](../manage-surface.md) and [states.md](../states.md)** is still unsettled and is not this document's to settle. Landing the palette first means new surfaces are built in it; landing it last means it sweeps a settled interface.
- **Whether the checked file's name in the tree should carry `--accent` at all** at large file counts. The excessive state argues that an accent repeated fifty times stops signalling; a check icon plus neutral text may be the better treatment. Left to the build, where a real tree can be looked at.
