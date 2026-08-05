Part of [the navigation plan](README.md).

# Scope

The interface's **theme**: a light theme, a dark theme, a system-following default, the control that switches between them, and the persistence that makes a chosen theme survive quitting the application. Out of scope: the tokens themselves, which [shape.md](shape.md) owns — this plan resolves them, it does not define them.

# What & why

The interface is dark and only dark: `color-scheme: dark` with a dark palette, chosen when the first screens were built and never revisited. The product owner wants light, dark, and system, defaulting to system, with an explicit choice overriding it and **persisting between quitting the application**.

That last requirement is the whole of this plan's difficulty, and it is not obvious from the request. **The window deliberately persists nothing.** The webview's data store is memory-only ([shell.md](../../shell.md)), which is a security property rather than a default — it is what stops the interface from leaving anything about the user's secrets on disk. So `localStorage` does not survive a restart here, and the earlier research explicitly listed persisted interface state as foreclosed rather than merely unbuilt.

A theme preference therefore cannot live in the webview. It has to be stored by Rust, which makes this a change to the command surface rather than a stylesheet edit — and that is why it is a plan rather than a tweak.

# Approach

## Three modes, two themes

The **mode** is what the user chooses: `light`, `dark`, or `system`. The **theme** is what gets drawn: `light` or `dark`. In `system` mode the theme follows the operating system's own setting and changes with it live, without a restart; in the other two the theme is the mode.

`system` is the default, and it is the value a fresh install starts from.

## The theme is an attribute, and the tokens resolve from it

The resolved theme is written as a `data-theme` attribute on the document root, and the token block declares one set of values per theme. Nothing else in the stylesheet knows which theme is active — a rule that branches on the theme is a rule that will be wrong in one of them.

`color-scheme` is set to match, so the platform's own form controls, scrollbars and focus rings follow the interface rather than contradicting it.

The dark theme's values are the interface's existing palette unchanged, so the redesign does not silently retune the surface everyone has been looking at. The light theme is its counterpart: a near-white page, a white raised surface, a text colour that clears contrast against both, and the same accent hue darkened enough to stay legible on light — an accent tuned for a dark background fails contrast on a light one, which is the single most common way a retrofitted light theme goes wrong.

Danger and success keep their meaning across both themes, which means their *values* differ: the dark theme's muted danger surface would be invisible on a light page.

## Persistence goes through Rust, because the webview cannot hold it

Two commands: one reading the stored mode, one writing it. The mode is stored in the application's own configuration directory, beside the registry, as its own small file — not in the registry, because the registry is the user's managed state and a display preference has no business riding along with it or being reconciled against disk.

A missing, unreadable, or unrecognised stored value resolves to `system` rather than failing. This is a display preference: it must never be able to stop the application from starting, and a corrupt value is not worth an error dialog.

The mode is read once when the interface starts and applied before the first paint, so a user who chose light does not see a dark flash on every launch.

**The stored value is not a secret and is not covered by the session.** It is readable whether or not Seal is unlocked, and it is deliberately outside everything the wipe clears — a theme surviving a lock is correct, and a theme that reset itself on lock would be a bug.

## The control

A single control in the title bar's trailing group, beside Lock. It is a three-way choice rather than a toggle, because a toggle cannot express `system` — and `system` is the default, so a control that cannot reach it would strand every user who never changed it.

It is a single button rather than a disclosure: pressing it advances system → light → dark → system, and it carries the icon of the mode currently in force — a monitor, a sun, a moon — so the setting is legible without opening anything. Its accessible name states both halves of that, the mode now and the mode a press moves to, because an icon-only control that changes on activation is otherwise silent about what it will do. Three modes is short enough for a cycle to stay predictable; a longer list would want the menu back.

Choosing a mode applies it immediately and writes it; there is no confirmation and no save step, because it is instantly reversible and instantly visible.

# What exists

All of the Approach: the three modes, the two token sets, the live system following, the two commands with their storage, and the control in the strip.

The Rust side is covered by tests over the store: a round trip, the default on a missing file, and the fallback on a corrupt one.

# Steps

- [x] The two token sets, and the `data-theme` attribute they resolve from.
- [x] The Rust store with its read and write commands, defaulting on anything unreadable.
- [x] Reading the mode before first paint, and following the system setting live in `system` mode.
- [x] The switcher control in the title bar.
- [x] Tests: the store's round trip, its defaults, and the interface's mode resolution.

# Open threads

- Whether the light theme's accent wants to be a different hue rather than a darkened one. It clears contrast as it is; whether it *looks* like the same product in both themes is a judgement that wants seeing at a real window size.
