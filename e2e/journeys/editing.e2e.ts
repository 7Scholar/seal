import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, $$ } from "@wdio/globals";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";
const FILE = ".env.production";

const BODY = [
  "# Stripe credentials",
  "STRIPE_SECRET=sk_live_original",
  "STRIPE_HOOK=whsec_original",
  "",
  "# PAUSED_FLAG=off",
  "DATABASE_URL=postgres://localhost/app",
  "this line is not a variable",
  "",
].join("\n");

const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";
const repoName = () => repo().split("/").pop() ?? "";
const onDisk = () => readFileSync(join(repo(), FILE), "utf8");

async function openTheRepository() {
  const home = $("button=Repositories");
  if (await home.isDisplayed().catch(() => false)) {
    await home.click();
  }
  const tile = $(`button*=${repoName()}`);
  await tile.waitForClickable();
  await tile.click();
}

async function waitForEditor() {
  await browser.waitUntil(
    async () =>
      !(await $(".env-editor[aria-busy='true']").isExisting()) &&
      (await $$(".env-editor__row")).length > 0,
    { timeout: 60000, timeoutMsg: "the editor never rendered" },
  );
}

async function menu(key: string, item: string) {
  const trigger = $(`button[aria-label="More actions for ${key}"]`);
  await trigger.waitForClickable({ timeout: 10000 });
  await trigger.click();
  const menu = $(".overflow__menu");
  await menu.waitForDisplayed({ timeout: 6000 });
  const choice = menu.$(`button=${item}`);
  await choice.waitForClickable({ timeout: 6000 });
  await choice.click();
}

describe("managing environment variables in Seal", () => {
  before(async () => {
    mkdirSync(repo(), { recursive: true });
    writeFileSync(join(repo(), FILE), BODY);

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
    await $(".manage__actions button.button--primary").waitForClickable({
      timeout: 60000,
    });
    await $(".manage__actions button.button--primary").click();
    await openTheRepository();

    await $(`button[aria-label="Open ${FILE}"]`).click();
    await waitForEditor();
  });

  it("draws a commented-out assignment as a disabled variable, not a comment", async () => {
    const toggle = $('button[aria-label*="PAUSED_FLAG is disabled"]');
    if (!(await toggle.isDisplayed().catch(() => false))) {
      throw new Error("the commented-out variable did not become a row");
    }
    if ((await toggle.getAttribute("aria-checked")) !== "false") {
      throw new Error("a disabled variable must report itself unchecked");
    }
  });

  it("keeps a disabled variable's value masked like any other secret", async () => {
    const reveal = $('button[aria-label="Reveal value for PAUSED_FLAG"]');
    if (!(await reveal.isDisplayed().catch(() => false))) {
      throw new Error("a disabled variable must still offer to reveal its value");
    }
    await reveal.click();
    await browser.waitUntil(
      async () => {
        const shown = await browser.execute(() => {
          const rows = [...document.querySelectorAll(".env-editor__row")];
          const row = rows.find((candidate) =>
            candidate.textContent?.includes("PAUSED_FLAG"),
          );
          return row?.textContent ?? "";
        });
        return shown.includes("off");
      },
      { timeout: 8000, timeoutMsg: "the disabled variable never revealed its value" },
    );
  });

  it("leaves prose that merely contains an equals sign alone", async () => {
    const rows = await $$(".env-editor__key");
    const keys: string[] = [];
    for (const row of rows) keys.push(await row.getText());
    if (keys.some((key) => key.includes("Stripe"))) {
      throw new Error(`the heading comment was read as a variable; saw ${keys}`);
    }
  });

  it("draws an unparseable line as a row that can be corrected", async () => {
    const raw = $('input[aria-label="Malformed line"]');
    if ((await raw.getValue()) !== "this line is not a variable") {
      throw new Error("the malformed line did not reach the surface as its own text");
    }
  });

  it("refuses to correct text that is still not a variable", async () => {
    await $("button=Correct").click();
    const alert = $('[role="alert"]');
    await alert.waitForDisplayed({ timeout: 6000 });
    const said = await alert.getText();
    if (!/still not a variable/i.test(said)) {
      throw new Error(`expected a refusal, got ${said}`);
    }
  });

  it("carries a whole session of changes through one save", async () => {
    const before = onDisk();
    if (!before.includes("STRIPE_SECRET=sk_live_original")) {
      throw new Error("the fixture is not what the test assumes");
    }

    const raw = $('input[aria-label="Malformed line"]');
    await raw.clearValue();
    await raw.setValue("RECOVERED=yes");
    await $("button=Correct").click();

    await menu("STRIPE_SECRET", "Rename");
    const rename = $('input[aria-label="Rename STRIPE_SECRET"]');
    await rename.clearValue();
    await rename.setValue("STRIPE_KEY");

    await $('button[aria-label*="PAUSED_FLAG is disabled"]').click();

    await $("button=Add variable").click();
    const naming = $('input[aria-label*="Name for the new variable"]');
    await naming.setValue("REDIS_URL");
    const value = $('input[aria-label="Value for REDIS_URL"]');
    await value.setValue("redis://localhost");

    await menu("STRIPE_HOOK", "Delete");

    const save = $("button=Save");
    await save.waitForEnabled({ timeout: 8000 });
    await save.click();

    const dialog = $('[role="dialog"]');
    await dialog.waitForDisplayed({ timeout: 8000 });
    const warning = await dialog.getText();
    if (!/STRIPE_HOOK/.test(warning)) {
      throw new Error(`the confirmation must name what it removes; got ${warning}`);
    }
    if (!/cannot be recovered/i.test(warning)) {
      throw new Error("the confirmation must state that the value is unrecoverable");
    }
    await $("button=Delete and save").click();

    const gate = $('[role="dialog"] input');
    if (await gate.waitForDisplayed({ timeout: 6000 }).catch(() => false)) {
      await gate.setValue("I UNDERSTAND");
      await $("button=I understand — start sealing").click();
    }

    await browser.waitUntil(async () => onDisk() !== before, {
      timeout: 30000,
      timeoutMsg: "the file never changed on disk",
    });
  });

  it("wrote exactly what the interface promised, and nothing else", async () => {
    const after = onDisk();

    const expectations: [string, boolean][] = [
      ["# Stripe credentials", true],
      ["STRIPE_KEY=sk_live_original", true],
      ["STRIPE_SECRET=", false],
      ["STRIPE_HOOK", false],
      ["PAUSED_FLAG=off", true],
      ["# PAUSED_FLAG", false],
      ["DATABASE_URL=postgres://localhost/app", true],
      ["REDIS_URL=redis://localhost", true],
      ["RECOVERED=yes", true],
      ["this line is not a variable", false],
    ];

    for (const [needle, wanted] of expectations) {
      if (after.includes(needle) !== wanted) {
        throw new Error(
          `expected ${wanted ? "" : "no "}${needle} in the saved file; got:\n${after}`,
        );
      }
    }
  });

  it("preserved the file's readable state rather than sealing behind the user", async () => {
    const after = onDisk();
    if (after.includes("BEGIN AGE ENCRYPTED FILE")) {
      throw new Error("a save must never seal a file the user left readable");
    }
  });

  it("shows the saved file as the new starting point, with nothing pending", async () => {
    const status = $('[role="status"][aria-label="Unsaved changes"]');
    const said = await status.getText();
    if (said !== "No unsaved changes") {
      throw new Error(`after saving the surface should be clean; it says ${said}`);
    }
  });
});
