Part of [the publishing plan](README.md).

# Scope

The documents a stranger needs in order to trust the project, use it, and change it: the README, the security policy, the contribution guidance, and the licences. Out of scope: the plan tree, which documents the design and is governed by its own manual, and packaging instructions, which belong with `packaging.md`.

# Approach

Four documents, each answering a question a newcomer actually has.

**The README** answers *what is this and can I trust it*. It states what Seal does, how a sealed file is a standard age file so the recovery story does not depend on Seal existing, how to use both the application and the command-line tool, and — at length, without softening — what Seal does not protect against. The two absolute limits are stated as limits rather than as caveats: a forgotten password is unrecoverable, and sealing cannot reach backwards over an already-exposed secret.

Its installation section is the first thing after the status, because it is what a stranger came for. It gives the two one-command routes for the command-line tool, the source build for the application, and — as a named section rather than a footnote — what being unsigned actually means for the reader: that the install routes work because `curl`, `tar` and Homebrew do not set quarantine while a browser download does, and that Seal deliberately does not teach the `xattr` override. Every command in it is verified against a real run.

**Every command in the README is verified rather than believed.** The build and test instructions were run against a clean clone of the repository, which is what catches instructions that rot silently — and did catch one, since a gitignored lockfile would have left `bun install` unable to run at all.

**The security policy** states the threat model, names what is in scope and what is not, and gives a private reporting route. It is explicit that attacks requiring an adversary who can already read process memory during an unlocked session are out of scope by design, so a reporter is not left guessing whether the limit is a bug.

**The contributing guide** names the two conventions a newcomer would otherwise violate: that code carries no comments because the plans hold the explanation, and that **every load-bearing guard must be confirmed non-vacuous** by breaking it and watching the matching test fail. The second is stated with its reason — tests in this repository have passed with the code they guarded entirely removed — because a convention without its reason reads as ceremony and gets dropped.

**The licences** are both present, because the package manifests declare a dual MIT and Apache-2.0 licence and a declaration without the text is a false claim.

# What exists

All four, with the README's instructions verified against a clean clone.

Two operating procedures sit beside the README rather than inside it, because each is a thing you *do* rather than a thing you read once: [docs/RUNNING.md](../../../../docs/RUNNING.md) for launching and driving the application, and [docs/RELEASING.md](../../../../docs/RELEASING.md) for how a tag becomes an installable release — including the tap repository and the token that live outside this repository and cannot be created from within it.

# What is missing

Nothing on this plan.

# Steps

- [x] Bring the README up to date with the application, and verify every command it gives against a clean clone.
- [x] The security policy, with the threat model and a private reporting route.
- [x] The contributing guide, naming the conventions and their reasons.
- [x] Both licence texts, matching what the manifests declare.
- [x] The installation section, and the releasing procedure beside it.

# Open threads

- The README has no screenshots, which is a real gap for an application whose whole argument is that it is easier than a command-line tool. Worth adding once the interface is stable enough that images will not immediately go stale.
