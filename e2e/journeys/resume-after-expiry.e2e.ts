import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, expect } from "@wdio/globals";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";
const SECRET = "sk-live-resume-42";
const LIFETIME_SECONDS = Number(
  process.env.SEAL_E2E_PLAINTEXT_LIFETIME_SECONDS ?? "0",
);

const repo = process.env.SEAL_E2E_PICK_FOLDER ?? "";
const repoName = repo.split("/").pop() ?? "";
const file = join(repo, ".env.production");

function requireShortLifetime() {
  if (!Number.isInteger(LIFETIME_SECONDS) || LIFETIME_SECONDS <= 0) {
    throw new Error(
      "this scenario must run through e2e/wdio.resume.conf.ts, which launches the application with a short plaintext lifetime; without it the expiry it observes would never arrive",
    );
  }
}

describe("coming back to a file whose plaintext expired while you were away", () => {
  before(async () => {
    mkdirSync(repo, { recursive: true });
    writeFileSync(file, `API_KEY=${SECRET}\nDATABASE_URL=postgres://host/db\n`);
    requireShortLifetime();

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
    await $(".manage__actions button.button--primary").click();

    const rows = $(".rows");
    if (!(await rows.isDisplayed().catch(() => false))) {
      const tile = $(`button*=${repoName}`);
      await tile.waitForClickable({ timeout: 30000 });
      await tile.click();
    }
    await rows.waitForDisplayed({ timeout: 30000 });

    await $('button[aria-label="Seal .env.production"]').click();
    const anyway = $('[role="dialog"]').$("button=Seal it anyway");
    if (await anyway.isDisplayed().catch(() => false)) await anyway.click();
    const proceed = $("button=I understand — start sealing");
    if (await proceed.isDisplayed().catch(() => false)) {
      await $('[role="dialog"]').$("input").setValue("I UNDERSTAND");
      await proceed.waitForEnabled({ timeout: 10000 });
      await proceed.click();
    }
    await $("span=Sealed").waitForDisplayed({ timeout: 30000 });
  });

  it("locks itself rather than stranding the user, when the plaintext has gone", async () => {
    await $('button[aria-label="Open .env.production"]').click();
    await $(".env-editor__rows").waitForDisplayed({ timeout: 30000 });

    await browser.pause((LIFETIME_SECONDS + 2) * 1000);

    await $('button[aria-label="Edit API_KEY"]').click();

    await $("h1=Seal is locked").waitForDisplayed({ timeout: 30000 });
    const status = $('[aria-label="Unlock status"]');
    await status.waitForDisplayed({ timeout: 10000 });
    expect(await status.getText()).toContain("pick up where you left off");
  });

  it("comes back to the same file and the same row on unlocking", async () => {
    await enterPassphrase(PASSWORD);

    const field = $('input[aria-label="Value for API_KEY"]');
    await field.waitForDisplayed({ timeout: 30000 });
    expect(await field.getValue()).toBe(SECRET);

    const crumb = $('nav[aria-label="Breadcrumb"] [aria-current="page"]');
    expect(await crumb.getText()).toBe(".env.production");
  });

  it("can then save the edit it resumed, and the file stays sealed", async () => {
    const field = $('input[aria-label="Value for API_KEY"]');
    await field.click();
    await browser.keys([
      ...Array(SECRET.length).fill("Backspace"),
      ..."sk-live-rotated".split(""),
    ]);

    const save = $("button=Save and seal");
    await save.waitForEnabled({ timeout: 10000 });
    await save.click();

    const dirty = $(".env-editor__dirty");
    await browser.waitUntil(
      async () => (await dirty.getText()) === "No unsaved changes",
      { timeout: 30000, timeoutMsg: "the save never settled" },
    );
    expect(await $(".file-head__state").getText()).toBe("Sealed");
  });
});
