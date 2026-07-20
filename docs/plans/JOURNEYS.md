# Journeys — the user-facing axis

> **Load this when the work is a journey**: writing one, working one, or being told the product "feels unfinished," "looks amateurish," or "broke immediately." Journeys live in [context/journeys/](../../context/journeys/README.md), alongside the implementation tree rather than inside it. The plan system's background is [INSTRUCTIONS.md](INSTRUCTIONS.md).

## Why this axis exists

The implementation tree folds the product **as code**: a concern, its contract, its tests. That fold is correct and stays. But it has a blind spot that no amount of diligence inside it can close.

A plan is written from the inside out, so it is verified against **its own contract**. Every plan can be complete, every guard mutation-tested, every step `[x]` — and the product can still be unusable, because a person's path through it crosses many concerns and therefore belongs to none of them. Nobody is ever assigned to notice that a first-time user has nowhere to start.

That is not hypothetical. It is what happened here: the desktop application was marked complete with every child `[x]`, and the first person to open it was asked to unlock a vault that did not exist yet, then met a screen whose only button did nothing. Both defects sat *between* plans that were each individually correct.

**A journey is the missing axis: the product seen from outside, by someone who does not know how it is built.** It is not a re-slicing of the code concerns, and it does not own code. It states what a person is trying to do, what they meet at each step, and what "good" means for that path — and it holds the implementation tree to that standard.

## What a journey is, and is not

**Is:** an end-to-end path a real person takes, from their intent to their outcome. "I have just installed this and want to protect my first file." "One of my secrets is exposed and I need to fix it." Journeys are named from the user's goal, never from a screen or a module.

**Is not:** a plan. It has no steps to implement, carries no coverage, and never appears in a plan's **Plans** index. Code is folded as code; a journey is the standard that fold is judged against.

**Is not** a place to design components either. If a journey finds that a screen is missing, that is a finding routed into the implementation tree through intake — the journey states *what the user needs*, the plan decides *how it is built*.

## The relationship to plans, stated once

- A **plan** answers: does this concern satisfy its contract?
- A **journey** answers: can a person actually do this, and does it feel like a finished product?

A plan can be done while its journey is broken. **A journey being broken makes the product not done, regardless of plan status.** This is the whole point of the axis: it outranks plan completeness as a definition of finished.

## Writing a journey

Each journey is one file in `context/journeys/`, and has these sections:

1. **Who and why** — who is at this point, what they are trying to achieve, and what they already know. A first-time user knows nothing about the product's internals; say so, because it is the thing most often forgotten.
2. **The path** — the steps as the *user* experiences them, in order. Each step states what they do, what they should meet, and what they should understand afterwards. Written in plain language about the screen, never about the implementation.
3. **What good looks like** — the bar for this path. Concrete and checkable: what must never happen, what must be obvious without explanation, what a person must never be asked to know.
4. **Demonstration** — how this journey was last driven end to end in the real application, and what was observed. Not "the tests pass": what happened when someone did it. See **Demonstration is the proof**, below.
5. **Findings** — what driving it revealed. Each finding is either routed into the implementation tree (with the plan that took it) or open. A journey with open findings is not satisfied.

## Demonstration is the proof

**A journey is never satisfied by unit tests.** This is the rule the axis exists to enforce, and it is not negotiable.

Unit tests verify a component against its contract in a test environment. They cannot see that a button is dead, that a screen is unreachable, that a flow has no entry point, or that the runtime behaves differently from the test double. Here, a browser API that silently does nothing inside the application's webview was covered by passing tests, because the test environment implements it and the real one does not.

So a journey is satisfied only by **driving the real application**:

- **Automated, in continuous integration**, wherever the platform allows it. The journey harness launches the actual built application and drives it as a user would. A journey with an automated demonstration keeps working; one without it works once.
- **By hand, recorded in the Demonstration section**, where automation is genuinely unavailable. The record names the build, the steps taken, and what was seen — enough that a reader can tell it was actually done.

**Automated demonstration is the default and manual is the exception**, because a manual demonstration proves the past, not the present.

## The harness is code, and code is folded as code

A journey owns no code — but the **harness that drives it does**, and that harness is ordinary application code subject to the ordinary rules. It is framed in the implementation tree through intake, carries coverage, and rides the close-out protocol like anything else.

So "build the harness" does not mean build it here. It means **frame it as a plan first**, under the concern whose surface it drives, and build it there. `context/journeys/` states what the harness must do; the plan states how it is built and holds its coverage.

The same is true of every finding. A journey never grows code, a plan never states user experience, and the two meet at intake.

## Working a journey

1. **Read it whole first.** A journey is judged as a continuous experience; reading one step at a time reproduces exactly the blind spot the axis exists to close.
2. **Drive it in the real application before changing anything.** Build it, launch it, and walk the path as the user. Write down what actually happened, including what was confusing rather than only what was broken — the bar is "feels like a finished product," not "does not crash."
3. **Route every finding into the implementation tree** through intake ([INTAKE.md](INTAKE.md)). A finding that is a missing capability becomes a framed plan; a finding that is a defect goes to the plan that owns the code. **The journey never fixes code itself** — it is the standard, not the workshop.
4. **A finding that reveals a missing concern is the most valuable output of this axis**, and it is expected rather than exceptional. When a journey shows the product has no notion of something a user obviously needs, that is the axis doing its job: raise it as a new plan, not as a bug.

    Such a finding is usually **large**, and intake's rules then apply in full: frame it as a folder and raise its design forks as blocking questions rather than answering them silently. A missing concern that a journey surfaces has by definition never been designed, so it will carry forks — and a journey finding is not a licence to skip the question channel. **Expect to stop and ask** rather than to build straight through.
5. **Re-drive after the fixes land, and update the Demonstration.** A journey is satisfied only when it was driven, end to end, against a build containing the fixes.

## What "production-ready" means here

The implementation tree's bar is that every concern satisfies its contract. That is necessary and, as this project demonstrated, **not sufficient**.

The product is production-ready when **every journey is satisfied**: driven end to end in the real application, with no open findings, against a build anyone could install. Plan completeness is a prerequisite for that, never a substitute.
