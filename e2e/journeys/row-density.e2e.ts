import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, $$ } from "@wdio/globals";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";
const FILE = ".env.production";
const COUNT = 60;

const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";
const repoName = () => repo().split("/").pop() ?? "";

describe("the row's density in the real window", () => {
  before(async () => {
    mkdirSync(repo(), { recursive: true });
    let body = "NEXT_PUBLIC_SUPABASE_ANON_KEY_FOR_STAGING=eyJhbGciOiJIUzI1NiIsInR5cCI6\n";
    for (let i = 0; i < COUNT - 1; i += 1) body += `VARIABLE_${i}=value-${i}\n`;
    writeFileSync(join(repo(), FILE), body);

    const choose = $("h1=Choose your master password");
    const locked = $("h1=Seal is locked");
    await browser.waitUntil(async () =>
      (await choose.isDisplayed().catch(() => false)) ||
      (await locked.isDisplayed().catch(() => false)), { timeout: 30000 });
    if (await choose.isDisplayed().catch(() => false)) {
      await enterPassphrase(PASSWORD);
      await browser.pause(600);
      await enterPassphrase(PASSWORD);
    } else { await enterPassphrase(PASSWORD); }

    await $(".tile--add button").waitForClickable({ timeout: 30000 });
    await $(".tile--add button").click();
    await $(".manage__actions button.button--primary").waitForClickable({ timeout: 60000 });
    await $(".manage__actions button.button--primary").click();
    const home = $("button=Repositories");
    if (await home.isDisplayed().catch(() => false)) await home.click();
    const tile = $(`button*=${repoName()}`);
    await tile.waitForClickable();
    await tile.click();
    await $(`button[aria-label="Open ${FILE}"]`).click();
    await browser.waitUntil(async () => (await $$(".env-editor__row")).length > 0,
      { timeout: 60000 });
  });

  it("costs one tab stop per row, not one per control", async () => {
    const stops = await browser.execute(() => {
      const region = document.querySelector(".env-editor__region") as HTMLElement;
      const all = [...region.querySelectorAll("button, input")] as HTMLElement[];
      return {
        rows: region.querySelectorAll(".env-editor__row").length,
        controls: all.length,
        tabStops: all.filter((element) => element.tabIndex === 0).length,
      };
    });

    if (stops.tabStops > stops.rows + 1) {
      throw new Error(
        `${stops.tabStops} tab stops for ${stops.rows} rows (${stops.controls} controls) — the toolbar is not collapsing them`,
      );
    }
  });

  it("keeps every control at the accessible target size", async () => {
    const small = await browser.execute(() => {
      const row = document.querySelector(".env-editor__row") as HTMLElement;
      return [...row.querySelectorAll("button")]
        .map((button) => {
          const box = button.getBoundingClientRect();
          return { name: button.getAttribute("aria-label") ?? button.textContent, w: Math.round(box.width), h: Math.round(box.height) };
        })
        .filter((control) => control.w < 24 || control.h < 24);
    });

    if (small.length > 0) {
      throw new Error(`controls below the 24px floor: ${JSON.stringify(small)}`);
    }
  });

  it("is one line per row wherever a row fits on one", async () => {
    await browser.setWindowSize(1900, 900);
    await browser.pause(500);

    const measured = await browser.execute(() => {
      const rows = [...document.querySelectorAll(".env-editor__row")] as HTMLElement[];
      return {
        viewport: window.innerWidth,
        tall: rows
          .map((row) => ({
            key: row.querySelector(".env-editor__key")?.textContent?.slice(0, 40),
            height: Math.round(row.getBoundingClientRect().height),
            scrollsSideways: row.scrollWidth > row.clientWidth + 1,
          }))
          .filter((row) => row.scrollsSideways || row.height > 80),
      };
    });

    if (measured.tall.length > 0) {
      throw new Error(
        `rows are more than one line at a ${measured.viewport}px viewport: ${JSON.stringify(measured.tall.slice(0, 3))}`,
      );
    }
  });

  it("stacks rather than wrapping once a row cannot fit on one line", async () => {
    await browser.setWindowSize(900, 720);
    await browser.pause(500);

    const narrow = await browser.execute(() => {
      const rows = [...document.querySelectorAll(".env-editor__row")] as HTMLElement[];
      const row = rows[0] as HTMLElement;
      const columns = window.getComputedStyle(row).gridTemplateColumns.split(" ").length;
      return {
        viewport: window.innerWidth,
        columns,
        heights: rows.slice(0, 3).map((r) => Math.round(r.getBoundingClientRect().height)),
        sideways: rows.some((r) => r.scrollWidth > r.clientWidth + 1),
      };
    });

    if (narrow.sideways) {
      throw new Error(`a row scrolls sideways at ${narrow.viewport}px — content is unreachable`);
    }
    if (narrow.columns !== 1) {
      throw new Error(
        `at ${narrow.viewport}px the row still has ${narrow.columns} columns rather than stacking`,
      );
    }
    const uneven = narrow.heights.filter((h) => h > 110);
    if (uneven.length > 0) {
      throw new Error(`stacked rows are taller than two lines: ${JSON.stringify(narrow.heights)}`);
    }
  });

  it("still shows the row's three controls, none hidden", async () => {
    const shape = await browser.execute(() => {
      const row = document.querySelector(".env-editor__row") as HTMLElement;
      const visible = [...row.querySelectorAll("button")].filter((button) => {
        const style = window.getComputedStyle(button);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      return visible.map((b) => b.getAttribute("aria-label") ?? b.textContent);
    });

    const wanted = ["Reveal", "Edit", "is enabled", "More actions"];
    for (const needle of wanted) {
      if (!shape.some((name) => name?.includes(needle))) {
        throw new Error(`${needle} is not visible in the row; saw ${JSON.stringify(shape)}`);
      }
    }
    if (shape.length > 4) {
      throw new Error(`the row still holds ${shape.length} controls: ${JSON.stringify(shape)}`);
    }
  });
});
