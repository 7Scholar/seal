# Questions

Open questions blocking [shell-layout.md](shell-layout.md). Write your answer in prose under each `**Answer:**` slot. Answering in your own words is enough — you do not need to pick one of the listed options exactly, and "do what you think is best, because X matters most to me" is a valid answer.

---

## 1. When a file is opened for editing, does the sidebar stay?

Selecting a repository shows its files. Opening one of those files has to put the environment-variables editor somewhere, and there are two places it can go.

- **In the detail surface, beside the sidebar.** The sidebar stays visible, the user keeps their place, and switching to another repository is one click away. This is what every product surveyed does, and it is what the research recommends. The cost is that the editor's rows — variable name, masked value, reveal, copy, edit, delete — get the window minus the sidebar rather than the whole window.
- **Replacing the window, with a way back.** The editor gets the full width, which suits its wide rows. The cost is that editing becomes a mode the user leaves rather than a place they are, which is the shape the application has today and the one this work is replacing.

This is the shell's defining choice — nearly every other layout decision follows from it.

**Answer:**

---

## 2. Does the sidebar list only repositories, or repositories and their files?

- **Repositories only.** The sidebar is a quiet, short list; files live in the detail surface. Keeps the sidebar legible when a repository has thirty managed files, and keeps the two columns genuinely two.
- **Repositories expanding to their files.** A file is reachable in one click from anywhere without selecting its repository first, and the tree makes the whole managed set visible at once. The cost is a busier sidebar — and, because the window remembers nothing between launches, every launch starts with every repository in the same collapsed-or-expanded state rather than how the user left it.

Note this interacts with the disclosure principle in an interesting way: expanding a repository to see its files *is* progressive disclosure, so option two is arguably the principle applied to navigation itself.

**Answer:**

---

## 3. Is there a way to seal several files at once?

Today sealing is one file at a time. A user who has just imported a repository with eight secret files seals eight times.

- **No bulk operation.** Each seal is a deliberate act on a named file, which is consistent with how carefully the rest of the product treats irreversible actions.
- **Seal everything readable in this repository, as one action.** Much less tedious in exactly the moment the product is most useful — right after an import. The cost is that one click encrypts eight files, and the safety habits the rest of the interface builds are per-file.

This one is genuinely new capability rather than a placement decision: there is no command for it today, so answering yes adds real scope.

**Answer:**

---

## 4. How is removing a whole repository offered?

Removing the last managed file from a repository already removes the repository's record automatically, so the capability exists either way. The question is whether it is offered as a single act.

- **Only as the consequence of releasing files.** Nothing in the interface says "remove this repository"; it simply disappears when its last file is released. Safe, and never surprising.
- **As a single operation on the repository.** Honest about what the user actually wants to do, and it can state its consequences once instead of eight times. It is also a single control that stops Seal watching an entire repository, which wants care in how it is presented.

**Answer:**
