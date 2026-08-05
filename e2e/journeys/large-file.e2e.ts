import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, $$ } from "@wdio/globals";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";
const BIG = ".env.big";
const VARIABLES = 400;

const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";
const repoName = () => repo().split("/").pop() ?? "";

async function openTheRepository() {
  const home = $("button=Repositories");
  if (await home.isDisplayed().catch(() => false)) {
    await home.click();
  }
  const tile = $(`button*=${repoName()}`);
  await tile.waitForClickable();
  await tile.click();
}

describe("editing a file with hundreds of variables", () => {
  before(async () => {
    mkdirSync(repo(), { recursive: true });
    let body = "";
    for (let i = 0; i < VARIABLES; i += 1) {
      body += `VARIABLE_NUMBER_${String(i).padStart(4, "0")}=value-${i}\n`;
    }
    writeFileSync(join(repo(), BIG), body);

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

    const seal = $(`button[aria-label="Seal ${BIG}"]`);
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
        (await $(`.row__state[data-state="sealed"]`)
          .isDisplayed()
          .catch(() => false)),
      { timeout: 30000, timeoutMsg: `${BIG} never sealed` },
    );

    await $(`button[aria-label="Open ${BIG}"]`).click();
    await browser.waitUntil(
      async () =>
        !(await $(".env-editor[aria-busy='true']").isExisting()) &&
        (await $$(".env-editor__key")).length > 0,
      { timeout: 60000, timeoutMsg: "the editor never rendered" },
    );
  });

  it("renders every variable the file holds", async () => {
    const rows = await $$(".env-editor__row");
    if (rows.length !== VARIABLES) {
      throw new Error(`expected ${VARIABLES} rows, saw ${rows.length}`);
    }
  });

  it("is the window's height rather than its content's, and the document does not scroll", async () => {
    const frame = await browser.execute(() => {
      const main = document.querySelector(".shell__main") as HTMLElement;
      const editor = document.querySelector(".env-editor") as HTMLElement;
      const root = document.documentElement;
      return {
        mainHeight: main.getBoundingClientRect().height,
        editorHeight: editor.getBoundingClientRect().height,
        documentScrolls: root.scrollHeight > root.clientHeight,
        viewport: window.innerHeight,
      };
    });

    if (frame.documentScrolls) {
      throw new Error(
        `the document itself scrolls at ${VARIABLES} variables — the surface escaped the frame`,
      );
    }
    if (frame.editorHeight > frame.viewport) {
      throw new Error(
        `the surface is ${frame.editorHeight}px in a ${frame.viewport}px window — it sized to its content`,
      );
    }
  });

  it("keeps the save control on screen, with the rows scrolled to their end", async () => {
    await browser.execute(() => {
      const region = document.querySelector(".env-editor__region") as HTMLElement;
      region.scrollTop = region.scrollHeight;
    });
    await browser.pause(200);

    const reach = await browser.execute(() => {
      const save = [...document.querySelectorAll(".env-editor__actions button")].find(
        (b) => b.textContent?.trim().startsWith("Save"),
      ) as HTMLElement | undefined;
      const region = document.querySelector(".env-editor__region") as HTMLElement;
      if (!save) return null;
      const box = save.getBoundingClientRect();
      return {
        bottom: box.bottom,
        top: box.top,
        viewport: window.innerHeight,
        regionScrolled: region.scrollTop > 0,
        regionScrolls: region.scrollHeight > region.clientHeight,
      };
    });

    if (!reach) throw new Error("the save control is not on the surface at all");
    if (!reach.regionScrolls) {
      throw new Error(
        "the row region does not scroll, so this scenario proves nothing about the frame",
      );
    }
    if (!reach.regionScrolled) {
      throw new Error("the rows never scrolled, so the end was never reached");
    }
    if (reach.bottom > reach.viewport || reach.top < 0) {
      throw new Error(
        `the save control sits at ${reach.top}–${reach.bottom} in a ${reach.viewport}px window — it is off screen`,
      );
    }
  });

  it("states the variable count on the surface", async () => {
    const count = await $(".env-editor .surface__count").getText();
    if (count.trim() !== `${VARIABLES} variables`) {
      throw new Error(`the surface states "${count}" rather than the true count`);
    }
  });
});
