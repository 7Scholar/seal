# Things only you can do

This file holds the things an agent cannot do for itself and needs from you. It is a **question-and-answer sheet**: each item has a question, the context you need to answer it, and an empty `**Answer:**` slot.

**How to use it.** Do the items whenever you have time, in any order — nothing here is waiting on anything else unless it says so. Write your answer under the item's `**Answer:**` line, in plain prose; you do not need to be precise or technical. Then tell an agent *"I've done things in FOR-JORIS.md"* and it will read this file, act on what you wrote, and delete the items it has consumed.

**Nothing in here blocks work from continuing.** Agents keep going without these; the items are things that either unlock a step or settle a decision that is genuinely yours rather than theirs.

An item marked **Blocking** means some specific piece of work is stopped until you answer. An item marked **Not blocking** is a decision an agent has already made a reasonable call on, recorded, and moved past — your answer either confirms it or reverses it.

---

## 1. Enable GitHub Pages so the documentation site can publish — **Blocking (the site only)**

The documentation site is built and its deploy workflow is committed at [.github/workflows/site.yml](.github/workflows/site.yml). It cannot publish until Pages is switched on for the repository, which is a setting rather than anything in the code.

**What to do:** in the repository on GitHub, go to **Settings → Pages**, and under **Build and deployment** set **Source** to **GitHub Actions**. Nothing else. Then push to `main` (or re-run the `site` workflow) and it will deploy.

**The question:** did that work, and what URL did it land on? The site is currently built assuming `https://7scholar.github.io/seal/`. If it publishes somewhere else — a different org name, or you attach a custom domain — the agent needs to know, because the `base` path is baked into the build and every internal link.

**Answer:**

---

## 2. Is the repository actually going to be public, and under which account? — **Not blocking**

Everything published assumes the repository is `github.com/7scholar/seal` and that it will be public. That assumption is now baked into real, user-facing strings: the Homebrew tap `7scholar/tap/seal`, the installer `curl` URL, the site's base path, and the "edit this page" links on every site page.

Nobody has confirmed it. If the account name is different, or this ends up somewhere else, several published commands are wrong in a way a stranger would hit immediately.

**The question:** is `7scholar/seal` right, and is it public (or going to be)?

**Answer:**

---

## 3. The palette, seen with your own eyes — **Not blocking**

The palette is chosen, applied and verified: every contrast pair computed against the accessibility floor and passing in both light and dark, and the whole application driven end to end. But **contrast maths is not taste**, and this is your product's identity.

Two specific things an agent decided that you might feel differently about:

- **In the light theme, the accent and the primary resolve to the same blue** (`#0d5bd1`). In dark they differ (`#6ea8fe` accent, `#3b82f6` primary). That is because on a white page the blue dark enough to fill a button is also the right blue for interactive text, so the two obligations converge. It is defensible, but it means on light there is less visible difference between "this is a link" and "this is the main action" than on dark.
- **Hover is now a neutral grey overlay everywhere**, not a blue tint. That was deliberate — it makes hover, selection and focus three visibly different things instead of three uses of the same blue — but it does make the interface feel calmer and less reactive than it did.

Run the app (`bun run update-local` then `seal open`, or see [docs/RUNNING.md](docs/RUNNING.md)) and switch between light and dark with the theme control in the title bar.

**The question:** does it look right to you? Anything you want warmer, cooler, darker, more or less saturated? "It's fine" is a complete answer.

**Answer:**

---

## 4. Should a click on a folder row still select the files inside it? — **Not blocking, but it is a genuine fork**

This is the one place an agent deliberately did **not** follow its own research, and it should be your call rather than buried in a plan.

**Today:** clicking a folder row in the import tree selects the detected secret files beneath it. Clicking a folder that has no detected files opens it instead. (That second case was the bug you reported — it used to do nothing at all.)

**What the research recommends instead:** that clicking a folder row should *only* ever open it, and that selecting should require clicking the checkbox specifically. The reasoning is safety — a click that can queue a directory's secrets for encryption should require you to aim at a small target rather than land anywhere on a wide row. Every mature git client the research looked at (GitHub Desktop, GitKraken, Tower) works that way.

**Why it wasn't done:** it changes a documented behaviour with three tests asserting it, which is a deliberate design change rather than a bug fix — so it wanted your say-so, not an agent's.

**The trade-off in one line:** current behaviour is faster to use; the recommended behaviour is harder to do accidentally.

**The question:** leave it as is, or move all selection onto the checkbox?

**Answer:**

---

## 5. Do you have a Mac you are willing to leave alone for ten minutes at a time? — **Not blocking, but it affects how fast the rest goes**

The way this product proves it works is by **driving the real application** — a real window opens on the screen and operates itself for eight to ten minutes. It cannot be done headlessly, and if the window is touched, closed, or if the machine sleeps, the run fails.

Five of the six user journeys in [context/journeys/](context/journeys/README.md) are still unsatisfied, and satisfying them means running these drives repeatedly.

**The question:** is it fine for agents to run these (they will, on this machine, taking over the screen for ~10 minutes each), and is there a time of day that is better or worse? If you would rather they never run unattended, say so — the work can still proceed, it just gets verified more shallowly and takes longer.

**Answer:**

---

## 6. Screenshots — **Not blocking, but now unblocked and worth a decision**

The README and the documentation site both have **no screenshots**, which is a real gap for an application whose whole argument is that it is easier than a command-line tool. They were deliberately postponed because the interface was about to change; it has now changed and settled, so the reason for waiting is gone.

An agent can generate these automatically from the test harness, which guarantees a screenshot can never show a screen that does not exist. But it is worth knowing what you want to show.

**The question:** which screens do you actually want a stranger to see first? A reasonable default is the repository grid, the import tree, and the environment-variable editor — but say if you would rather lead with something else, or would rather have none at all until later.

**Answer:**

---

## 7. Windows — **Not blocking**

Seal currently targets macOS and Linux. Windows is unaddressed: no build, no install route, and the journeys have only ever been driven on macOS.

This is recorded as an open thread in the publishing plan, and it is a significant amount of work rather than a small gap.

**The question:** does Windows matter for this project, and if so is it a "before it is published" thing or a "later" thing?

**Answer:**

---

## 8. Code signing — **Not blocking, and there is a real cost**

Seal has no Apple Developer identity. The consequence is stated honestly everywhere it needs to be: the command-line tool installs via Homebrew or a `curl` script (which work because those routes do not set macOS's quarantine flag), and the desktop application is **build-from-source only**, because an unsigned app bundle downloaded in a browser gets killed by macOS behind what looks like a malware accusation.

That is a genuine adoption barrier: most people will not build a desktop app from source.

Fixing it needs an Apple Developer Program membership — **$99/year** — after which signing and notarisation slot into the existing release workflow.

**The question:** do you want to take on a signing identity? If yes, an agent can prepare everything so it is a matter of adding secrets to the repository when you have the account.

**Answer:**

---

## When you have done some of these

Tell an agent: *"I've answered things in FOR-JORIS.md."*

It will read this file, act on your answers, remove the items it has finished with, and leave the rest. You do not need to tidy anything up yourself.
