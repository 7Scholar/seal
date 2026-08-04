import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $ } from "@wdio/globals";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";
const LONG_NAME = `${"unreasonably-long-segment-".repeat(9)}name.env`;

const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";

const channels = () =>
  browser.execute(() => {
    const out: {
      kind: string;
      name: string;
      nameX: number;
      depth: number;
      reasonRight: number | null;
      rowHeight: number;
    }[] = [];
    for (const row of document.querySelectorAll(".tree__row")) {
      const name = row.querySelector(".tree__name") as HTMLElement | null;
      const reason = row.querySelector(".tree__reason") as HTMLElement | null;
      if (!name) continue;
      const pad = parseFloat(getComputedStyle(row as HTMLElement).paddingLeft);
      out.push({
        kind: (row as HTMLElement).dataset.kind ?? "",
        name: name.textContent ?? "",
        nameX: name.getBoundingClientRect().left,
        depth: Math.round((pad - 4.8) / 17.6),
        reasonRight: reason ? reason.getBoundingClientRect().right : null,
        rowHeight: row.getBoundingClientRect().height,
      });
    }
    return out;
  });

describe("the manage surface's two channels", () => {
  before(async () => {
    mkdirSync(repo(), { recursive: true });
    writeFileSync(join(repo(), ".env"), "A=1\n");
    writeFileSync(join(repo(), ".env.example"), "A=\n");
    writeFileSync(join(repo(), "credentials.json"), "{}\n");
    writeFileSync(join(repo(), "id_ed25519"), "key\n");
    writeFileSync(join(repo(), LONG_NAME), "A=1\n");
    writeFileSync(join(repo(), "README.md"), "# hi\n");
    mkdirSync(join(repo(), "node_modules"), { recursive: true });
    writeFileSync(join(repo(), "node_modules", ".env"), "LEAK=1\n");

    const choose = $("h1=Choose your master password");
    const locked = $("h1=Seal is locked");
    await browser.waitUntil(
      async () =>
        (await choose.isDisplayed().catch(() => false)) ||
        (await locked.isDisplayed().catch(() => false)),
      { timeout: 30000 },
    );
    if (await choose.isDisplayed().catch(() => false)) {
      await enterPassphrase(PASSWORD);
      await browser.pause(600);
      await enterPassphrase(PASSWORD);
    } else {
      await enterPassphrase(PASSWORD);
    }

    await $(".tile--add button").waitForClickable({ timeout: 30000 });
    await $(".tile--add button").click();
    await $(".manage__region").waitForDisplayed({ timeout: 60000 });
    await browser.pause(800);
  });

  it("draws the annotations as a column, not wherever each name happens to end", async () => {
    const rows = await channels();
    const rights = rows
      .filter((r) => r.reasonRight !== null)
      .map((r) => r.reasonRight!);

    if (rights.length < 2) {
      throw new Error(
        `only ${rights.length} annotated row(s) on the surface, so this proves nothing about a column`,
      );
    }

    const spread = Math.max(...rights) - Math.min(...rights);
    if (spread > 1) {
      throw new Error(
        `the annotations span ${spread.toFixed(1)}px rather than forming a column`,
      );
    }
  });

  it("starts every name at the same place for its depth, whatever kind of row it is", async () => {
    const rows = await channels();
    const byDepth = new Map<number, number[]>();
    for (const r of rows) {
      byDepth.set(r.depth, [...(byDepth.get(r.depth) ?? []), r.nameX]);
    }

    for (const [depth, xs] of byDepth) {
      const spread = Math.max(...xs) - Math.min(...xs);
      if (spread > 0.5) {
        throw new Error(
          `at depth ${depth} the names start across ${spread.toFixed(2)}px, so the kinds misalign`,
        );
      }
    }
  });

  it("truncates a name nothing would choose, rather than wrapping it", async () => {
    const measured = await browser.execute((needle: string) => {
      const rows = [...document.querySelectorAll(".tree__row")];
      const match = rows.find(
        (r) => (r.querySelector(".tree__name")?.textContent ?? "") === needle,
      );
      if (!match) return null;
      const name = match.querySelector(".tree__name") as HTMLElement;
      const line = parseFloat(getComputedStyle(name).lineHeight) || 16;
      return {
        nameHeight: name.getBoundingClientRect().height,
        lineHeight: line,
        clipped: name.scrollWidth > name.clientWidth + 1,
        rowHeight: match.getBoundingClientRect().height,
      };
    }, LONG_NAME);

    if (!measured) {
      throw new Error(
        "the unreasonable name is not on the surface, so this proves nothing about truncation",
      );
    }
    if (measured.nameHeight > measured.lineHeight * 1.5) {
      throw new Error(
        `the name is ${measured.nameHeight}px tall against a ${measured.lineHeight}px line — it wrapped instead of truncating`,
      );
    }
    if (!measured.clipped) {
      throw new Error(
        "the unreasonable name fits its column, so this proves nothing about truncation",
      );
    }
  });

  it("says on its face that it did not search everywhere", async () => {
    const partial = await $(".manage__partial").getText();
    if (!/node_modules not searched/.test(partial)) {
      throw new Error(
        `the surface does not state the partial scan: "${partial}"`,
      );
    }
  });
});
