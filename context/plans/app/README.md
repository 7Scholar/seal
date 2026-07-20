# Intent

## What & why

Local codebases hold files whose contents are sensitive — `.env` files, but also other config files — and those files fall into two classes.

The first class is files that can simply stay in the open — like dev-environment `.env` files, where the environment is a complete copy of production and AI agents are meant to work in it with full, unrestricted access. These need no protection; the codebase keeps its ordinary shape, with real files holding real, working values.

The second class is files that must also live in the codebase — because the workflows that need them (such as deploying to production from the local machine via simple bash scripts, deliberately without git workflows or pipelines) run locally — but whose contents may never be readable at rest. These files keep their natural place and form: a `.env.production` sits where it always would, its existence and name plainly visible, but its contents cannot be read by anyone or anything on the machine. Contents are only resolved into plaintext at the moment something legitimately asks for them. The working assumption is that an AI agent can work its way around anything stored on the machine: any file, any credential store, anything reachable by a process running as the user. So the barrier protecting this second class may not live on the machine at all — it is a password that exists only outside the local machine, in your head, provided interactively at the moment of resolution.

This concern is not scoped to one codebase, and not scoped to env files. It spans **all repos on the machine**: each repo has its own set of secret files, and those files may sit in any folder within it. Crucially, **the secret files remain owned by their respective repos** — they are the repo's files, living the repo's life. The application does not take them over or move them anywhere; its entire addition is to encrypt them and make them manageable through a UI. That UI-centered management is the reason this is an application at all — without it, an existing CLI tool like SOPS would have sufficed.

The solution takes the form of a **standalone application** — deliberately a **Tauri application** — that is the single home for this concern across all repos. The application **maintains a view over all the secret files**: every `.env` and other config file that holds secrets is known to it, and each is **tagged as encrypted or not** — the two classes are not an incidental property of files scattered around disk, but an explicit, managed distinction the application owns. It is therefore also **the place where the secrets are managed**: viewing and organizing these files — and, for file types that have a dedicated editing UI, editing their contents — happens in the application, across repos and across environments, through a UI that is a necessary part of the core from day one — not a later addition. And because protection is only useful if workflows still run, the application must also **expose APIs through which the protected files are resolved at runtime** — so that a bash deploy script, or anything else that legitimately needs a file's contents, can ask for them at the moment of use.

Three facts about that management are part of the intent, not open design. First, the scope of what can be managed is general by default: **any file** in a repo can be brought in and tagged as needing encryption or not — env files are the common case, never a boundary. Second, editing is deliberately narrow: **the application contains no general-purpose file editor**, and a managed file that is not an env file is stored and encrypted as-is, never edited in the app. Only env files — `.env` and every naming variation of it (`.env.production`, `.production.env`, `.env.local`, …) — are editable as of now, through a dedicated environment-variables UI with per-variable input fields, closely modeled on Vercel's environment-variables UX. If another file type ever becomes editable — a JSON file, say — it gets its own dedicated UI for that type, never a generic editor. Third, a repo enters the application through an **import flow**: the user points the application at a folder ("import this folder as a repo"), the application searches it for env files and other candidate secret files and presents what it found, and the user toggles each candidate on or off before confirming — the confirmed files become the managed secret files of that newly registered seal repo.

This is not an internal tool: the goal is a **complete, production-ready, standalone application, ready to be published to an open-source repository**. "Done" is therefore not a checklist fixed in advance — it means the application is done, and what that requires follows from the scope and architecture the design lands on. The scoping principle that governs that design: **determine what is necessary and user-friendly, and build exactly that to perfection** — a simple but robust application, complete within its deliberately-chosen bounds, rather than a sprawling one that is finished nowhere. And because it is aimed at open source, where strangers must be able to trust and change the code, **everything the application claims to do must be verifiable with tests** — verifiability by test is part of what "complete" means here, not an optional layer on top. And the responsibility does not end at the code: **everything around the code belongs to this concern and its plans too** — best coding practices held throughout, the documentation a stranger needs to understand and trust the project, the README with installation and getting started, and the rest of what publishing demands. Every senior developer knows that when an application is "done", a large chunk of work remains to make it available to the public and — most importantly — **maintainable**; here that chunk is planned work inside the tree, not an afterthought left for the end.

Why it matters: without this, the two things you want — giving agents total access to working local environments across all your repos, and keeping production-grade secrets available to local workflows — are mutually exclusive. This concern exists to make them coexist, with one application as the single place where all secret files across all repos are encrypted and managed.

## Approach

TBD.

# Plans

No child plans yet.

# Cursor

Freshly framed from the founding intent; no work started. Approach is TBD, so the next move is research and brainstorming of solution directions — never building. This is a large concern (scope assessment, [docs/plans/README.md](../../../docs/plans/README.md) section 1): the first working session should surface the major design forks it exposes as blocking questions in `QUESTIONS.md` here at the root, rather than carving deep or committing a design alone.

# Open threads

No open threads yet.
