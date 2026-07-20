# Intent

## What & why

The interface itself: everything the user sees and does. The cross-repo view of registered repos and their managed files with sealed or unsealed state, the import flow that scans a folder and presents candidates for confirmation, the environment-variables editor for env files, and the two flows whose behaviour the [desktop Approach](../README.md) fixes because they carry more weight than their screens suggest — the alert when a file that should be sealed is found in the clear, and the supervised master-password change. It is done when a user can do everything the root intent promises without needing to know that a command line exists.

## Approach

TBD. The behavioural constraints are already fixed by the [desktop Approach](../README.md): values masked with reveal per row, nothing secret retained in interface state, the unsealed-file alert insistent rather than dismissible, and the password change never left half-done. What remains is the interface design itself — layout, navigation, and the shape of each flow — which is best settled with something on screen rather than in prose.

# Plans

No child plans yet.

# Cursor

Freshly framed. Deliberately last: it depends on the shell, the commands, and the env parser existing, and its design benefits from being able to run the thing. Next once those land: sketch the cross-repo view and the import flow, then the editor.

# Open threads

- Whether the editor offers a bulk paste of a whole env file alongside per-variable editing. The hosted equivalents all do, and it is how a user migrates an existing file, but it interacts with duplicate keys and with what may cross the boundary.
