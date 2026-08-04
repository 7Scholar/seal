import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, expect } from "@wdio/globals";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";
const BURIED = "buried-treasure.conf";

const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";

const rowNames = () =>
  browser.execute(() =>
    [...document.querySelectorAll(".tree__row")].map(
      (r) => (r.querySelector(".tree__name")?.textContent ?? "").trim(),
    ),
  );

describe("finding a file the scan did not detect", () => {
  before(async () => {
    mkdirSync(join(repo(), "deep", "nested", "chain"), { recursive: true });
    writeFileSync(join(repo(), ".env.production"), "API_KEY=live\n");
    writeFileSync(join(repo(), "README.md"), "# readme\n");
    writeFileSync(
      join(repo(), "deep", "nested", "chain", BURIED),
      "buried = true\n",
    );

    const choose = $("h1=Choose your master password");
    const locked = $("h1=Seal is locked");
    const lock = $("button=Lock");
    if (await lock.isDisplayed().catch(() => false)) {
      await lock.click();
    }
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
  });

  it("does not show an undetected file buried in a collapsed chain", async () => {
    const names = await rowNames();
    if (names.includes(BURIED)) {
      throw new Error(
        "the buried file is already visible, so this scenario proves nothing about the filter",
      );
    }
  });

  it("reveals it by name, without the user opening a single folder", async () => {
    const field = $('input[aria-label="Filter files"]');
    await field.waitForDisplayed({ timeout: 15000 });
    await field.click();
    await field.setValue("buried");

    await browser.waitUntil(
      async () => (await rowNames()).includes(BURIED),
      {
        timeout: 15000,
        timeoutMsg:
          "filtering by name never revealed the buried file — the one case the filter exists for",
      },
    );

    const names = await rowNames();
    if (names.includes("README.md")) {
      throw new Error("the filter left non-matching files in the tree");
    }
  });

  it("keeps the selection whole while filtered, and states the true total", async () => {
    const tally = await $(".manage__tally").getText();
    if (!/1 file selected/.test(tally)) {
      throw new Error(
        `the filter narrowed the selection statement to what is visible: "${tally}"`,
      );
    }

    const confirm = await $(".manage__actions button.button--primary").getText();
    if (!/Manage 1 file/.test(confirm)) {
      throw new Error(
        `the confirm button no longer states the whole selection: "${confirm}"`,
      );
    }
  });

  it("matches on the path, so a folder name reveals what is under it", async () => {
    const field = $('input[aria-label="Filter files"]');
    await field.click();
    await field.setValue("nested");

    await browser.waitUntil(
      async () => (await rowNames()).includes(BURIED),
      {
        timeout: 15000,
        timeoutMsg: "a folder name did not reveal the file beneath it",
      },
    );
  });

  it("says so when nothing matches, and clears back to the whole tree", async () => {
    const field = $('input[aria-label="Filter files"]');
    await field.click();
    await field.setValue("no-such-file-anywhere");

    await expect($(".manage__nomatch")).toBeDisplayed();

    await $("button=Clear the filter").click();

    await browser.waitUntil(
      async () => (await rowNames()).includes("README.md"),
      { timeout: 15000, timeoutMsg: "clearing the filter never restored the tree" },
    );

    const names = await rowNames();
    if (names.includes(BURIED)) {
      throw new Error(
        "clearing the filter left a branch open that only the filter had opened",
      );
    }
  });
});
