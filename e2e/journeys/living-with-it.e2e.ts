import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { browser, $, expect } from "@wdio/globals";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";
const ARMOR = "-----BEGIN AGE ENCRYPTED FILE-----";
const FILES = ["alpha", "beta", "gamma"];

const here = dirname(fileURLToPath(import.meta.url));
const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";
const repoName = () => repo().split("/").pop() ?? "";

const running = () =>
  execFileSync("/bin/sh", [
    "-c",
    "pgrep -f 'target/release/seal-desktop' || true",
  ])
    .toString()
    .trim();

const kill = () => {
  execFileSync("/bin/sh", [
    "-c",
    "pkill -KILL -f 'target/release/seal-desktop' || true",
  ]);
};

const installBridge = () =>
  browser.execute(() => {
    const internals = (window as unknown as Record<string, unknown>)
      .__TAURI_INTERNALS__ as { invoke?: unknown } | undefined;
    if (typeof internals?.invoke !== "function") return;
    (window as unknown as Record<string, unknown>).__wdio_original_core__ = {
      invoke: (internals.invoke as (...args: unknown[]) => unknown).bind(internals),
    };
  });

async function relaunch() {
  const child = spawn(join(here, "..", "launch-fresh.sh"), [], {
    stdio: "ignore",
    detached: true,
    env: process.env,
  });
  child.unref();
  await browser.waitUntil(async () => running().length > 0, {
    timeout: 20000,
    timeoutMsg: "the relaunched application never appeared",
  });
  await browser.reloadSession();
  await installBridge();
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

async function goHome() {
  const home = $("button=Repositories");
  if (await home.isDisplayed().catch(() => false)) {
    await home.click();
  }
  await $("h1=Repositories").waitForDisplayed();
}

describe("living with it: the glance, the errors, and the bad day", () => {
  before(async () => {
    mkdirSync(repo(), { recursive: true });
    for (const name of FILES) {
      writeFileSync(
        join(repo(), `.env.${name}`),
        `SECRET_${name.toUpperCase()}=value-${name}\n`,
      );
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

    const confirm = $(`button=Manage ${FILES.length} files`);
    await confirm.waitForClickable({ timeout: 60000 });
    await confirm.click();

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

  it("surfaces an exposure the moment something readable appears, and names it", async () => {
    writeFileSync(join(repo(), `.env.${FILES[0]}`), "SECRET_ALPHA=in-the-clear\n");

    await $("button=Lock").click();
    await expect($("h1=Seal is locked")).toBeDisplayed();
    await enterPassphrase(PASSWORD);
    await openTheRepository();

    const alert = $(".exposure-alert");
    await expect(alert).toBeDisplayed();
    await expect(alert.$(`span*=.env.${FILES[0]}`)).toBeDisplayed();
  });

  it("clears the exposure once it is sealed again, from beside the problem", async () => {
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

    await expect($(".exposure-alert")).not.toBeDisplayed();
  });

  it("reports a managed file deleted outside Seal as not found, not as still sealed", async () => {
    unlinkSync(join(repo(), `.env.${FILES[1]}`));

    await $("button=Lock").click();
    await expect($("h1=Seal is locked")).toBeDisplayed();
    await enterPassphrase(PASSWORD);
    await openTheRepository();

    const row = $(`span=.env.${FILES[1]}`);
    await expect(row).toBeDisplayed();

    const state = await browser.execute((name: string) => {
      const rows = [...document.querySelectorAll(".row")];
      const match = rows.find((r) =>
        (r.querySelector(".row__name")?.textContent ?? "").includes(name),
      );
      const open = match?.querySelector(".row__open") as HTMLButtonElement | null;
      return {
        state: match?.querySelector(".row__state")?.textContent ?? null,
        openDisabled: open ? open.disabled : null,
      };
    }, `.env.${FILES[1]}`);

    if (state.state !== "Not found") {
      throw new Error(
        `a file deleted on disk still reads "${state.state}" — the interface is serving a recorded state rather than what is there`,
      );
    }
    if (state.openDisabled !== true) {
      throw new Error(
        "the deleted file can still be opened, which can only end in a fault",
      );
    }
  });

  it("survives the whole repository directory disappearing, with a way forward", async () => {
    rmSync(repo(), { recursive: true, force: true });

    await goHome();
    await browser.waitUntil(
      async () => {
        const tile = $(`button*=${repoName()}`);
        return await tile.isDisplayed().catch(() => false);
      },
      { timeout: 20000, timeoutMsg: "the repository vanished from the list with no trace" },
    );

    const body = await browser.execute(() => document.body.innerText);
    if (/panicked|unwrap|Err\(|thread '/.test(body)) {
      throw new Error(`a fault leaked into the interface: ${body.slice(0, 300)}`);
    }
  });

  it("keeps a way out of every screen it can be left on", async () => {
    const reachable = await browser.execute(() => {
      const buttons = [...document.querySelectorAll("button")];
      return buttons.some((b) => (b.textContent ?? "").includes("Repositories"));
    });
    if (!reachable && !(await $("h1=Repositories").isDisplayed().catch(() => false))) {
      throw new Error("no way back to the repository list from this screen");
    }
  });

  it("does not lose its footing when the process is killed mid-session", async () => {
    kill();
    await browser.waitUntil(async () => running().length === 0, {
      timeout: 15000,
      timeoutMsg: "the application survived the kill",
    });

    await relaunch();
    await expect($("h1=Seal is locked")).toBeDisplayed();
    await enterPassphrase(PASSWORD);
    await expect($("h1=Seal is locked")).not.toBeDisplayed();
  });
});
