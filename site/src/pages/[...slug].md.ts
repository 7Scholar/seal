import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));

const REPO_RENDERED: Record<string, string> = {
  "reference/security": "SECURITY.md",
  "reference/contributing": "CONTRIBUTING.md",
};

function stripFrontmatter(source: string) {
  return source.startsWith("---")
    ? source.slice(source.indexOf("\n---", 3) + 4).replace(/^\n+/, "")
    : source;
}

function stripImports(source: string) {
  return source.replace(/^import\s+.*?from\s+["'].*?["'];?\s*$/gm, "");
}

function slugOf(id: string) {
  return id.replace(/\.mdx?$/, "").replace(/(^|\/)index$/, "");
}

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await getCollection("docs");
  return docs
    .filter((entry) => slugOf(entry.id) !== "")
    .map((entry) => ({ params: { slug: slugOf(entry.id) } }));
};

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? "";
  const docs = await getCollection("docs");
  const entry = docs.find((d) => slugOf(d.id) === slug);

  if (!entry) return new Response("Not found", { status: 404 });

  const repoSource = REPO_RENDERED[slug];
  const body = repoSource
    ? readFileSync(root + repoSource, "utf8").replace(/^#\s+.*\n+/, "")
    : stripImports(stripFrontmatter(entry.body ?? ""));

  const title = entry.data.title;
  const description = entry.data.description ?? "";

  const markdown = [
    "> ## Documentation index",
    "> Fetch the complete documentation index at: https://7scholar.github.io/seal/llms.txt",
    "> Use this file to discover all available pages before exploring further.",
    "",
    `# ${title}`,
    "",
    ...(description ? [`> ${description}`, ""] : []),
    body.trim(),
    "",
  ].join("\n");

  return new Response(markdown, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
