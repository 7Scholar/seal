Part of [the desktop plan](README.md).

# Scope

The command surface between the interface and Rust: which operations the interface may invoke, what each is permitted to return, and how blocking work is dispatched so the window never freezes. Out of scope: the state those commands read and write (`shell.md`) and the interface that calls them (`ui/`).

# What exists

Nothing implemented. The design is settled in the [desktop Approach](README.md).

# What is missing

Everything: the command set, the boundary rules about what may cross, and the dispatch of blocking work.

# Steps

- [ ] Define the command set: unlocking and ending a session, listing repos and managed files with their state, importing a repo, sealing a file, opening a file for editing, revealing one value, saving edits, running reconciliation, and changing the master password.
- [ ] Implement each command asynchronously with the blocking engine work moved off the interface thread, since a key derivation of several hundred milliseconds would otherwise visibly hang the window.
- [ ] Enforce the boundary rule in the shape of the commands themselves: opening a file returns structure with values masked, and only an explicit single-value reveal returns a secret, as raw bytes rather than serialised text.
- [ ] Configure capabilities so the interface is granted only the commands it needs, rather than a broad permission set.
- [ ] Tests: every command exercised against a real engine and registry; a command that would return a whole file's plaintext does not exist; blocking work does not run on the interface thread; and errors reaching the interface carry no secret material.

# Open threads

- Whether reveal should be rate-limited or bounded in number, so a compromised interface cannot walk a whole file one value at a time. The cost is a full derivation per file rather than per value, so it is cheap to consider once the interface exists.
