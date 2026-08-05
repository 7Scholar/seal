# Questions

## 1. How does an edit cross the boundary once it can be structural?

Today the interface sends `save` a list of `(key, value)` pairs, and the line model changes those values in place. Adding, deleting, renaming and reordering are changes to the *sequence of lines*, which that signature cannot express. There are two plausible directions, and they differ in where the byte-exactness guarantee lives.

- **A structural edit list.** The interface sends operations — set this value, insert a variable here, delete this one, rename this key, move this line — and the line model applies them to the sequence it parsed. Byte-exactness stays a property of the model: a line nothing touched is still emitted verbatim, by construction. The cost is that every verb is a new operation to design, apply and test, and the interface must express a user's session of changes as an ordered list that still makes sense when replayed.
- **A whole-document replacement.** The interface sends back the full set of variables in their intended order, and the model reconciles that against what it parsed — matching what it can, emitting what is new, dropping what is gone. Fewer concepts cross the boundary and any rearrangement is expressible. The cost is that byte-exactness stops being structural: preserving a comment's attachment to the variable beneath it, or an unparseable line's position, becomes reconciliation logic that must be right rather than a guarantee that holds because untouched lines were never re-rendered.

**Answer:**

## 2. What happens to the parts of a file that are not variables?

A real env file carries comments, blank lines separating groups, and occasionally lines that parse as nothing. The line model preserves all of it exactly, and the editor currently shows none of it — a user sees variables only, and the notice tells them unparseable lines are preserved untouched.

Once the interface can reorder and delete, that invisibility becomes a problem: a comment heading that labels a group of variables is attached to a position, and moving the variables out from under it silently changes what the file says.

- **Stay invisible and anchored.** Non-variable lines keep their positions and are never shown. Simplest, and the user's mental model stays "a list of variables" — but a heading can end up labelling the wrong group, and the interface cannot say so because it does not draw it.
- **Visible but not editable.** Comments and blank lines render as part of the sequence, so the user sees what moving a variable does, but they are still only editable by hand outside Seal.
- **Fully editable.** Comments become things the user writes, edits and positions, and grouping is a first-class idea in the interface. The most complete answer to "I stop writing env files by hand", and the largest.

**Answer:**

## 3. Does the surface get an explicit save, or does an edit commit as it is made?

The footer today has Cancel and Save, Save is enabled only when something is pending, and leaving with pending changes confirms first. That works when an edit is a value typed into a field. It fits less obviously once a verb is a *gesture* — deleting a row, dragging one into a new position — where holding the change as pending means the surface must draw a deleted row that is still there, and a moved row that has not moved on disk.

- **Keep the explicit save.** One consistent model, changes are reviewable before they land, and Cancel genuinely undoes everything. Deletions and moves must then have a pending representation on the surface.
- **Commit each operation immediately.** The surface always shows what the file actually contains, which is the honest reading for a product about knowing the state of your secrets — and it needs an undo, because a delete that lands instantly on a sealed file is a destructive act with no ceremony in front of it.
- **Split by verb.** Value edits stay pending under Save; structural verbs commit immediately with undo. Matches how each verb feels, at the cost of the surface having two rules a user has to learn.

**Answer:**

## 4. How much does a destructive edit weigh?

Deleting a variable from a sealed file destroys a secret that exists nowhere else — no backup, no history, and by this product's own design no recovery path. The root intent's own rule is that ceremony is reserved for consequences and routine reversible acts stay free of it, which makes this a real question rather than a default: a delete is exactly as irreversible as the file's state makes it.

- **A confirmation per delete**, naming the variable. Safe, and the thing that becomes tiresome first when a user is doing the cleanup pass this feature invites.
- **Undo within the session**, no confirmation. Reversible until the user leaves the file, which is where the pending-versus-immediate answer above starts to bite.
- **Weight it by what is lost** — free for a variable whose value is empty or one the user just created, ceremonious for a value that has been sealed.

**Answer:**

## 5. Is bulk entry part of this concern?

The stated end state is that environment variables stop being written by hand. The single most common way they are written by hand today is pasting a block of `KEY=value` lines — from a provider's dashboard, a colleague, or another file. A per-row create serves the person adding one variable; it does not serve the person setting up a new environment, who is the person most likely to give up and open the file in an editor instead.

Whether that belongs here, in a later child, or nowhere is a scope decision rather than a design one, and it changes how the surface's create affordance is shaped.

**Answer:**
