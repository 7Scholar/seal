import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, expect } from "@wdio/globals";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";
const ARMOR = "-----BEGIN AGE ENCRYPTED FILE-----";
const FILES = ["alpha", "beta"];
const BATCH_FILE = "gamma";

const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";
const repoName = () => repo().split("/").pop() ?? "";

async function dialog() {
  return browser.execute(() => {
    const box = document.querySelector(".confirm");
    if (!box) return null;
    return {
      title: box.querySelector("h2")?.textContent ?? "",
      gate: box.querySelector(".confirm__gate") !== null,
      body: box.querySelector(".confirm__body")?.textContent ?? "",
    };
  });
}

async function openTheRepository() {
  const crumb = $('nav[aria-label="Breadcrumb"] [aria-current="page"]');
  if (await crumb.isDisplayed().catch(() => false)) {
    if ((await crumb.getText()) === repoName()) return;
  }
  const home = $("button=Repositories");
  if (await home.isDisplayed().catch(() => false)) {
    await home.click();
  }
  const tile = $(`button*=${repoName()}`);
  await tile.waitForClickable();
  await tile.click();
}

describe("the bad day: ceremony where it belongs, and nowhere else", () => {
  before(async () => {
    mkdirSync(repo(), { recursive: true });
    for (const name of [...FILES, BATCH_FILE]) {
      writeFileSync(join(repo(), `.env.${name}`), `SECRET_${name}=value-${name}\n`);
    }

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
    await $(".manage__actions button.button--primary").waitForClickable({
      timeout: 60000,
    });
    await $(".manage__actions button.button--primary").click();
    await openTheRepository();
  });

  it("asks for the irreversible facts once, with a typed gate, before the first seal", async () => {
    const seal = $(`button[aria-label="Seal .env.${FILES[0]}"]`);
    await seal.waitForClickable({ timeout: 30000 });
    await seal.click();

    const anyway = $("button=Seal it anyway");
    if (await anyway.waitForClickable({ timeout: 4000 }).catch(() => false)) {
      await anyway.click();
    }

    const gate = $('[role="dialog"] input');
    const appeared = await gate
      .waitForDisplayed({ timeout: 8000 })
      .catch(() => false);
    if (!appeared) {
      throw new Error(
        "the first seal of a vault carried no acknowledgement gate — the two irreversible facts were never put to the user",
      );
    }

    const proceed = $("button=I understand — start sealing");
    if (await proceed.isEnabled()) {
      throw new Error(
        "the acknowledgement could be confirmed without typing anything, so it is not a gate",
      );
    }

    await gate.setValue("I UNDERSTAND");
    await proceed.click();

    await browser.waitUntil(
      async () =>
        readFileSync(join(repo(), `.env.${FILES[0]}`), "utf8").startsWith(ARMOR),
      { timeout: 30000, timeoutMsg: "the first seal never took" },
    );
  });

  it("does not ask again once the facts are acknowledged", async () => {
    await openTheRepository();

    const seal = $(`button[aria-label="Seal .env.${FILES[1]}"]`);
    await seal.waitForClickable({ timeout: 30000 });
    await seal.click();

    const anyway = $("button=Seal it anyway");
    if (await anyway.waitForClickable({ timeout: 4000 }).catch(() => false)) {
      await anyway.click();
    }

    await browser.waitUntil(
      async () =>
        readFileSync(join(repo(), `.env.${FILES[1]}`), "utf8").startsWith(ARMOR),
      { timeout: 30000, timeoutMsg: "the second seal never took" },
    );

    const typedGate = await browser.execute(
      () => document.querySelector(".confirm__gate") !== null,
    );
    if (typedGate) {
      throw new Error(
        "a second seal asked the user to type the acknowledgement again — repeated ceremony on a routine action",
      );
    }
  });

  it("opens a file with no confirmation at all, because looking changes nothing", async () => {
    await openTheRepository();

    const open = $(`button[aria-label="Open .env.${FILES[0]}"]`);
    await open.waitForClickable({ timeout: 30000 });
    await open.click();

    await $(".env-editor").waitForDisplayed({ timeout: 30000 });

    if (await dialog()) {
      throw new Error("opening a file to look at it asked for a confirmation");
    }
  });

  it("reveals and conceals a value with no confirmation, because it is reversible", async () => {
    const reveal = $(".env-editor button[aria-label^='Reveal']");
    await reveal.waitForClickable({ timeout: 30000 });
    await reveal.click();

    if (await dialog()) {
      throw new Error("revealing one value asked for a confirmation");
    }

    await browser.waitUntil(
      async () => (await reveal.getText()) === "Hide",
      { timeout: 15000, timeoutMsg: "the value never revealed" },
    );

    await reveal.click();
    if (await dialog()) {
      throw new Error("hiding a value again asked for a confirmation");
    }
    await expect(reveal).toHaveText("Reveal");
  });

  it("navigates between altitudes with no confirmation, even with nothing unsaved", async () => {
    const home = $("button=Repositories");
    await home.waitForClickable({ timeout: 30000 });
    await home.click();

    if (await dialog()) {
      throw new Error("leaving a clean file view asked for a confirmation");
    }
    await expect($("h1=Repositories")).toBeDisplayed();
  });

  it("locks without ceremony, because locking is the safe direction", async () => {
    await $("button=Lock").click();

    if (await dialog()) {
      throw new Error(
        "locking asked for a confirmation — the one action that only ever makes things safer",
      );
    }
    await expect($("h1=Seal is locked")).toBeDisplayed();
    await enterPassphrase(PASSWORD);
    await expect($("h1=Seal is locked")).not.toBeDisplayed();
  });

  it("guards releasing a file, which puts a secret back in the clear", async () => {
    await openTheRepository();

    await $(`button[aria-label="More actions for .env.${FILES[0]}"]`).click();
    await $("button=Stop managing this file").click();

    const box = await dialog();
    if (!box) {
      throw new Error(
        "releasing a sealed file went straight through — it writes the plaintext back to disk and must be confirmed",
      );
    }
    if (!/readable/i.test(box.body)) {
      throw new Error(
        `the confirmation does not say the contents become readable: "${box.body}"`,
      );
    }
    if (box.gate) {
      throw new Error(
        "releasing one file demands a typed phrase — that ceremony belongs to the irreversible acts, not to a reversible one",
      );
    }

    await $("button=Keep managing it").click();
    if (await dialog()) {
      throw new Error("declining the release left the dialog on screen");
    }
  });

  it("warns about a just-modified file whichever control seals it", async () => {
    await openTheRepository();

    const target = `.env.${BATCH_FILE}`;
    writeFileSync(join(repo(), target), `SECRET_${BATCH_FILE}=touched-again\n`);

    const box = $(`input[aria-label="Select ${target}"]`);
    await box.waitForDisplayed({ timeout: 30000 });
    await box.click();

    const batch = $(".batch button");
    await batch.waitForClickable({ timeout: 15000 });
    await batch.click();

    const warned = await $("button=Seal it anyway")
      .waitForDisplayed({ timeout: 8000 })
      .catch(() => false);

    if (!warned) {
      const onDisk = readFileSync(join(repo(), target), "utf8");
      throw new Error(
        `sealing a just-modified file from the batch control carried no recency warning, and it is now ${
          onDisk.startsWith(ARMOR) ? "already sealed" : "still readable"
        } — the same file sealed from its own row is warned about, so the protection depends on which control the user reached for`,
      );
    }

    await $("button=Not yet").click();
  });

  it("leaves every routine action reachable without hunting", async () => {
    const reachable = await browser.execute(() => {
      const labels = [...document.querySelectorAll("button")].map((b) =>
        (b.textContent ?? "").trim(),
      );
      return {
        lock: labels.includes("Lock"),
        home: labels.some((l) => l.includes("Repositories")),
      };
    });

    if (!reachable.lock) {
      throw new Error("Lock is not reachable from this altitude");
    }
    if (!reachable.home) {
      throw new Error("there is no way back to the repository list");
    }
  });
});
