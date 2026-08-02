# The operations and where they belong

The companion to [shell-research.md](shell-research.md). That document researched the shell's shape; this one inventories **every operation the application can perform** and assigns each a home in that shape, with the flow it belongs to. It is the design input for the shell's information architecture.

Every operation below is backed by a command that already exists — the surface is the twenty-three registered commands, not a wish list. Nothing here proposes new capability; the design is entirely about **placement, grouping, and disclosure**.

# The four scopes

Operations sort by what they act on, and that sort is what decides where they live. This is the whole architecture in one table.

| Scope | Acts on | Lives in |
|---|---|---|
| **Session** | The whole application | The frame — present on every screen |
| **Registry** | The set of repositories | The sidebar's own footer/header |
| **Repository** | One repository | The detail surface for that repository |
| **File** | One managed file | The file's row, or the opened file's surface |

The rule that follows and governs every placement below: **an operation lives at the altitude of the thing it acts on.** Sealing acts on a file, so it never appears at the repository level; locking acts on the session, so it never appears on a file row. Where an operation appears to want two homes, that is a signal it is really two operations (see *bulk operations* under Open questions).

# Session scope — the frame

| Operation | Command | Disclosure | Notes |
|---|---|---|---|
| Unlock / establish | `unlock`, `establish`, `is_established` | **Full screen, always** | Not in the shell at all — it is the gate before the shell exists. Unchanged. |
| Lock now | `lock` | **Always visible, quiet** — in the title bar strip | Must be reachable from anywhere without hunting. The research's rule 1 applies: this is a consequence-bearing control, not an explanation, so it is never collapsed. Its home is the title bar strip, which is the frame's own band and therefore the one place a session-scoped control does not sit on a surface that answers for something else. |
| Change master password | `rekey_begin`, `rekey_run`, `rekey_abandon` | **Collapsed** — behind the session/settings affordance in the title bar strip | A rare, heavyweight operation. Belongs behind disclosure precisely because putting it on the surface invites accidental entry into a supervised flow. |
| Resume an unfinished password change | `rekey_status` | **Always visible when it exists, absent otherwise** | The exception that proves the rule. A half-done rekey is the dangerous state the whole operation is designed against, so its banner is not dismissible and not collapsible — but it renders nothing at all when there is nothing to resume. Chrome scales to the count, including to zero. |
| Acknowledge irreversibility | `has_acknowledged`, `acknowledge` | **Interposed once, never browsable** | Not an operation the user seeks out; a gate the first seal walks into. It has no home on any surface. |

**Flow — the session:** launch → gate (establish or unlock) → shell. Inside the shell the session is otherwise invisible except for the title bar strip's lock control and, when it exists, the resume banner at the top of the detail column. Locking returns to the gate with a notice.

# Registry scope — the sidebar

| Operation | Command | Disclosure | Notes |
|---|---|---|---|
| Add a folder as a repository | `pick_folder` → `scan_folder` → `manage` | **Always visible** | The only way anything enters the application. With an empty registry it *is* the whole screen; with a populated one it is a persistent control in the sidebar. Never collapsed — an application whose primary intake is hidden has failed. |
| See every repository | `overview` | **Always visible** | The sidebar itself. |
| See exposure across all repositories | derived from `overview` | **Always visible when non-zero** | The cross-repo alert. Its carrier is whichever element is present on every screen — the title bar strip, since the sidebar this table was written against is withdrawn ([navigation/](../navigation/README.md)). The requirement is unchanged: an alert about a repository the user is not currently looking at must still reach them. |

**Flow — adding a repository:** the add control → native folder dialog (cancel is a silent no-op) → scan → grouped candidate list (secret / ambiguous / template, only secrets preselected) → confirm → the repository appears in the sidebar and becomes selected. **Confirming encrypts nothing**, stated on the confirm step, alongside the statement that files do not move. The new repository being auto-selected is what closes the loop — the user lands in the place where the next action (sealing) lives.

# Repository scope — the detail surface

| Operation | Command | Disclosure | Notes |
|---|---|---|---|
| See this repository's files and their states | `overview` | **Always visible** | The detail surface's primary content. |
| Understand watched vs. protected | — | **Collapsed** — toggletip on the title | The distinction [protect-a-repo](../../../../../journeys/protect-a-repo.md) requires be obvious. Exactly the "title + info icon" pattern: explanation, not action, so it collapses. |
| See this repository's exposure | derived from `overview` | **Always visible when non-zero** | The alert, with its inline seal action. Never collapsed, never dismissible. |
| Add more files from this repository | `scan_folder` → `manage` (merges) | **Collapsed** — overflow | Re-scanning an existing repository merges rather than duplicates. Step 7 of the protect-a-repo journey. |
| Reveal the repository's location | — | **Always visible, de-emphasised** | The path under the name. Not an operation, but the thing that disambiguates two repositories with the same folder name. |
| Stop managing the repository | `release` per file | **Collapsed** — overflow, destructive grouping | Falls out of removing the last file, which removes the repository record. Whether this is offered as one operation is an open question below. |

**Flow — protect:** select repository → see files with states → seal the ones that need it (file scope) → the state tags update in place. The user never leaves the detail surface.

# File scope — the row, and the opened file

| Operation | Command | Disclosure | Notes |
|---|---|---|---|
| See a file's state | `overview` | **Always visible** | sealed / readable / not found — the established vocabulary. |
| Open a file | `open_file` | **Always visible** | The primary action on a row. Env files open the editor; everything else opens opaque. |
| Seal a file | `seal_warning` → `seal_file` | **Always visible where it applies** | Offered only on a readable file. Never collapsed: it is the product's core verb. |
| Stop managing a file | `release` | **Collapsed** — row overflow | Secondary, destructive, and the only operation that legitimately ends with plaintext at the path. Its on-disk consequence is stated in its dialog, never defaulted. |
| Close a file | `close_file` | **Always visible while open** | Discards the held plaintext. |
| Reveal one value | `reveal` | **Always visible per row, collapsed by nature** | The masked value *is* progressive disclosure applied to a secret — the canonical instance of the principle in this product. |
| Copy a revealed value | — | **Collapsed** — appears only once revealed | Gated on the value actually being revealed. |
| Edit / add / delete a variable | `save` | **Always visible in the editor** | The editor's primary purpose. |
| Understand a duplicate key or unparseable line | — | **Collapsed** — toggletip | Explanation of a preserved oddity, not an error. Prime toggletip material. |
| Understand the seal recency warning | `seal_warning` | **Interposed when it fires** | States what Seal cannot see — an editor's unsaved buffer — and the instruction that works. |

**Flow — use a secret:** select repository → open file → editor in the detail surface → reveal one row → edit → save (re-sealed from the plaintext held in Rust) → close. **Reveal is never an edit** and must never mark the file dirty.

# What the principle means, operationally

The product owner's principle — *only the most important UI is shown; everything else is collapsed but expandable* — resolves into three concrete rules once applied against this inventory:

1. **Explanation always collapses.** Every "why is this like this" is a toggletip. This is where the principle applies most and costs nothing.
2. **Secondary and destructive actions collapse into overflow.** Stop managing, rescan, change password. Collapsing these is not only tidiness — it puts distance between a reflex and a consequence.
3. **State, alerts, and primary verbs never collapse.** Seal, open, lock, add, the exposure alert, the resume banner. Hiding any of these would be the principle turned against the product.

The one-line test: **if the user needs it to avoid harm or to do the main thing, it is on the surface; if it explains or elaborates, it collapses.**

# Open questions this inventory surfaced

These are genuine design forks, not implementation details — each is raised in `QUESTIONS.md` rather than settled here.

- **Does the env editor take the detail surface or replace the window?** Keeping the sidebar preserves place and matches every surveyed product; replacing the window gives the editor's wide rows the whole width. The research recommends the detail surface, but this is the shell's defining choice and belongs to the user.
- **Is the sidebar repositories-only, or repository → file?** A two-level sidebar makes files navigable without selecting a repository first; a flat one keeps the sidebar quiet and puts files in the detail surface. This decides whether the shell is two-column or effectively three.
- **Are bulk operations offered — "seal everything readable in this repository"?** It is the operation a user with eight exposed files actually wants, and it is also a single click that encrypts eight files. Not currently a command; adding it is real scope.
- **Is "stop managing this repository" one operation, or only the consequence of releasing the last file?** The registry collapses an empty repository automatically, so the capability exists either way; whether it is *offered* as a single act is a design choice with a real safety dimension.
