import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, expect } from "@wdio/globals";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";
const ARMOR = "-----BEGIN AGE ENCRYPTED FILE-----";
const FILES = ["alpha", "beta"];

const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";
const repoName = () => repo().split("/").pop() ?? "";

const rowStates = () =>
  browser.execute(() => {
    const out: Record<string, string> = {};
    for (const row of document.querySelectorAll(".row")) {
      const name = row.querySelector(".row__name")?.textContent?.trim() ?? "";
      out[name] = row.querySelector(".row__state")?.textContent?.trim() ?? "";
    }
    return out;
  });

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

describe("noticing the world change underneath an open window", () => {
  before(async () => {
    mkdirSync(repo(), { recursive: true });
    for (const name of FILES) {
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

    for (const name of FILES) {
      const seal = $(`button[aria-label="Seal .env.${name}"]`);
      await seal.waitForClickable({ timeout: 30000 });
      await seal.click();
      const anyway = $("button=Seal it anyway");
      if (await anyway.waitForClickable({ timeout: 4000 }).catch(() => false)) {
        await anyway.click();
      }
      const gate = $('[role="dialog"] input');
      if (await gate.waitForDisplayed({ timeout: 6000 }).catch(() => false)) {
        await gate.setValue("I UNDERSTAND");
        await $("button=I understand — start sealing").click();
      }
      await browser.waitUntil(
        async () =>
          readFileSync(join(repo(), `.env.${name}`), "utf8").startsWith(ARMOR),
        { timeout: 30000, timeoutMsg: `.env.${name} never sealed` },
      );
    }
  });

  it("notices a secret exposed while the window sits open, with no user action", async () => {
    await openTheRepository();

    const before = await rowStates();
    if (before[`.env.${FILES[0]}`] !== "Sealed") {
      throw new Error(
        `the file did not start sealed: ${JSON.stringify(before)}`,
      );
    }

    writeFileSync(join(repo(), `.env.${FILES[0]}`), "SECRET_ALPHA=in-the-clear\n");

    await browser.waitUntil(
      async () => {
        const states = await rowStates();
        return (states[`.env.${FILES[0]}`] ?? "").startsWith("Readable");
      },
      {
        timeout: 25000,
        timeoutMsg:
          "an exposure staged while the window sat open was never noticed — nothing makes the interface look at disk again",
      },
    );
  });

  it("raises the exposure alert from the same observation", async () => {
    await expect($(".exposure-alert")).toBeDisplayed();
    await expect($(".exposure-alert").$(`span*=.env.${FILES[0]}`)).toBeDisplayed();
  });

  it("notices a managed file deleted while the window sits open", async () => {
    unlinkSync(join(repo(), `.env.${FILES[1]}`));

    await browser.waitUntil(
      async () => {
        const states = await rowStates();
        return states[`.env.${FILES[1]}`] === "Not found";
      },
      {
        timeout: 25000,
        timeoutMsg: "a file deleted underneath the window was never noticed",
      },
    );

    const openDisabled = await browser.execute((name: string) => {
      const rows = [...document.querySelectorAll(".row")];
      const match = rows.find((r) =>
        (r.querySelector(".row__name")?.textContent ?? "").includes(name),
      );
      const open = match?.querySelector(".row__open") as HTMLButtonElement | null;
      return open ? open.disabled : null;
    }, `.env.${FILES[1]}`);

    if (openDisabled !== true) {
      throw new Error("the deleted file can still be opened");
    }
  });

  it("says nothing about the healthy files, because absence is the answer", async () => {
    const body = await browser.execute(() => document.body.innerText);
    if (/everything is protected|all protected|all files are sealed/i.test(body)) {
      throw new Error(
        "the interface drew a positive assurance, which the product owner decided against",
      );
    }
  });

  it("recovers silently when the file is sealed again underneath it", async () => {
    await $(".exposure-alert").$("button=Seal now").click();

    const dialog = $('[role="dialog"]');
    if (await dialog.isDisplayed().catch(() => false)) {
      const anyway = dialog.$("button=Seal it anyway");
      if (await anyway.isDisplayed().catch(() => false)) {
        await anyway.click();
      }
    }

    await browser.waitUntil(
      async () =>
        readFileSync(join(repo(), `.env.${FILES[0]}`), "utf8").startsWith(ARMOR),
      { timeout: 30000, timeoutMsg: "sealing from the alert never took" },
    );

    await browser.waitUntil(
      async () => !(await $(".exposure-alert").isDisplayed().catch(() => false)),
      { timeout: 25000, timeoutMsg: "the alert never cleared" },
    );
  });
});
