# Intent

## What & why

Local codebases hold files whose contents are sensitive — `.env` files, but also other config files — and those files fall into two classes.

The first class is files that can simply stay in the open — like dev-environment `.env` files, where the environment is a complete copy of production and AI agents are meant to work in it with full, unrestricted access. These need no protection; the codebase keeps its ordinary shape, with real files holding real, working values.

The second class is files that must also live in the codebase — because the workflows that need them (such as deploying to production from the local machine via simple bash scripts, deliberately without git workflows or pipelines) run locally — but whose contents may never be readable at rest. These files keep their natural place and form: a `.env.production` sits where it always would, its existence and name plainly visible, but its contents cannot be read by anyone or anything on the machine. Contents are only resolved into plaintext at the moment something legitimately asks for them. The working assumption is that an AI agent can work its way around anything stored on the machine: any file, any credential store, anything reachable by a process running as the user. So the barrier protecting this second class may not live on the machine at all — it is a password that exists only outside the local machine, in your head, provided interactively at the moment of resolution.

This concern is not scoped to one codebase, and not scoped to env files. It spans **all repos on the machine**: each repo has its own set of secret files, and those files may sit in any folder within it. Crucially, **the secret files remain owned by their respective repos** — they are the repo's files, living the repo's life. The application does not take them over or move them anywhere; its entire addition is to encrypt them and make them manageable through a UI. That UI-centered management is the reason this is an application at all — without it, an existing CLI tool like SOPS would have sufficed.

The solution takes the form of a **standalone application** — deliberately a **Tauri application** — that is the single home for this concern across all repos. The application **maintains a view over all the secret files**: every `.env` and other config file that holds secrets is known to it, and each is **tagged as encrypted or not** — the two classes are not an incidental property of files scattered around disk, but an explicit, managed distinction the application owns. It is therefore also **the place where the secrets are managed**: viewing, editing, and organizing the contents of these files happens in the application, across repos and across environments, through a UI that is a necessary part of the core from day one — not a later addition. And because protection is only useful if workflows still run, the application must also **expose APIs through which the protected files are resolved at runtime** — so that a bash deploy script, or anything else that legitimately needs a file's contents, can ask for them at the moment of use.

This is not an internal tool: the goal is a **complete, production-ready, standalone application, ready to be published to an open-source repository**. "Done" is therefore not a checklist fixed in advance — it means the application is done, and what that requires follows from the scope and architecture the design lands on. The scoping principle that governs that design: **determine what is necessary and user-friendly, and build exactly that to perfection** — a simple but robust application, complete within its deliberately-chosen bounds, rather than a sprawling one that is finished nowhere. And because it is aimed at open source, where strangers must be able to trust and change the code, **everything the application claims to do must be verifiable with tests** — verifiability by test is part of what "complete" means here, not an optional layer on top.

Why it matters: without this, the two things you want — giving agents total access to working local environments across all your repos, and keeping production-grade secrets available to local workflows — are mutually exclusive. This concern exists to make them coexist, with one application as the single place where all secret files across all repos are encrypted and managed.

## Approach

TBD.

# Plans

No child plans yet.

# Cursor

Freshly framed from the founding intent; no work started. Approach is TBD, so the next move is research and brainstorming of solution directions — never building. This is a large concern (scope assessment, [docs/plans/README.md](../../../docs/plans/README.md) section 1): the first working session should surface the major design forks it exposes as blocking questions in `QUESTIONS.md` here at the root, rather than carving deep or committing a design alone.

# Open threads

No open threads yet.
