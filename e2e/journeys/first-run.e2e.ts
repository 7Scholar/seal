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

    await expect($("h1=Seal manages nothing yet")).toBeDisplayed();
    await expect($("p*=Nothing is encrypted until you choose")).toBeDisplayed();
    await expect($("button=Import a folder")).toBeDisplayed();
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

  it("imports a repository through the folder picker, preselecting only real secrets", async () => {
    repo = process.env.SEAL_E2E_PICK_FOLDER ?? "";
    writeFileSync(join(repo, ".env"), "API_KEY=sk-live-1234567890abcdef\n");
    writeFileSync(join(repo, ".env.example"), "API_KEY=\n");

    await $("button=Import a folder").click();

    await expect($(`h1=Import ${repo}`)).toBeDisplayed();
    await expect($("p*=It does not encrypt")).toBeDisplayed();
    await expect($("legend*=Secret files")).toBeDisplayed();
    await expect($("legend*=Templates and examples")).toBeDisplayed();

    const secretRow = $('label*=.env');
    await expect(secretRow).toBeDisplayed();
    await expect($("button=Manage 1 file")).toBeEnabled();
    await $("button=Manage 1 file").click();

    await expect($('[role="treeitem"] span=' + repo.split("/").pop())).toBeDisplayed();
    await expect($("span=.env")).toBeDisplayed();
  });

  it("seals only after the two irreversible facts are acknowledged, gated on typing", async () => {
    await $('button[aria-label="Seal .env"]').click();

    const dialog = $('[role="dialog"]');
    await expect(dialog).toBeDisplayed();
    await expect($("h2=Before Seal encrypts anything")).toBeDisplayed();
    await expect($("p*=your sealed files are gone")).toBeDisplayed();
    await expect($("p*=It cannot reach backwards")).toBeDisplayed();
    await expect($("p*=rotate it")).toBeDisplayed();

    const proceed = $("button=I understand — start sealing");
    await expect(proceed).toBeDisabled();

    await dialog.$("input").setValue("I UNDERSTAND");
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
    await $("button=Lock Seal").click();
    await expect($("h1=Seal is locked")).toBeDisplayed();

    await browser.keys([..."not the password"]);
    await browser.keys("Enter");
    await expect(status()).toHaveText(
      expect.stringContaining("did not open your files"),
    );
    await expect(status()).toHaveText(expect.stringContaining("Nothing was changed"));

    await browser.keys([...PASSWORD]);
    await browser.keys("Enter");
    await expect($('[role="tree"]')).toBeDisplayed();
    await $(`[role="treeitem"] span=${repo.split("/").pop()}`).click();
    await expect($("span=Sealed")).toBeDisplayed();
  });
});
