# Questions

## The files list's empty state cannot currently be reached — should it become reachable, or be dropped?

[files.md](files.md) specifies an empty repository: *"A repository with nothing managed states that and offers the scan, rather than showing an empty list."* The interface implements it. **Nothing can reach it**, measured in the running application and confirmed in the code:

- Releasing a repository's **last** managed file deletes the repository outright (`lifecycle::release` drops a repo once `files.is_empty()`), so the user lands back on the repositories grid rather than on an empty files list. Driven: releasing both managed files bounced straight to the grid's empty state.
- The manage flow's confirm button is **disabled on an empty selection**, so a repository can never be adopted with zero files.
- A rescan only ever adds files, so it cannot empty a repository.
- `lifecycle::manage` — the only code path that creates a repository — has exactly one caller, the desktop command behind that disabled button.

So the state is **not reachable** in the audit's vocabulary, and the code implementing it is dead. That is a fork about what the product should do, not something to settle while building:

**Option A — make it reachable.** Stop deleting a repository when its last file is released, so a repository stays managed with nothing in it and the empty files list becomes a real screen. This treats "managed repository" as the thing the user adopted, independent of what is currently inside it. A user who releases every file keeps the repository in the grid and can rescan it from there.

**Option B — accept it as unreachable and drop the dead state.** A repository exists only as a non-empty set of managed files, which is what the code already does. The empty files list is removed, and `files.md` records the state as not reachable with the reason. A user who releases every file has, in effect, stopped managing the repository — which is arguably what they meant.

**Option C — something else**, for instance allowing an adopt with zero files so a user can claim a repository before choosing anything in it.

This matters beyond tidiness because the two options give opposite answers to a real user question: *"I released the last file — do I still manage this repository?"* Today the product answers "no" silently, without ever saying so.

**Answer:**

