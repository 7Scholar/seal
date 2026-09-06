import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, $$, expect } from "@wdio/globals";
import { sealFromRow } from "./rows";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";
const ARMOR = "-----BEGIN AGE ENCRYPTED FILE-----";

const READABLE = ".env";
const SEALED = ".env.production";

const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";
const repoName = () => repo().split("/").pop() ?? "";

async function confirmManage() {
  const confirm = $(".manage__actions button.button--primary");
  await confirm.waitForClickable({ timeout: 60000 });
  await confirm.click();
}

async function openTheRepository() {
  const crumb = $('nav[aria-label="Breadcrumb"] [aria-current="page"]');
  if (await crumb.isDisplayed().catch(() => false)) {
    if ((await crumb.getText()) === repoName()) return;
  }
  const home = $("button=Repositories");
  if (await home.isDisplayed().catch(() => false)) await home.click();
  const tile = $(`button*=${repoName()}`);
  await tile.waitForClickable();
  await tile.click();
}

describe("managing readable files beside sealed ones", () => {
  before(async () => {
    mkdirSync(repo(), { recursive: true });
    writeFileSync(join(repo(), READABLE), "API_KEY=dev-key\nDEBUG=true\n");
    writeFileSync(join(repo(), SEALED), "API_KEY=live-key\n");

    const choose = $('[data-surface="unlock"][data-mode="create"]');
    const locked = $('[data-surface="unlock"][data-mode="verify"]');
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

    await $(".surface__nothing button").waitForClickable({ timeout: 30000 });
    await $(".surface__nothing button").click();
    await $(".manage__region").waitForDisplayed({ timeout: 60000 });

    for (const name of [READABLE, SEALED]) {
      const row = $(`.tree__row*=${name}`);
      await row.waitForDisplayed({ timeout: 30000 });
      const box = row.$('input[type="checkbox"]');
      if (!(await box.isSelected().catch(() => true))) await box.click();
    }

    await confirmManage();
    await openTheRepository();

    await sealFromRow(`${SEALED}`);


    const proceed = $("button=I understand — start sealing");
    if (await proceed.isDisplayed().catch(() => false)) {
      await $('[role="dialog"]').$("input").setValue("I UNDERSTAND");
      await proceed.waitForEnabled({ timeout: 10000 });
      await proceed.click();
    }

    await browser.waitUntil(
      async () => readFileSync(join(repo(), SEALED), "utf8").startsWith(ARMOR),
      { timeout: 30000, timeoutMsg: "the production file never sealed" },
    );
  });

  it("opens a readable file instead of refusing it", async () => {
    await openTheRepository();
    const open = $(`button[aria-label="Open ${READABLE}"]`);
    await open.waitForClickable({ timeout: 30000 });
    await open.click();

    await $(".env-editor__rows").waitForDisplayed({ timeout: 30000 });

    const keys = await $$(".env-editor__key").map((key) => key.getText());
    expect(keys).toEqual(["API_KEY", "DEBUG"]);
    expect(await $(".file-failed").isDisplayed().catch(() => false)).toBe(false);
  });

  it("offers exactly Cancel and Save in the footer of a readable file", async () => {
    await $(".env-editor__actions").waitForDisplayed({ timeout: 30000 });

    const labels = await browser.execute(() =>
      [...document.querySelectorAll(".env-editor__actions button")].map(
        (button) => button.textContent,
      ),
    );
    expect(labels).toEqual(["Save"]);
  });

  it("enables Save only once something has changed, and revealing is not a change", async () => {
    const save = $("button=Save");
    expect(await save.isEnabled()).toBe(false);
    expect(await $("button=Discard").isExisting()).toBe(false);

    await $('button[aria-label="Reveal value for API_KEY"]').click();
    await $('button[aria-label="Edit API_KEY"]').waitForClickable({ timeout: 15000 });
    if (await save.isEnabled()) {
      throw new Error("revealing a value marked the file dirty");
    }

    await $('button[aria-label="Edit API_KEY"]').click();
    await $('input[aria-label="Value for API_KEY"]').waitForDisplayed({
      timeout: 10000,
    });
    await browser.keys(["1"]);

    await save.waitForEnabled({ timeout: 10000 });
  });

  it("asks before throwing away pending changes on Discard", async () => {
    await $("button=Discard").click();

    const dialog = $('[role="dialog"]');
    await dialog.waitForDisplayed({ timeout: 10000 });
    expect(await dialog.getText()).toContain("Discard your changes?");

    await $("button=Keep editing").click();
    await browser.waitUntil(
      async () => !(await dialog.isDisplayed().catch(() => false)),
      { timeout: 10000 },
    );
    expect(await $(".env-editor__rows").isDisplayed()).toBe(true);
  });

  it("leaves the file when the discard is confirmed", async () => {
    await $("button=Discard").click();
    await $('[role="dialog"]').waitForDisplayed({ timeout: 10000 });
    await $("button=Discard them").click();

    await $(".lines").waitForDisplayed({ timeout: 30000 });
  });

  it("offers sealing from the header of a readable file", async () => {
    await $(`button[aria-label="Open ${READABLE}"]`).click();
    await $(".env-editor__rows").waitForDisplayed({ timeout: 30000 });

    const header = $(".file-head");
    expect(await header.$("button=Seal").isDisplayed()).toBe(true);

    await $(`button*=${repoName()}`).click();
    await $(".lines").waitForDisplayed({ timeout: 30000 });
  });

  it("offers Seal on a readable file and none on a sealed one", async () => {
    await openTheRepository();
    await $(".lines").waitForDisplayed({ timeout: 30000 });

    await expect($(`button[aria-label="Seal ${READABLE}"]`)).toBeDisplayed();
    expect(
      await $(`button[aria-label="Seal ${SEALED}"]`).isExisting(),
    ).toBe(false);
  });

  it("selects nothing, because choosing is the manage surface's task", async () => {
    expect(await $(".line input[type=checkbox]").isExisting()).toBe(false);
    expect(await $(".batch").isExisting()).toBe(false);
  });

  it("gives every control on a row a genuinely clickable target", async () => {
    const sizes = await browser.execute((readable: string) => {
      const line = [...document.querySelectorAll(".line")].find((candidate) =>
        (candidate.querySelector(".line__open")?.textContent ?? "").includes(
          readable,
        ),
      );
      if (!line) return null;
      return [...line.querySelectorAll("button")].map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          label: button.getAttribute("aria-label") ?? button.textContent ?? "",
          width: rect.width,
          height: rect.height,
        };
      });
    }, READABLE);

    expect(sizes).not.toBe(null);
    expect(sizes!.length).toBeGreaterThan(0);
    for (const control of sizes!) {
      if (control.height < 20 || control.width < 20) {
        throw new Error(
          `the ${control.label.trim()} control is ${Math.round(control.width)}x${Math.round(control.height)}, too small to hit`,
        );
      }
    }
  });

  it("keeps the info toggletip inside the window rather than overflowing right", async () => {
    const info = $('button[aria-label="What Seal does with these files"]');
    await info.waitForClickable({ timeout: 10000 });
    await info.click();

    const overflows = await browser.execute(() => {
      const bubble = document.querySelector(".toggletip__bubble");
      if (!bubble) return null;
      const rect = bubble.getBoundingClientRect();
      return { right: rect.right, width: document.documentElement.clientWidth };
    });
    expect(overflows).not.toBe(null);
    expect(overflows!.right).toBeLessThanOrEqual(overflows!.width);
    await info.click();
  });

  it("opens a repository it already manages, rather than saying so in a dialog", async () => {
    await $("button=Repositories").click();
    const add = $(".toolbar button");
    await add.waitForClickable({ timeout: 30000 });
    await add.click();

    await $('nav[aria-label="Breadcrumb"] [aria-current="page"]').waitForDisplayed({
      timeout: 30000,
    });
    const where = await $(
      'nav[aria-label="Breadcrumb"] [aria-current="page"]',
    ).getText();
    if (where !== repoName()) {
      throw new Error(
        `adding a folder Seal already manages landed on ${where} rather than opening that repository`,
      );
    }
    if (await $('[role="dialog"]').isDisplayed().catch(() => false)) {
      throw new Error("adding a known folder raised a dialog with nothing to choose");
    }
    expect(await $(".manage__region").isDisplayed().catch(() => false)).toBe(false);
  });

  it("puts the add action's label and its plus on one row", async () => {
    await $("button=Repositories").click();
    const add = $("button=Add repository");
    await add.waitForDisplayed({ timeout: 30000 });

    const layout = await browser.execute(() => {
      const button = [...document.querySelectorAll(".toolbar button")].find(
        (candidate) => candidate.textContent?.includes("Add repository"),
      ) as HTMLElement;
      const icon = button.querySelector(".icon") as HTMLElement;
      const box = button.getBoundingClientRect();
      const iconBox = icon.getBoundingClientRect();
      return {
        iconMid: iconBox.top + iconBox.height / 2,
        buttonMid: box.top + box.height / 2,
        lines: Math.round(box.height),
        filled: getComputedStyle(button).backgroundColor,
      };
    });

    expect(Math.abs(layout.iconMid - layout.buttonMid)).toBeLessThan(4);
    expect(layout.lines).toBeLessThan(44);
    expect(layout.filled).toBe("rgba(0, 0, 0, 0)");
  });

  it("unseals a sealed file back to readable, keeping it managed", async () => {
    await openTheRepository();
    const menu = $(`button[aria-label="More actions for ${SEALED}"]`);
    await menu.waitForClickable({ timeout: 30000 });
    await menu.click();
    const unseal = $(`button[aria-label="Unseal ${SEALED}"]`);
    await unseal.waitForClickable({ timeout: 15000 });
    await unseal.click();

    if (await $('[role="dialog"]').isDisplayed().catch(() => false)) {
      throw new Error(
        "unsealing asked for a confirmation — it is the act the user pressed, and the row shows the result at once",
      );
    }

    await browser.waitUntil(
      async () => !readFileSync(join(repo(), SEALED), "utf8").startsWith(ARMOR),
      { timeout: 30000, timeoutMsg: "the file never became readable" },
    );
    expect(readFileSync(join(repo(), SEALED), "utf8")).toContain("API_KEY=live-key");

    const rows = await $$(".line__open").map((row) => row.getText());
    expect(rows).toContain(SEALED);
  });

  it("does not alert on a file the user unsealed deliberately", async () => {
    await openTheRepository();
    await browser.pause(500);

    const state = await browser.execute((name: string) => {
      for (const row of document.querySelectorAll(".line")) {
        if (row.querySelector(".line__open")?.textContent?.trim() === name) {
          return { state: row.getAttribute("data-condition") ?? "" };
        }
      }
      return null;
    }, SEALED);

    expect(state).not.toBe(null);
    expect(state!.state).toBe("open");
  });

  it("offers to seal it again, closing the round trip", async () => {
    await sealFromRow(`${SEALED}`);


    await browser.waitUntil(
      async () => readFileSync(join(repo(), SEALED), "utf8").startsWith(ARMOR),
      { timeout: 30000, timeoutMsg: "the file never sealed again" },
    );
  });

  it("seals what is left in one press, and stops offering to once nothing is left", async () => {
    await browser.keys("Escape");
    if (!readFileSync(join(repo(), READABLE), "utf8").includes("API_KEY=dev-key")) {
      throw new Error("the readable file is not readable, so this proves nothing");
    }

    const menu = $(`button[aria-label="More actions for ${repoName()}"]`);
    await menu.waitForClickable({ timeout: 30000 });
    await menu.click();

    const all = $("button=Seal every file");
    await all.waitForClickable({ timeout: 15000 });
    await all.click();

    for (const name of [READABLE, SEALED]) {
      await browser.waitUntil(
        async () => readFileSync(join(repo(), name), "utf8").startsWith(ARMOR),
        {
          timeout: 30000,
          timeoutMsg: `${name} is still readable after one press meant to seal every file`,
        },
      );
    }

    await menu.click();
    if (await $("button=Seal every file").isDisplayed().catch(() => false)) {
      throw new Error(
        "Seal every file is still offered with nothing left to seal",
      );
    }
    await browser.keys("Escape");
  });

  it("gives the breadcrumb's add entry a real height", async () => {
    await $('button[aria-label="Open a repository"]').click();
    const add = $(".switcher__add");
    await add.waitForDisplayed({ timeout: 10000 });

    const height = await browser.execute(
      () => (document.querySelector(".switcher__add") as HTMLElement).getBoundingClientRect().height,
    );
    expect(height).toBeGreaterThanOrEqual(36);
  });
});
