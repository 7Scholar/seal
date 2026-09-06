import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, expect } from "@wdio/globals";
import { sealFromRow } from "./rows";
import { enterPassphrase, typeInto } from "./typing";

const PASSWORD = "correct horse battery staple";
const NEW_PASSWORD = "an entirely new master password";
const ARMOR = "-----BEGIN AGE ENCRYPTED FILE-----";

const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";
const status = () => $('[role="status"][aria-label="Unlock status"]');
const repoName = () => repo().split("/").pop() ?? "";
const repoTile = () => $(`button*=${repoName()}`);

async function openTheRepository() {
  const crumb = $('nav[aria-label="Breadcrumb"] [aria-current="page"]');
  if (await crumb.isDisplayed().catch(() => false)) {
    if ((await crumb.getText()) === repoName()) return;
  }
  const home = $("button=Repositories");
  if (await home.isDisplayed().catch(() => false)) {
    await home.click();
  }
  await repoTile().waitForClickable();
  await repoTile().click();
}

describe("returning: unlock, use a secret, catch an exposure, rotate the password", () => {
  before(async () => {
    const choose = $('[data-surface="unlock"][data-mode="create"]');
    const locked = $('[data-surface="unlock"][data-mode="verify"]');

    const lock = $('button[aria-label="Lock Seal"]');
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
      const step = (name: string) => console.log("FIXTURE", name);
      writeFileSync(join(repo(), ".env"), "API_KEY=sk-live-1234567890abcdef\n");
      step("typing first entry");
      await enterPassphrase(PASSWORD);
      await browser.pause(600);
      step("typing confirmation");
      await enterPassphrase(PASSWORD);
      await browser.pause(2500);
      step("waiting for empty state");
      await $(".surface__nothing button").waitForClickable();
      await $(".surface__nothing button").click();
      step("waiting for the manage screen");
      await $("button=Manage 1 file").waitForClickable();
      await $("button=Manage 1 file").click();
      step("waiting for repo list");
      await openTheRepository();
      await sealFromRow(".env");
      step("seal clicked");
      const gate = $('[role="dialog"] input');
      if (await gate.waitForDisplayed({ timeout: 6000 }).catch(() => false)) {
        step("acknowledgement shown");
        await gate.setValue("I UNDERSTAND");
        await $("button=I understand — start sealing").click();
        await browser.pause(2500);
        step("proceeded");
      }
      step("waiting for sealed tag");
      try {
        await $('.line[data-condition="sealed"]').waitForDisplayed();
      } catch (error) {
        const page = await browser.execute(() => ({
          h1: document.querySelector("h1")?.textContent,
          states: [...document.querySelectorAll(".line")].map((s) => s.getAttribute("data-condition")),
          alerts: [...document.querySelectorAll('[role="alert"]')].map((a) =>
            a.textContent?.slice(0, 200),
          ),
          dialog: document.querySelector('[role="dialog"]')?.textContent?.slice(0, 120),
        }));
        console.log("FIXTURE STUCK →", JSON.stringify(page));
        throw error;
      }
      await $('button[aria-label="Lock Seal"]').click();
      step("locked");
    }
  });

  it("greets a returning user with the locked shield, never the choosing one", async () => {
    await expect($('[data-surface="unlock"][data-mode="verify"]')).toBeDisplayed();
    await expect($('[data-surface="unlock"][data-mode="create"]')).not.toBeDisplayed();
  });

  it("unlocks into the repository view with the sealed file", async () => {
    await enterPassphrase(PASSWORD);
    await expect($('[data-surface="repositories"]')).toBeDisplayed();
    await openTheRepository();
    await expect($('.line[data-condition="sealed"]')).toBeDisplayed();
  });

  it("opens the sealed file as masked structure, with no value in the page", async () => {
    await $('button[aria-label="Open .env"]').click();
    await expect($('nav[aria-label="Breadcrumb"] [aria-current="page"]')).toHaveText(
      ".env",
    );
    await expect($("span=API_KEY")).toBeDisplayed();
    await expect($("span=••••••••")).toBeDisplayed();

    const page = await browser.execute(() => document.body.innerHTML);
    if (page.includes("sk-live")) {
      throw new Error("the secret is in the page before any reveal");
    }
  });

  it("keeps the file sealed on disk while it is open in the editor", () => {
    const contents = readFileSync(join(repo(), ".env"), "utf8");
    if (!contents.startsWith(ARMOR)) {
      throw new Error("opening the file unsealed it on disk");
    }
  });

  it("reveals a value only on request", async () => {
    await $('button[aria-label="Reveal value for API_KEY"]').click();
    await expect($("span=sk-live-1234567890abcdef")).toBeDisplayed();
    await $('button[aria-label="Reveal value for API_KEY"]').click();
    await expect($("span=••••••••")).toBeDisplayed();
  });

  it("edits a value; saving re-seals in place and clears the dirty count", async () => {
    await $('button[aria-label="Edit API_KEY"]').click();
    const field = $('input[aria-label="Value for API_KEY"]');
    await field.setValue("sk-live-rotated-value");
    await expect(
      $('[role="status"][aria-label="Unsaved changes"]'),
    ).toHaveText(expect.stringContaining("1 unsaved change"));

    await $("button=Save and seal").click();
    await expect(
      $('[role="status"][aria-label="Unsaved changes"]'),
    ).toHaveText(expect.stringContaining("No unsaved changes"));

    const contents = readFileSync(join(repo(), ".env"), "utf8");
    if (!contents.startsWith(ARMOR)) {
      throw new Error("saving left the file readable on disk");
    }
    await $(`button=${repoName()}`).click();
    await expect($('button[aria-label="Open .env"]')).toBeDisplayed();
  });

  it("notices a sealed file replaced by readable text, and insists on it", async () => {
    writeFileSync(join(repo(), ".env"), "API_KEY=leaked-in-the-clear\n");

    await $('button[aria-label="Lock Seal"]').click();
    await expect($('[data-surface="unlock"][data-mode="verify"]')).toBeDisplayed();
    await enterPassphrase(PASSWORD);
    await expect($('[data-surface="repositories"]')).toBeDisplayed();
    await openTheRepository();

    const broken = $('.line[data-condition="broken"]');
    await expect(broken).toBeDisplayed();
    await expect(broken).toHaveText(expect.stringContaining(".env"));

    await $('button[aria-label="Why .env is marked"]').click();
    const why = $(".toggletip__bubble");
    await expect(why).toBeDisplayed();
    await expect(why).toHaveText(expect.stringContaining("readable on disk"));
    await expect(why).toHaveText(
      expect.stringContaining("Rotate any credential that was exposed"),
    );
    await expect(why).toHaveText(
      expect.stringContaining("sealing cannot undo an exposure that already happened"),
    );
    await browser.keys("Escape");
  });

  it("seals from beside the problem, with nothing interposed", async () => {
    await sealFromRow(".env");

    if (await $('[role="dialog"]').isDisplayed().catch(() => false)) {
      throw new Error(
        "sealing from the exposure alert asked for a confirmation — sealing is reversible and the overwrite is reported when it happens",
      );
    }

    await expect($('.line[data-condition="sealed"]')).toBeDisplayed();
    const contents = readFileSync(join(repo(), ".env"), "utf8");
    if (!contents.startsWith(ARMOR)) {
      throw new Error("sealing from the alert left the file readable");
    }
  });

  it("changes the master password under supervision, and the old one stops opening Seal", async () => {
    await $('button[aria-label="Seal settings"]').click();
    await $("button=Change master password").click();
    await expect($("h1=Change your master password")).toBeDisplayed();
    await expect($("p*=Both passwords must be remembered")).toBeDisplayed();

    await typeInto("#current", PASSWORD);
    await typeInto("#replacement", NEW_PASSWORD);
    await typeInto("#confirmation", NEW_PASSWORD);
    await typeInto("#phrase", "CHANGE MY PASSWORD");
    await $("button=Change the password").click();

    await expect($("h1=Change your master password")).not.toBeDisplayed();
    await expect($('button[aria-label="Lock Seal"]')).toBeDisplayed();

    await $('button[aria-label="Lock Seal"]').click();
    await expect($('[data-surface="unlock"][data-mode="verify"]')).toBeDisplayed();

    await enterPassphrase(PASSWORD);
    await expect(status()).toHaveText(
      expect.stringContaining("did not open your files"),
    );

    await enterPassphrase(NEW_PASSWORD);
    await expect($('[data-surface="unlock"][data-mode="verify"]')).not.toBeDisplayed();
    await openTheRepository();
    await expect($('.line[data-condition="sealed"]')).toBeDisplayed();
  });
});
