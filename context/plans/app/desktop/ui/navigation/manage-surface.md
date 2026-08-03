Part of [the navigation plan](README.md).

# Scope

The **manage surface** — the screen a user meets when adding a repository or rescanning a known one — carried to the depth the repositories grid now has. It owns that surface's **layout, its chrome, and every state it can occupy**: how the surface fills the window, what stays fixed while the tree scrolls, and how the tree reads and responds as an object the user works with.

Out of scope, and deliberately: the **tree's contract**, which [repo-layer/adopting.md](../repo-layer/adopting.md) owns and which this node does not reopen — the row anatomy, the two visual channels, the folder-scoping invariant, computed expansion, and the assistive-technology model are settled and correct. This node changes how that contract is *presented and felt*, never what it guarantees. Also out of scope: what the scan returns ([repo-layer/scan-shape.md](../repo-layer/scan-shape.md)) and the words on the surface ([repo-layer/vocabulary.md](../repo-layer/vocabulary.md)).

# What & why

The product owner reviewed the running application and judged this surface **amateur — that it reads as a school project rather than a production interface**. That verdict is the input to this plan, and it is not a matter of taste: this is the screen a user meets at the exact moment they decide whether to trust Seal with a credential, and [adopting.md](../repo-layer/adopting.md) already states that it "decides whether the product reads as a layer". A surface that undermines confidence at that moment fails at its actual job, whatever its tree guarantees.

The owner named the standard directly: **a production interface in 2026 shows elegance and minimalism while still exposing every operation the surface's subject affords.** Those pull against each other on purpose — the failure mode on one side is a cluttered panel, on the other a surface so spare the user cannot act. The manage surface is currently neither elegant nor complete.

The owner named three faults and stated explicitly that **finding the rest is this plan's job rather than theirs** — the named ones are examples of a class, not the list.

**Fault 1 — the tree does not respond.** *"I can click on a folder and nothing happens."* This is a real defect, not a perception, and it is reproducible from the source: a row's click handler [FileTree.tsx:240-250](../../../../../../ui/components/FileTree.tsx#L240-L250) toggles selection of the candidates beneath a directory, but a directory containing **no** candidates computes `candidates.length === 0`, returns without acting, and is also `selectable: false`, so it draws no checkbox. Clicking such a folder anywhere except its twisty is inert — no expansion, no selection, no feedback. Since the tree draws the *whole* repository and expansion is deliberately narrow, most folders a user sees and clicks are exactly this kind. The user's mental model — *click a folder to open it* — is the one thing the surface refuses.

Whether the fix is click-to-expand, a hit target that reaches the twisty, or an explicit affordance is a design question this plan answers; that the current behaviour is wrong is not.

**Fault 2 — the surface does not fill the window.** `.manage` is `max-width: 72rem` centred with uniform padding ([styles.css:390](../../../../../../ui/styles.css#L390)), so on a real window the repository tree — the object the user came to work with — sits in a column with dead space beside it. The owner's words: *"things like not filling the screen are making it feel very amateuristic."*

**Fault 3 — the chrome scrolls away with the content.** The surface is one flowing block: heading, path, tree, then a `<footer>` in normal flow. So **Cancel and the confirm button scroll out of view**, and so does the repository being added. On any repository whose tree is longer than the window — which is every real one — the user loses both the primary action and the statement of what they are acting on. The confirm button carries the selection count, which is the surface's blast-radius statement; scrolling it away is worse than cosmetic. **The repository identity belongs in a fixed header and the two actions in a fixed footer**, with only the tree scrolling between them.

Why this is one plan and not a batch of tweaks: the three named faults share a cause. The surface was built as a document that flows rather than as an **application surface with a fixed frame and one scrolling region**, and each fault is that decision surfacing somewhere different. Fixing them individually would leave the cause in place.

# Approach

TBD.

The design is not settled and must not be guessed at. Two things constrain it and are recorded now so the research does not have to rediscover them:

- **The wheel is not to be reinvented.** The owner was explicit that established prior art exists for this pattern and is to be found and followed. This surface is a two-pane-adjacent file-tree picker with a fixed action bar — a shape with abundant, mature prior art. [docs/UX_RESEARCH.md](../../../../../../docs/UX_RESEARCH.md) governs how that research runs and is a prerequisite to committing an Approach; its **Building against a reference** rules bind any screenshot or named product that comes out of it.
- **The named faults are examples, not the specification.** The owner asked to be told what is wrong rather than to enumerate it. So the audit step below is not optional groundwork — it *is* the first deliverable, and a plan that fixes only the three named faults has misread the request.

# What exists

The surface's behaviour, at [ManageFlow.tsx](../../../../../../ui/screens/ManageFlow.tsx) over the tree primitive at [FileTree.tsx](../../../../../../ui/components/FileTree.tsx). The tree's contract is implemented and verified, and this plan does not disturb it.

What does not exist is any layout beyond a centred flowing column, any fixed chrome, any state other than populated-with-candidates, and any response to clicking a folder that holds no candidates.

# What is missing

Everything in the Approach, which is `TBD`. Known before research begins, and to be treated as a floor rather than the list:

- A layout that uses the window, with the tree as the surface's scrolling region.
- Fixed chrome: the repository under management as a header, the two actions as a footer.
- A folder row that responds to being clicked.
- **The state enumeration this surface never received.** The [surface audit](_docs/surface-audit.md) covered the four navigation surfaces and stopped there, so the manage surface has never been audited — and the state work in [states.md](states.md) does not reach it either. Its scan-in-progress state, its scan-failure state, its already-fully-managed state and its enormous-repository state are all unexamined; the empty case is a single grey sentence (`manage__empty`) beside a tree, which is the same language mismatch [states.md](states.md) records as R2 and R6 on the grid.

# Steps

- [ ] Audit the surface against the running application, per [SURFACE_AUDIT.md](../../../../../../docs/plans/SURFACE_AUDIT.md) — every state, every interaction, the full finding set the owner asked for rather than the three named faults.
- [ ] Research the prior art for a tree-picker surface with fixed chrome, per [docs/UX_RESEARCH.md](../../../../../../docs/UX_RESEARCH.md), and produce the design input.
- [ ] Solution the Approach from the audit and the research, and raise any genuine fork in `QUESTIONS.md` rather than settling it in the build.

# Open threads

- Whether the inert-folder fix is click-to-expand or something else interacts with a settled rule: [adopting.md](../repo-layer/adopting.md) fixes that **expansion and selection stay separate**, with its reason sharpened for this surface — conflating them means browsing a branch can queue files for encryption. A row click that expands is *not* a violation, since expansion is not selection; a row click that selects on a folder already exists. The design must state which act a bare row click performs and must not make browsing select.
- The tree's filter/search thread in [adopting.md](../repo-layer/adopting.md) is adjacent to this work. If the audit finds that locating a known file among collapsed branches is the surface's real friction, that thread and this plan should be settled together rather than separately.
