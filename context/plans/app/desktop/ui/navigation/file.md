Part of [the navigation plan](README.md).

# Scope

The **file altitude**: the surface a managed file opens into, and how the environment-variables editor is re-homed onto it. Out of scope: the editor's own internals — the row list, the masking, the reveal contract, the save semantics — which [screens.md](../screens.md) owns unchanged.

# What & why

The bottom altitude. For an env file it is the per-variable editor the root intent names as the product's editing surface, modelled on Vercel's; for anything else it is the opaque statement, because Seal contains no general-purpose editor.

The editor already exists and is close to its reference. What changes is its **container**: it had a header with a Close button because it was a screen that replaced the window, and it is now an altitude the trail navigates out of.

# Approach

## The trail replaces the close button

Leaving a file is navigating up, which the trail already does. So the editor's own **Close** control is gone: two ways to leave one surface, one of which looks like dismissing a dialog, is exactly the ambiguity the routing model exists to remove.

What Close *did* beyond navigating still happens — navigating up from a file closes it through the same command, releasing the plaintext the session holds rather than merely hiding it ([breadcrumbs.md](breadcrumbs.md) owns that rule). The behaviour is preserved; only the control is gone.

**Seal and close** stays, because it is a verb with a consequence rather than a navigation control, and it is the action a user takes after editing a secret.

## The surface's header

The trail states which file is open, so the surface does not repeat it as a heading. The header carries what the trail cannot: the file's **path within its repository**, its **state**, and the operations that act on the file.

The unsaved-changes indicator and the save control keep their position at the foot of the list and their behaviour exactly — including that revealing a value is never an edit and never marks the file dirty, which is the defect [the interface memory](../MEMORY.md) records a comparable product shipping.

## The notices

The duplicate-key and unparseable-line notices stay. They are statements of fact about the file that affect what saving will do, which makes them state rather than the disallowed explanatory prose — the rule permits neither more nor less than that.

## A non-env file

Opens as a statement of what it is and what Seal does with it, with no editing surface. Unchanged from [screens.md](../screens.md) beyond losing its Close button for the same reason the editor did.

# What exists

All of the Approach: the editor re-homed with its internals untouched, the header carrying path and state, the close control removed with its close behaviour preserved on navigation, and the opaque surface.

Interface tests cover that navigating up from a file closes it, that the editor's reveal and save contracts are unchanged in the new container, and that a non-env file offers no editing surface.

The guard confirmed non-vacuous: navigating up without closing the file — leaving plaintext held in the session — fails 1.

# Steps

- [x] Re-home the editor, removing its Close control and preserving the close on navigation.
- [x] The header carrying the file's path, state and operations.
- [x] The opaque surface for a non-env file.
- [x] Tests, including that navigating up actually closes the file.

# Open threads

No open threads.
