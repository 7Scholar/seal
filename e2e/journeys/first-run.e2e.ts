import { readFileSync, writeFileSync } from "node:fs";

import { join } from "node:path";
import { browser, $, expect } from "@wdio/globals";

const PASSWORD = "correct horse battery staple";
const ARMOR = "-----BEGIN AGE ENCRYPTED FILE-----";

const status = () => $('[role="status"][aria-label="Unlock status"]');

let repo = "";

describe("first run: install, choose a password, protect a first file", () => {
  it("opens to choosing a password, saying it is a choice and cannot be recovered", async () => {
    await expect($("h1=Choose your master password")).toBeDisplayed();
    await expect($("p*=never be recovered")).toBeDisplayed();
    await expect($("p*=choosing a password now, not entering one")).toBeDisplayed();
  });

  it("catches a mistyped confirmation and sets nothing", async () => {
    await browser.keys([..."first attempt"]);
    await browser.keys("Enter");
    await expect(status()).toHaveText(expect.stringContaining("confirm"));

    await browser.keys([..."different attempt"]);
    await browser.keys("Enter");
    await expect(status()).toHaveText(expect.stringContaining("did not match"));
  });

  it("establishes the password when both entries match, and lands in the empty state", async () => {
    await browser.keys([...PASSWORD]);
    await browser.keys("Enter");
    await expect(status()).toHaveText(expect.stringContaining("confirm"));

    await browser.keys([...PASSWORD]);
    await browser.keys("Enter");

    await expect($("h1=Repositories")).toBeDisplayed();
    await expect($(".tile--add")).toBeDisplayed();
    await expect($(".tile--add button")).toHaveText(
      expect.stringContaining("Add repository"),
    );
  });

  it("recorded the password only as a sealed check file", () => {
    const sentinel = join(
      process.env.SEAL_E2E_HOME ?? "",
      ".config",
      "seal",
      "password-check.age",
    );
    const contents = readFileSync(sentinel, "utf8");
    if (!contents.startsWith(ARMOR)) {
      throw new Error(`the sentinel at ${sentinel} is not a sealed age file`);
    }
    if (contents.includes(PASSWORD)) {
      throw new Error("the sentinel leaks the password");
    }
  });

  it("adds a repository through the folder picker, preselecting only real secrets", async () => {
    repo = process.env.SEAL_E2E_PICK_FOLDER ?? "";
    writeFileSync(join(repo, ".env"), "API_KEY=sk-live-1234567890abcdef\n");
    writeFileSync(join(repo, ".env.example"), "API_KEY=\n");

    await $(".tile--add button").click();

    await expect($(`h1*=Seal in`)).toBeDisplayed();

    const secret = $('[role="treeitem"][aria-label=".env"]');
    const template = $('[role="treeitem"][aria-label=".env.example"]');
    await expect(secret).toBeDisplayed();
    await expect(secret).toHaveAttribute("aria-checked", "true");
    await expect(template).toBeDisplayed();
    await expect(template).toHaveAttribute("aria-checked", "false");

    await expect($("button=Manage 1 file")).toBeEnabled();
    await $("button=Manage 1 file").click();

    await expect($('nav[aria-label="Breadcrumb"]')).toBeDisplayed();
    await expect($('[aria-current="page"]')).toHaveText(repo.split("/").pop());
    await expect($("span=.env")).toBeDisplayed();
  });

  it("seals only after the two irreversible facts are acknowledged, gated on typing", async () => {
    await $('button[aria-label="Seal .env"]').click();

    await expect($('[role="dialog"]')).toBeDisplayed();

    const anyway = $('[role="dialog"]').$("button=Seal it anyway");
    if (await anyway.isDisplayed().catch(() => false)) {
      await expect($("h2*=while something may be editing it")).toBeDisplayed();
      await anyway.click();
    }

    await expect($("h2=Before Seal encrypts anything")).toBeDisplayed();
    await expect($("p*=your sealed files are gone")).toBeDisplayed();
    await expect($("p*=It cannot reach backwards")).toBeDisplayed();
    await expect($("p*=rotate it")).toBeDisplayed();

    const proceed = $("button=I understand — start sealing");
    await expect(proceed).toBeDisabled();

    await $('[role="dialog"]').$("input").setValue("I UNDERSTAND");
    await expect(proceed).toBeEnabled();
    await proceed.click();

    await expect($("span=Sealed")).toBeDisplayed();
  });

  it("left the file sealed in place, in the repository, as standard age", () => {
    const contents = readFileSync(join(repo, ".env"), "utf8");
    if (!contents.startsWith(ARMOR)) {
      throw new Error("the sealed file is not an armored age file");
    }
    if (contents.includes("sk-live")) {
      throw new Error("the sealed file still contains the secret");
    }
  });

  it("locks on request, rejects a wrong password plainly, and reopens with the right one", async () => {
    await $("button=Lock").click();
    await expect($("h1=Seal is locked")).toBeDisplayed();

    await browser.keys([..."not the password"]);
    await browser.keys("Enter");
    await expect(status()).toHaveText(
      expect.stringContaining("did not open your files"),
    );
    await expect(status()).toHaveText(expect.stringContaining("Nothing was changed"));

    await browser.keys([...PASSWORD]);
    await browser.keys("Enter");
    await expect($("h1=Repositories")).toBeDisplayed();
    await $(`button*=${repo.split("/").pop()}`).click();
    await expect($("span=Sealed")).toBeDisplayed();
  });
});
