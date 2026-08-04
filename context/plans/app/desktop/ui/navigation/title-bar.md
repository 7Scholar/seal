Part of [the navigation plan](README.md).

# Scope

The title bar as a **real window control surface**: dragging the window by it, double-clicking it to zoom, and the exclusion that keeps its own controls clickable. Out of scope: what the strip contains, which [breadcrumbs.md](breadcrumbs.md) and [theme.md](theme.md) own.

# What & why

The window is configured with an overlay title bar ([shell.md](../../shell.md)) so the interface can draw its own strip where the platform's title bar would be. That is what lets the trail and the session controls live there instead of costing a second horizontal band.

The cost of taking that space over is that the interface must supply what the platform's own title bar gave for free, and it did not. **The strip cannot drag the window and does not zoom on a double-click** — behaviour every desktop application has and whose absence reads as the window being broken rather than as a missing feature.

The markup carried `data-tauri-drag-region` on the header all along, which is exactly why this went unnoticed: the attribute is present, so the behaviour looks implemented. In its bare form it governs only direct presses of the header element itself, so every child covering the strip was dead to the pointer.

This is a **bug**, so it follows the bug arc: reproduce, diagnose, fix, confirm the reproduction is gone.

# Approach

## The reproduction

Pressing the strip and moving the pointer left the window where it was, and double-clicking it did nothing. Both were confirmed by a person driving the real window, before and after the fix, because the harness cannot reach this path at all (see **What exists**).

The framework's own drag-region decision was evaluated at four points in the strip — its bare surface, the spacer, the breadcrumb trail, and the current segment — and the shipped strip answered **true only for its own bare surface**, false for all three children. That located the cause; it did not demonstrate the symptom, and treating it as if it had is what let a broken build look verified.

## Dragging is decided in JavaScript by the attribute, not by CSS

The framework injects a script that walks the composed path of every mouse press and decides whether that press starts a drag. Two facts about that walk govern the whole design here, and both are the opposite of the obvious guess:

**The CSS app-region property has nothing to do with it.** It is not consulted, and this webview discards the declaration at parse time — measured: the rule does not survive into `cssRules` and reads back empty from `getComputedStyle`, in both a working and a broken build. Setting it is inert, which makes it worse than useless: it looks like the mechanism and silently is not.

**A bare attribute means the element itself only.** The attribute has three meanings — bare or `true` drags only on a direct press of that exact element, `deep` drags on a press anywhere in its subtree, and `false` blocks dragging. The strip therefore carries **`deep`**, because everything a user would press in it — the trail, the current segment, the empty space — is a child, and a bare attribute answers false for every one of them. A strip marked bare is the shipped defect above: technically marked, effectively dead.

**Interactive children need no exclusion, and must not be given one.** The same walk stops at the first clickable element it meets — a button, an input, a link, anything with a non-negative `tabindex` or an interactive role — and refuses the drag there. So every control in the strip already excludes itself by being a control, and the framework's `false` value is reserved for the rare non-interactive element that must not drag. Adding per-control exclusions is redundant, and expressing them in CSS is doubly so, since the property is inert.

## The window controls are positioned from Rust

The platform draws its close, minimise and zoom buttons at a fixed offset suited to a standard-height title bar, so in this interface's taller strip they sit visibly above centre. They are moved to the strip's centre at startup by shifting the three button views directly, with the horizontal inset derived from the vertical one — the relationship the platform itself uses between the window's corner and the button group.

This is deliberately **not** done with the framework's `trafficLightPosition` window option, which is inert here: it is read, and it does not reach an overlay-styled window created from configuration, so the vertical position it names is silently ignored. [MEMORY.md](MEMORY.md) records the measurement.

The strip's height therefore exists as a number in two places — the stylesheet that draws it and the Rust that centres against it — and a unit test fails the build when they disagree, naming the consequence, because the failure is otherwise invisible until someone looks at the corner of a running window.

**Only the raw-pointer cast is `unsafe`.** Turning the window handle into an `NSWindow` reference is a genuine unchecked promise and carries the keyword. The button calls around it — reading a frame, asking for a standard window button, setting an origin — are safe in the bindings this depends on, so they are written without it. The distinction is the point: `unsafe` marks where a reader must be careful, and spreading it over calls that do not need it spends the signal that makes the one real case visible. The compiler enforces this directly, since an unnecessary `unsafe` block is a warning and this build carries none.

This file's test also states its expectations as assertions rather than `expect()`, which the workspace denies outside test-only crates. The guard is unchanged in strength — a stylesheet with no grid rows, a first row not stated in `rem`, and a height that disagrees with `STRIP_HEIGHT` each fail it by name.

## Double-click to zoom

The same script handles it, on the same decision: a double press inside a drag region asks the window to toggle its maximised state, on this platform deferred to the release so a drag can cancel it. It follows from the region being correct rather than being separate work.

## What the strip must not do

It must not select text on a drag, and it must not show a text cursor: both make the strip feel like content rather than chrome. Its own labels are unselectable for that reason.

# What exists

All of the Approach. The strip drags the window from every part of it a user would press, double-clicks to zoom, and every interactive control in it remains clickable.

The window controls are centred against the strip, measured through the accessibility interface at 23.0px against the strip's 23.2px centre.

Three driven checks in `e2e/journeys/title-bar.e2e.ts` run against the real release binary: that dragging the strip moves the window, that the strip's controls are genuinely operable (the theme control is exercised end to end and its effect read back off the document), and that the strip's text is not selectable.

**The drag check cannot pass under the harness, and that is a property of the harness rather than a defect.** The framework's listener requires a real click count — it acts only when the press reports `detail` of 1 or 2 — and a synthesized WebDriver press arrives with `detail: 0` and `isTrusted: false`, so the listener rejects it before the drag region is ever considered. Measured directly. The consequence is that **the drag is confirmed by a person driving the real window**, and the automated check stands as the reproduction: it fails identically whether the drag is broken or merely undrivable, so it must never be read as proof that dragging works.

The earlier version of this check tested the framework's decision *function* over the element tree rather than the window's position. It passed against a build in which dragging did not work at all, which is exactly the failure the journeys axis exists to catch, and is why the check now measures `window.screenX` and `screenY` across a drag instead of reasoning about the markup.

# Steps

- [x] Reproduce the defect against the running window.
- [x] Mark the strip as a subtree drag region.
- [x] Confirm interactive children exclude themselves, and remove the inert CSS that appeared to do it.
- [x] Suppress text selection and the text cursor on the strip's own labels.
- [x] Centre the platform's window controls against the strip, with a test coupling the two heights.
- [x] Confirm the reproduction is gone by driving it again, and that every strip control still responds.
- [x] Settle this file's two housekeeping items: the seven unnecessary `unsafe` blocks are gone and the test's `expect()` calls are assertions, so `cargo clippy --workspace --all-targets` passes and the build carries no warnings.

# Open threads

- The drag itself has no automated coverage, because the harness's synthesized press carries no click count and the framework's listener refuses it. Closing this needs either a native event source driving a real mouse or a framework hook that reports the decision at press time; until then a person confirms it. The check in place fails whether the drag is broken or merely undrivable, so it must not be read as a pass.
- The window-control centring is verified through the accessibility interface rather than by looking at the window, since screen capture is unavailable in this environment. The numbers are exact, but nobody has machine-checked the rendering.
