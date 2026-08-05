import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const SITE = "https://7scholar.github.io/seal";

const GROUPS: Array<{ label: string; prefix: string }> = [
  { label: "Get started", prefix: "get-started/" },
  { label: "Guides", prefix: "guides/" },
  { label: "Understand", prefix: "understand/" },
  { label: "Reference", prefix: "reference/" },
];

function slugOf(id: string) {
  return id.replace(/\.mdx?$/, "").replace(/(^|\/)index$/, "");
}

export const GET: APIRoute = async () => {
  const docs = await getCollection("docs");

  const lines: string[] = ["# Seal", ""];

  const landing = docs.find((d) => slugOf(d.id) === "");
  if (landing?.data.description) {
    lines.push(`> ${landing.data.description}`, "");
  }

  for (const group of GROUPS) {
    const entries = docs
      .filter((d) => slugOf(d.id).startsWith(group.prefix))
      .sort((a, b) => slugOf(a.id).localeCompare(slugOf(b.id)));
    if (entries.length === 0) continue;
    lines.push(`## ${group.label}`, "");
    for (const entry of entries) {
      const description = entry.data.description ? `: ${entry.data.description}` : "";
      lines.push(`- [${entry.data.title}](${SITE}/${slugOf(entry.id)}.md)${description}`);
    }
    lines.push("");
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
