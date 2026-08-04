Questions live here only while open. Answer in prose under the slot; the next agent acts on it and removes the question.

## How should the documentation site be published, given GitHub Pages refuses a private repository on this plan?

The repository now has an origin (`github.com/7Scholar/seal`) and it is **private**. The site workflow ran on the first push: it built the site and passed its checks, then **failed at the deploy step**. Enabling Pages returns *"Your current plan does not support GitHub Pages for this repository"* — Pages for private repositories is not available on the organisation's current plan.

This is not a setting that can be toggled, so it needs a decision. The plausible directions:

- **Make the repository public.** The root intent already aims at *"ready to be published to an open-source repository"*, and the publishing tree is built around strangers installing and contributing, so this may simply be the intended end state arriving earlier than planned. It would publish the whole tree as it stands today — the code, the plan tree, and the `context/` documents — to anyone who looks.
- **Raise the organisation's plan** to one including Pages for private repositories, keeping the source closed for now and publishing the site regardless.
- **Host the site somewhere else** (Netlify, Cloudflare Pages, Vercel — all with free tiers that serve a static site from a private repository). This keeps the repository private without a plan change, at the cost of a second service in the release story and a workflow that no longer uses `actions/deploy-pages`.
- **Leave it unpublished for now**, treating the built-and-checked site as sufficient until the repository goes public on its own schedule.

Worth knowing before deciding: the site's configuration currently targets `https://7scholar.github.io` with a base path of `/seal`, so the first two options need no change at all, while the third changes both values and the deploy workflow.

**Answer:**
