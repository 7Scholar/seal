import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, $$, expect } from "@wdio/globals";
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

    for (const name of [READABLE, SEALED]) {
      const row = $(`.tree__row*=${name}`);
      await row.waitForDisplayed({ timeout: 30000 });
      const box = row.$('input[type="checkbox"]');
      if (!(await box.isSelected().catch(() => true))) await box.click();
    }

    await confirmManage();
    await openTheRepository();

    const seal = $(`button[aria-label="Seal ${SEALED}"]`);
    await seal.waitForClickable({ timeout: 30000 });
    await seal.click();

    const anyway = $('[role="dialog"]').$("button=Seal it anyway");
    if (await anyway.isDisplayed().catch(() => false)) await anyway.click();

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

  it("says on the control that saving a readable file will seal it", async () => {
    const save = $("button*=Save");
    await save.waitForDisplayed({ timeout: 30000 });
    expect(await save.getText()).toContain("Save and seal");
  });

  it("draws no actions bar until a file is selected", async () => {
    await openTheRepository();
    await $(".rows").waitForDisplayed({ timeout: 30000 });
    expect(await $(".batch").isDisplayed().catch(() => false)).toBe(false);
  });

  it("gives a sealed file a checkbox too, and offers no Seal for it", async () => {
    const box = $(`input[aria-label="Select ${SEALED}"]`);
    await box.waitForDisplayed({ timeout: 30000 });
    await box.click();

    await $(".batch").waitForDisplayed({ timeout: 10000 });
    expect(await $("button*=Stop managing 1 file").isDisplayed()).toBe(true);

    const sealAction = await $$("button").filter(async (button) =>
      /^Seal \d+ file/.test(await button.getText()),
    );
    expect(sealAction.length).toBe(0);
  });

  it("offers Seal when only readable files are selected", async () => {
    await $(`input[aria-label="Select ${SEALED}"]`).click();
    await $(`input[aria-label="Select ${READABLE}"]`).click();

    await $(".batch").waitForDisplayed({ timeout: 10000 });
    expect(await $("button=Seal 1 file").isDisplayed()).toBe(true);
    expect(await $("button*=Stop managing 1 file").isDisplayed()).toBe(true);
  });

  it("gives the row checkbox a genuinely clickable target", async () => {
    const size = await browser.execute(() => {
      const box = document.querySelector(".row__check") as HTMLElement | null;
      if (!box) return null;
      const rect = box.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    expect(size).not.toBe(null);
    expect(size!.width).toBeGreaterThanOrEqual(20);
    expect(size!.height).toBeGreaterThanOrEqual(20);
  });

  it("keeps the info toggletip inside the window rather than overflowing right", async () => {
    await $(`input[aria-label="Select ${READABLE}"]`).click();
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

  it("refuses a repository it already manages, in a dialog", async () => {
    await $("button=Repositories").click();
    await $(".tile--add button").waitForClickable({ timeout: 30000 });
    await $(".tile--add button").click();

    const dialog = $('[role="dialog"]');
    await dialog.waitForDisplayed({ timeout: 30000 });
    expect(await dialog.getText()).toContain("already managed");
    expect(await $(".manage__region").isDisplayed().catch(() => false)).toBe(false);

    await $("button=Open it").click();
    await browser.waitUntil(
      async () => !(await dialog.isDisplayed().catch(() => false)),
      { timeout: 10000 },
    );
  });

  it("puts the add tile's label and its plus on one row", async () => {
    await $("button=Repositories").click();
    const tile = $(".tile--add button");
    await tile.waitForDisplayed({ timeout: 30000 });

    const layout = await browser.execute(() => {
      const button = document.querySelector(".tile--add button") as HTMLElement;
      const icon = button.querySelector(".tile__add-icon") as HTMLElement;
      const label = button.querySelector(".tile__name") as HTMLElement;
      const style = getComputedStyle(button);
      return {
        iconMid: icon.getBoundingClientRect().top + icon.getBoundingClientRect().height / 2,
        labelMid:
          label.getBoundingClientRect().top + label.getBoundingClientRect().height / 2,
        borderStyle: style.borderTopStyle,
      };
    });

    expect(layout.borderStyle).toBe("dashed");
    expect(Math.abs(layout.iconMid - layout.labelMid)).toBeLessThan(4);
  });

  it("unseals a sealed file back to readable, keeping it managed", async () => {
    await openTheRepository();
    const unseal = $(`button[aria-label="Unseal ${SEALED}"]`);
    await unseal.waitForClickable({ timeout: 30000 });
    await unseal.click();

    const dialog = $('[role="dialog"]');
    await dialog.waitForDisplayed({ timeout: 10000 });
    expect(await dialog.getText()).toContain("readable on disk");
    await $("button=Unseal it").click();

    await browser.waitUntil(
      async () => !readFileSync(join(repo(), SEALED), "utf8").startsWith(ARMOR),
      { timeout: 30000, timeoutMsg: "the file never became readable" },
    );
    expect(readFileSync(join(repo(), SEALED), "utf8")).toContain("API_KEY=live-key");

    const rows = await $$(".row__name").map((row) => row.getText());
    expect(rows).toContain(SEALED);
  });

  it("does not alert on a file the user unsealed deliberately", async () => {
    await openTheRepository();
    await browser.pause(500);

    const state = await browser.execute((name: string) => {
      for (const row of document.querySelectorAll(".row")) {
        if (row.querySelector(".row__name")?.textContent?.trim() === name) {
          return {
            alert: row.getAttribute("data-alert"),
            state: row.querySelector(".row__state")?.textContent?.trim() ?? "",
          };
        }
      }
      return null;
    }, SEALED);

    expect(state).not.toBe(null);
    expect(state!.alert).not.toBe("true");
    expect(state!.state).not.toContain("should be sealed");
  });

  it("offers to seal it again, closing the round trip", async () => {
    const seal = $(`button[aria-label="Seal ${SEALED}"]`);
    await seal.waitForClickable({ timeout: 30000 });
    await seal.click();

    const anyway = $('[role="dialog"]').$("button=Seal it anyway");
    if (await anyway.isDisplayed().catch(() => false)) await anyway.click();

    await browser.waitUntil(
      async () => readFileSync(join(repo(), SEALED), "utf8").startsWith(ARMOR),
      { timeout: 30000, timeoutMsg: "the file never sealed again" },
    );
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
