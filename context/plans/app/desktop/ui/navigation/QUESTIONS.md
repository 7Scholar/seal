# Questions

## Should a managed file be able to go from sealed back to readable, without leaving management?

**Raised:** 2026-08-05, from a product-owner request during a UI session.

**The request.** The owner asked for an action that makes a sealed file readable again while Seal keeps managing it. Their reasoning: the point of the product is that all env files across all repos are managed in one place, and today the only way to get a file back to readable is **Stop managing this file** — which ejects it from Seal entirely. So the one operation a person plausibly wants mid-workflow forces them out of the product that is supposed to be the single home for these files.

**Why this is not a UI tweak.** The product does not have this operation, deliberately, and the decision is stated in four places:

- [The root intent](../../../README.md): "the on-disk state moves from plaintext to sealed and never back, and the only action that legitimately ends with plaintext at the path is removing the file from management altogether."
- [engine/README.md](../../../engine/README.md): "The engine offers no operation that writes plaintext to a managed file's path... the class of accident where a user unseals a file to look at it and leaves production credentials sitting in a repository is not mitigated but structurally absent."
- [repositories.md](repositories.md): an *unseal* entry was considered for the repository menu and rejected by name, because "an entry labelled *unseal* would promise an operation the product does not have."
- The published site, [managing-files.md](../../../../../../site/src/content/docs/guides/managing-files.md): the same guarantee, stated to users.

Adding the operation therefore reverses a product decision, removes a guarantee the engine currently makes structurally rather than by discipline, and makes a published claim untrue. That is a design fork, so it is raised here rather than answered in a polish session.

**What is genuinely at stake.** The current rule buys one thing: a user cannot end up with production credentials sitting readable in a repository because they unsealed a file to look at something and forgot to re-seal it. That accident is impossible today by construction. Any version of this feature makes it possible again, and the question is whether the workflow gain is worth that.

Worth separating from the fork: **the owner's underlying complaint is partly a different defect, and that part is now fixed.** A readable managed file could not be opened at all — the app reported "Seal could not open this file" — so readable files were unmanageable in practice. They now open and edit like sealed ones. What remains unaddressed is only the sealed → readable direction.

**Directions, not a recommendation:**

1. **Keep the rule.** The workflow gap closes differently — the file is editable in Seal without ever being readable on disk, which is now true. A user who genuinely needs plaintext on disk stops managing the file, which is explicit about what it does.
2. **Add it as an explicit, ceremonious action** — named for what it does ("Make readable on disk"), gated like the irreversibility acknowledgement, and surfaced afterwards as an exposure alert so a file left readable is loud rather than silent. Costs: the engine gains a plaintext-writing operation, the guarantee moves from structural to procedural, and the site's claim needs rewording.
3. **Add it scoped to non-production files only** — some rule that distinguishes a `.env` from a `.env.production`. Cheap to state, hard to define, and probably a false comfort.

**Blocked on:** the owner choosing a direction. Nothing in the tree moves on this until then; the rest of the UI session's work landed independently of it.
