import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";

const root = resolve(new URL("../", import.meta.url).pathname);
const dist = join(root, "site", "dist");
const base = "/seal";

const failures: string[] = [];

function fail(surface: string, source: string, target: string, detail: string) {
  failures.push(`${surface}: ${source}\n    → ${target}\n    ${detail}`);
}

function walk(dir: string, match: (path: string) => boolean): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...walk(path, match));
    else if (match(path)) found.push(path);
  }
  return found;
}

const EXTERNAL = /^(https?:|mailto:|tel:)/;

function isExternal(target: string) {
  return EXTERNAL.test(target);
}

function stripFragment(target: string) {
  const hash = target.indexOf("#");
  return hash === -1 ? target : target.slice(0, hash);
}

if (!existsSync(dist)) {
  console.error(
    "Site link check cannot run: site/dist is absent.\n" +
      "    Run `bun run build` in site/ first — the check reads the built output, not the sources.",
  );
  process.exit(1);
}

const builtPages = walk(dist, (p) => p.endsWith(".html")).filter(
  (p) => !p.includes("/pagefind/"),
);
const builtPaths = new Set<string>();
for (const page of builtPages) {
  const rel = "/" + relative(dist, page).split("/").join("/");
  builtPaths.add(base + rel);
  builtPaths.add(base + rel.replace(/\/index\.html$/, "/"));
  builtPaths.add(base + rel.replace(/\/index\.html$/, ""));
  builtPaths.add(base + rel.replace(/\.html$/, "/"));
  builtPaths.add(base + rel.replace(/\.html$/, ""));
}
for (const asset of walk(dist, () => true)) {
  builtPaths.add(base + "/" + relative(dist, asset).split("/").join("/"));
}

const HREF = /(?:href|src)="([^"]+)"/g;

for (const page of builtPages) {
  const html = readFileSync(page, "utf8");
  const source = relative(root, page);
  for (const [, raw] of html.matchAll(HREF)) {
    if (isExternal(raw) || raw.startsWith("#") || raw.startsWith("data:")) continue;
    const target = stripFragment(raw);
    if (target === "" || target === "/") continue;
    if (!target.startsWith("/")) continue;
    const normalised = target.endsWith("/") ? target : target;
    if (builtPaths.has(normalised) || builtPaths.has(normalised.replace(/\/$/, ""))) continue;
    fail(
      "built site",
      source,
      raw,
      "An internal link on the published site resolves to no page. A site that 404s its own navigation is worse than one that links out.",
    );
  }
}

const MD_LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

const repoMarkdown = walk(root, (p) => p.endsWith(".md"))
  .filter((p) => !p.includes("/site/"))
  .filter((p) => !p.includes("/target/"));

const stripCode = (text: string) =>
  text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");

for (const file of repoMarkdown) {
  const text = stripCode(readFileSync(file, "utf8"));
  const source = relative(root, file);
  for (const [, raw] of text.matchAll(MD_LINK)) {
    if (isExternal(raw) || raw.startsWith("#")) continue;
    const target = stripFragment(raw);
    if (target === "") continue;
    const resolved = target.startsWith("/")
      ? join(root, target)
      : resolve(dirname(file), target);
    if (existsSync(resolved)) continue;
    fail(
      "repository markdown",
      source,
      raw,
      "A relative link points at a file that does not exist. These are the links a reader follows on the git host.",
    );
  }
}

if (failures.length > 0) {
  console.error("Link checks failed:\n");
  for (const failure of failures) console.error(`  ✗ ${failure}\n`);
  process.exit(1);
}

console.log(
  `Link checks passed (${builtPages.length} built pages, ${repoMarkdown.length} markdown files).`,
);
