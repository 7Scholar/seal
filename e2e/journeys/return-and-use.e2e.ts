import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, expect } from "@wdio/globals";

const PASSWORD = "correct horse battery staple";
const NEW_PASSWORD = "an entirely new master password";
const ARMOR = "-----BEGIN AGE ENCRYPTED FILE-----";

const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";
const status = () => $('[role="status"][aria-label="Unlock status"]');
const repoName = () => repo().split("/").pop() ?? "";
const repoInSidebar = () => $('[role="tree"]').$(`span=${repoName()}`);

async function openTheRepository() {
  await repoInSidebar().waitForClickable();
  await repoInSidebar().click();
}

describe("returning: unlock, use a secret, catch an exposure, rotate the password", () => {
  before(async () => {
    const choose = $("h1=Choose your master password");
    const locked = $("h1=Seal is locked");
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
      await browser.keys([...PASSWORD]);
      await browser.keys("Enter");
      await browser.pause(600);
      step("typing confirmation");
      await browser.keys([...PASSWORD]);
      await browser.keys("Enter");
      await browser.pause(2500);
      step("waiting for empty state");
      await $("button=Add a folder").waitForClickable();
      await $("button=Add a folder").click();
      step("waiting for the manage screen");
      await $("button=Manage 1 file").waitForClickable();
      await $("button=Manage 1 file").click();
      step("waiting for repo list");
      await openTheRepository();
      await $('button[aria-label="Seal .env"]').waitForClickable();
      await $('button[aria-label="Seal .env"]').click();
      step("seal clicked");
      const anyway = $("button=Seal it anyway");
      if (await anyway.waitForClickable({ timeout: 4000 }).catch(() => false)) {
        step("recency warning shown");
        await anyway.click();
      }
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
        await $("span=Sealed").waitForDisplayed();
      } catch (error) {
        const page = await browser.execute(() => ({
          h1: document.querySelector("h1")?.textContent,
          states: [...document.querySelectorAll(".detail__state")].map((s) => s.textContent),
          alerts: [...document.querySelectorAll('[role="alert"]')].map((a) =>
            a.textContent?.slice(0, 200),
          ),
          dialog: document.querySelector('[role="dialog"]')?.textContent?.slice(0, 120),
        }));
        console.log("FIXTURE STUCK →", JSON.stringify(page));
        throw error;
      }
      await $("button=Lock").click();
      step("locked");
    }
  });

  it("greets a returning user with the locked shield, never the choosing one", async () => {
    await expect($("h1=Seal is locked")).toBeDisplayed();
    await expect($("h1=Choose your master password")).not.toBeDisplayed();
  });

  it("unlocks into the repository view with the sealed file", async () => {
    await browser.keys([...PASSWORD]);
    await browser.keys("Enter");
    await expect($('[role="tree"]')).toBeDisplayed();
    await openTheRepository();
    await expect($("span=Sealed")).toBeDisplayed();
  });

  it("opens the sealed file as masked structure, with no value in the page", async () => {
    await $('button[aria-label="Open .env"]').click();
    await expect($("h1=.env")).toBeDisplayed();
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

    await $("button=Save").click();
    await expect(
      $('[role="status"][aria-label="Unsaved changes"]'),
    ).toHaveText(expect.stringContaining("No unsaved changes"));

    const contents = readFileSync(join(repo(), ".env"), "utf8");
    if (!contents.startsWith(ARMOR)) {
      throw new Error("saving left the file readable on disk");
    }
    await $("button=Close").click();
    await expect($('button[aria-label="Open .env"]')).toBeDisplayed();
  });

  it("notices a sealed file replaced by readable text, and insists on it", async () => {
    writeFileSync(join(repo(), ".env"), "API_KEY=leaked-in-the-clear\n");

    await $("button=Lock").click();
    await expect($("h1=Seal is locked")).toBeDisplayed();
    await browser.keys([...PASSWORD]);
    await browser.keys("Enter");
    await openTheRepository();

    const alert = $(".exposure-alert");
    await expect(alert).toBeDisplayed();
    await expect($("h2*=readable on disk")).toBeDisplayed();
    await expect(alert.$("p*=rotate")).toBeDisplayed();
  });

  it("warns before sealing a file that changed moments ago, then seals from the alert", async () => {
    await $(".exposure-alert").$("button=Seal now").click();

    const dialog = $('[role="dialog"]');
    await expect(dialog).toBeDisplayed();
    await expect($("h2*=while something may be editing it")).toBeDisplayed();
    await expect($("p*=Close the file in your editor first")).toBeDisplayed();
    await dialog.$("button=Seal it anyway").click();

    await expect($("span=Sealed")).toBeDisplayed();
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

    await $("#current").setValue(PASSWORD);
    await $("#replacement").setValue(NEW_PASSWORD);
    await $("#confirmation").setValue(NEW_PASSWORD);
    await $("#phrase").setValue("CHANGE MY PASSWORD");
    await $("button=Change the password").click();

    await expect($('[role="tree"]')).toBeDisplayed();

    await $("button=Lock").click();
    await expect($("h1=Seal is locked")).toBeDisplayed();

    await browser.keys([...PASSWORD]);
    await browser.keys("Enter");
    await expect(status()).toHaveText(
      expect.stringContaining("did not open your files"),
    );

    await browser.keys([...NEW_PASSWORD]);
    await browser.keys("Enter");
    await expect($('[role="tree"]')).toBeDisplayed();
    await openTheRepository();
    await expect($("span=Sealed")).toBeDisplayed();
  });
});
