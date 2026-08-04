import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, expect } from "@wdio/globals";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";
const ARMOR = "-----BEGIN AGE ENCRYPTED FILE-----";
const LIFETIME_SECONDS = Number(
  process.env.SEAL_E2E_PLAINTEXT_LIFETIME_SECONDS ?? "0",
);
const SECRET = "sk-live-expiring-42";

const repo = process.env.SEAL_E2E_PICK_FOLDER ?? "";
const repoName = repo.split("/").pop() ?? "";
const file = join(repo, ".env.production");

function requireShortLifetime() {
  if (!Number.isInteger(LIFETIME_SECONDS) || LIFETIME_SECONDS <= 0) {
    throw new Error(
      `this scenario must be run through e2e/wdio.expiry.conf.ts, which launches the application with a short plaintext lifetime; without it nothing this scenario observes about expiry would mean anything`,
    );
  }
}

async function openTheRepository() {
  const crumb = $('nav[aria-label="Breadcrumb"] [aria-current="page"]');
  if (await crumb.isDisplayed().catch(() => false)) {
    if ((await crumb.getText()) === repoName) return;
  }
  const back = $("button=Repositories");
  if (await back.isDisplayed().catch(() => false)) {
    await back.click();
  }
  const tile = $(`button*=${repoName}`);
  await tile.waitForClickable({ timeout: 30000 });
  await tile.click();
}

describe("stepping away: held plaintext expires on its own", () => {
  before(async () => {
    mkdirSync(repo, { recursive: true });
    writeFileSync(file, `API_KEY=${SECRET}\nDATABASE_URL=postgres://host/db\n`);

    requireShortLifetime();

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

    const alreadyManaged = await $(`button*=${repoName}`)
      .isDisplayed()
      .catch(() => false);

    if (!alreadyManaged) {
      await $(".tile--add button").waitForClickable({ timeout: 30000 });
      await $(".tile--add button").click();

      const confirm = $("button=Manage 1 file");
      const ready = await confirm
        .waitForClickable({ timeout: 30000 })
        .catch(() => false);
      if (ready === false) {
        const seen = await browser.execute(() => ({
          body: document.body.innerText.slice(0, 600),
          buttons: [...document.querySelectorAll("button")].map((b) => ({
            text: (b.textContent ?? "").slice(0, 40),
            disabled: (b as HTMLButtonElement).disabled,
          })),
        }));
        throw new Error(
          `the manage surface never offered one file: ${JSON.stringify(seen)}`,
        );
      }
      await confirm.click();
    }

    await openTheRepository();

    if (readFileSync(file, "utf8").startsWith(ARMOR)) return;

    const seal = $('button[aria-label="Seal .env.production"]');
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
      async () => readFileSync(file, "utf8").startsWith(ARMOR),
      { timeout: 30000, timeoutMsg: ".env.production never sealed" },
    );
  });

  it("holds the secret while the user is actually working", async () => {
    const open = $('button[aria-label="Open .env.production"]');
    await open.waitForClickable({ timeout: 30000 });
    await open.click();

    await $('button[aria-label="Reveal value for API_KEY"]').waitForClickable({
      timeout: 30000,
    });
    await $('button[aria-label="Reveal value for API_KEY"]').click();
    await expect($(".secret-value__text")).toHaveText(SECRET);
    await $('button[aria-label="Reveal value for API_KEY"]').click();
  });

  it("lets the held plaintext expire while the user is away", async () => {
    await browser.pause((LIFETIME_SECONDS + 2) * 1000);

    const body = await browser.execute(() => document.body.innerText);
    if (body.includes(SECRET)) {
      throw new Error("the secret is still on screen after its lifetime elapsed");
    }
  });

  it("keeps the expired secret out of Rust, whatever the screen still shows", async () => {
    await openTheRepository();
    const reopen = $('button[aria-label="Open .env.production"]');
    await reopen.waitForClickable({ timeout: 30000 });
    await reopen.click();

    const toggle = $('button[aria-label="Reveal value for API_KEY"]');
    await toggle.waitForClickable({ timeout: 30000 });
    await toggle.click();
    await expect($(".secret-value__text[data-revealed='true']")).toBeDisplayed();

    await browser.pause((LIFETIME_SECONDS + 2) * 1000);

    const probe = await browser.execute(async (path: string) => {
      const internals = (window as unknown as Record<string, unknown>)
        .__TAURI_INTERNALS__ as
        | { invoke?: (cmd: string, args: unknown) => Promise<unknown> }
        | undefined;
      if (typeof internals?.invoke !== "function") return { bridge: false };
      try {
        await internals.invoke("reveal", { path, key: "API_KEY" });
        return { bridge: true, refused: false, kind: null };
      } catch (error) {
        const kind = (error as { kind?: string } | null)?.kind ?? String(error);
        return { bridge: true, refused: true, kind };
      }
    }, file);

    if (probe.bridge !== true) {
      throw new Error("the probe could not reach Tauri, so it proved nothing");
    }
    if (probe.refused !== true) {
      throw new Error(
        "Rust still handed back the plaintext after its lifetime elapsed — the secret never expired",
      );
    }
    if (probe.kind !== "notOpen") {
      throw new Error(
        `expiry was refused for the wrong reason (${probe.kind}), so this proves nothing about the deadline`,
      );
    }
  });

  it("says plainly that it expired rather than failing silently", async () => {
    const toggle = $('button[aria-label="Reveal value for API_KEY"]');
    if ((await toggle.getAttribute("aria-pressed")) === "true") {
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();

    const problem = $(".problem");
    await problem.waitForDisplayed({ timeout: 15000 });

    const text = await problem.getText();
    if (!/expired|no longer open/i.test(text)) {
      throw new Error(
        `an expired secret was refused without saying why: "${text}"`,
      );
    }
    if (/panicked|unwrap|Err\(|NotOpen/.test(text)) {
      throw new Error(`the explanation is in Seal's vocabulary, not the user's: "${text}"`);
    }
  });

  it("never leaves the expired secret readable on disk", () => {
    if (!readFileSync(file, "utf8").startsWith(ARMOR)) {
      throw new Error("the file was left unsealed on disk after expiry");
    }
  });

  it("lets the user pick straight back up by opening it again", async () => {
    await openTheRepository();

    const open = $('button[aria-label="Open .env.production"]');
    await open.waitForClickable({ timeout: 30000 });
    await open.click();

    await $('button[aria-label="Reveal value for API_KEY"]').waitForClickable({
      timeout: 30000,
    });
    await $('button[aria-label="Reveal value for API_KEY"]').click();
    await expect($(".secret-value__text")).toHaveText(SECRET);
  });
});
