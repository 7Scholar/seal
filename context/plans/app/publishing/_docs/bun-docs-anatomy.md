# Bun docs anatomy

The reference shell for [the site plan](../site.md), read off the live site rather than from description. The owner named Bun's documentation as the layout to match; this records what that layout actually is, so the parts adopted, adapted and excluded can each be pointed at something specific.

Bun's docs are **Mintlify** (Next.js + Tailwind). Config extracted from the RSC payload of `https://bun.com/docs/runtime/typescript`:

```json
"contextual": { "options": ["copy", "view", "claude", "mcp", "vscode"], "display": "header" }
```

## Header (`<header id="navbar">`)

- `z-30 fixed lg:sticky top-0 w-full`, height `h-14` (3.5rem), `max-w-8xl` inner, bottom hairline `border-b border-gray-100 dark:border-gray-800`, opaque background layer behind it.
- **Left** — logo `<a href="/docs">` with a `sr-only` "Bun home page", two `<img>` swapped by `block dark:hidden` / `hidden dark:block`, height `h-6`.
- **Middle** — `hidden lg:flex ... flex-1 justify-center`; a **button** (not an input) `id="search-bar-entry"`, `aria-label="Open search"`, `h-9`, `rounded-full`, `bg-gray-950/[0.03] dark:bg-white/[0.03]`, magnifier icon + "Search..." + a `⌘K` hint span. Opens a modal.
- **Right** — `topbar-right-container`: nav links (Bun has one, "Install Bun"), then the **theme trigger** `#theme-preference-menu-trigger`, a `w-[30px] h-[30px] rounded-full` button carrying *three* icon spans — `data-theme-preference-icon="system" | "light" | "dark"` — with CSS choosing which is visible from `data-theme-preference` on `<html>`. So it's a **3-state cycle/menu (system/light/dark)**, not a binary toggle.
- Mobile (`lg:hidden`): a search icon button and an ellipsis "More actions" button.
- An inline `<script>` in `<head>` sets `document.documentElement.setAttribute("data-theme-preference", v)` before paint — the standard no-flash pattern.

## Left sidebar

`<nav>` of groups. Each group: a `<div>` with an icon + `<h3><span>Get Started</span></h3>`, then a `<ul>` of `<li><a href="..."><span>Label</span></a></li>`. Active `<li>` carries `data-active` and the anchor uses `[[data-active]>&]:text-primary` — i.e. **the active state is set on the `li`, styled through the child**. Two levels max.

## Content area

`<div id="content-area" class="grow w-full mx-auto xl:w-[calc(100%-28rem)]">` — the `28rem` is sidebar + right TOC reserved.

`<header id="header">` holds:
- `<h1 id="page-title" class="text-3xl sm:text-4xl tracking-tight font-semibold">`
- **`<div id="page-context-menu">`** — floats right of the title via `ml-auto`, `@container/page-header` with `@[520px]/page-header:flex`; a **second copy** of the same menu renders below the description with the inverse `@[520px]/page-header:hidden`, so it drops under the title on narrow pages.
- then the frontmatter `description` as a `text-lg prose` paragraph.

Then `<div class="mdx-content prose prose-gray dark:prose-invert">` with `data-page-title` / `data-page-href`.

### The page-context-menu — the split button

Two buttons joined into one pill:
1. `#page-context-menu-button` — `rounded-l-xl px-3 py-1.5 border border-r-0`, copy icon + label **"Copy page"**. The label uses a `grid` with an invisible duplicate in the same cell so the button doesn't resize when the text swaps to "Copying...".
2. `aria-haspopup="menu"` — `rounded-r-xl border aspect-square h-[34px]`, a chevron `rotate-90`.

Menu items (labels + descriptions lifted verbatim from the locale table in the bundle):

| Label | Description | Action |
|---|---|---|
| Copy page | Copy page as Markdown for LLMs | fetch `<path>.md`, write to clipboard |
| View as Markdown | View this page as plain text | `window.open(`${BASE_PATH}${path}.md`, "_blank")` |
| Open in Claude | Ask questions about this page | `https://claude.ai/new?q=` + encoded ``Read from ${url}.md so I can ask questions about it.`` |
| Open in ChatGPT | Ask questions about this page | `https://chat.openai.com/?hints=search&q=` + encoded ``Read from ${url} so I can ask questions about it.`` (no `.md`) |
| Connect to Cursor | Install MCP Server on Cursor | `cursor://anysphere.cursor-deeplink/mcp/install?...` |
| Connect to VS Code | Install MCP Server on VS Code | vscode deeplink |

Note the URL is built from `window.location.href` with `hash` cleared, then `.md` appended.

### Menu item anatomy — the icon is framed, and it is the real mark

Read off the open menu rather than the bundle, because the framing is invisible in the markup's class names alone. Each item is `flex items-start`, `px-1.5 py-1.5`, `gap-1`, `rounded-xl`, 48px tall, with a 14px title over a smaller muted description.

The icon is **not a bare glyph**. It sits in its own box — `border`, `rounded-md`, `p-1.5`, measuring **30×30 with a 1px hairline and a 6px radius**, holding a **16px** glyph centred in it. That frame is what makes the icons read as deliberate rather than as loose marks beside text.

The glyphs themselves are **the real marks, not generic stand-ins**: *View as Markdown* is the **Markdown badge** (rounded rect enclosing `M` + a down arrow), and *Open in Claude* is the **Anthropic logo** (`viewBox="0 0 256 257"`, `<title>Anthropic</title>`, a filled burst) rather than a document page and a speech bubble. Items that open a new tab carry a small **↗ external-link arrow after the label**.

The panel around them: `p-1`, `rounded-2xl`, 1px hairline, min-width tracking the trigger, items separated only by their own hover fill.

### Landing tiles — the whole tile is the link

The four tiles on `/docs` are the reference for a card grid. Each is `rounded-2xl` with a **1px border at 10% white**, no shadow and no background change; the entire tile is wrapped in an `<a>` with `display: contents`, so **the whole surface is clickable**, not just a link inside it.

The state change on hover is two things at once, and only these two:

- the tile's **border becomes the primary accent** (`hover:border-primary`), and
- a footer line reading **"Get started with `<thing>`"** followed by a **→ arrow** changes from muted gray to **that same accent**, driven by `group-hover` on the tile rather than by hovering the line itself.

The background stays put. The CTA line sits below the description with a real gap (`mt-8`), which is what gives the tile its weight.

### The `.md` endpoint — the load-bearing primitive

`GET https://bun.com/docs/runtime/typescript.md` → **`content-type: text/markdown; charset=utf-8`**. Body is frontmatter-ish: an H1, a `>` blockquote description, then the source Markdown with fences. Prepended is a pointer block:

```
> ## Documentation Index
> Fetch the complete documentation index at: https://bun.com/docs/llms.txt
```

The same pointer is in the HTML as a `sr-only` `<blockquote data-agent-docs-index="true">`.

`GET /docs/llms.txt` → `# Bun` / `## Docs` / a flat list of `- [Title](https://bun.com/docs/<path>.md): description`.

**Every one of the three buttons is downstream of this one static artefact.** Copy fetches it, View opens it, Open in Claude passes its URL. Build `<page>.md` and the menu is three lines of client JS.

## Other observed details

- Right TOC: `<nav>` of anchors, `border-l pl-4` per item, active item swaps border + text to `--primary`.
- Prev/next footer: `flex gap-12 justify-between pt-10 border-t`.
- Code blocks: `rounded-2xl border`, floating copy button `absolute top-3 right-4`, `data-testid="copy-code-button"`.
- Fonts: heading `Inter Display Bold`; primary color `#ff73a8` (dark+light identical).
- Icons: lucide, rendered as CSS `mask-image` on a coloured box, not inline SVG.
