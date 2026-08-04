import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { browser, $, expect } from "@wdio/globals";
import { enterPassphrase, typeInto } from "./typing";

const PASSWORD = "correct horse battery staple";
const NEW_PASSWORD = "an entirely new master password";
const ARMOR = "-----BEGIN AGE ENCRYPTED FILE-----";
const FILES = ["one", "two", "three", "four", "five", "six"];

const here = dirname(fileURLToPath(import.meta.url));
const home = () => process.env.SEAL_E2E_HOME ?? "";
const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";
const repoName = () => repo().split("/").pop() ?? "";
const manifestPath = () => join(home(), ".config", "seal", "rekey.json");

interface Manifest {
  entries: { path: string; standing: string }[];
}

const readManifest = (): Manifest | null => {
  try {
    return JSON.parse(readFileSync(manifestPath(), "utf8")) as Manifest;
  } catch {
    return null;
  }
};

const sealedUnder = new Map<string, string>();

const recordCiphertexts = () => {
  for (const name of FILES) {
    sealedUnder.set(
      `.env.${name}`,
      readFileSync(join(repo(), `.env.${name}`), "utf8"),
    );
  }
};

const rewritten = () =>
  FILES.filter(
    (name) =>
      readFileSync(join(repo(), `.env.${name}`), "utf8") !==
      sealedUnder.get(`.env.${name}`),
  );

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

describe("an interrupted password change resumes and reports where every file stands", () => {
  before(async () => {
    mkdirSync(repo(), { recursive: true });
    for (const name of FILES) {
      writeFileSync(join(repo(), `.env.${name}`), `SECRET_${name.toUpperCase()}=value-${name}\n`);
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

    await $(`button[aria-label="Seal .env.${FILES[0]}"]`).waitForClickable();
    await $(`button[aria-label="Seal .env.${FILES[0]}"]`).click();
    const anyway = $("button=Seal it anyway");
    if (await anyway.waitForClickable({ timeout: 4000 }).catch(() => false)) {
      await anyway.click();
    }
    const gate = $('[role="dialog"] input');
    if (await gate.waitForDisplayed({ timeout: 6000 }).catch(() => false)) {
      await gate.setValue("I UNDERSTAND");
      await $("button=I understand — start sealing").click();
    }
    await $("span=Sealed").waitForDisplayed({ timeout: 30000 });

    for (const name of FILES.slice(1)) {
      const seal = $(`button[aria-label="Seal .env.${name}"]`);
      await seal.waitForClickable({ timeout: 30000 });
      await seal.click();
      const warn = $("button=Seal it anyway");
      if (await warn.waitForClickable({ timeout: 4000 }).catch(() => false)) {
        await warn.click();
      }
      await browser.waitUntil(
        async () =>
          readFileSync(join(repo(), `.env.${name}`), "utf8").startsWith(ARMOR),
        { timeout: 30000, timeoutMsg: `.env.${name} never sealed` },
      );
    }
  });

  it("is killed partway through the rotation, leaving a manifest that is genuinely partial", async () => {
    recordCiphertexts();

    await $('button[aria-label="Seal settings"]').click();
    await $("button=Change master password").click();
    await expect($("h1=Change your master password")).toBeDisplayed();

    await typeInto("#current", PASSWORD);
    await typeInto("#replacement", NEW_PASSWORD);
    await typeInto("#confirmation", NEW_PASSWORD);
    await typeInto("#phrase", "CHANGE MY PASSWORD");
    await $("button=Change the password").click();

    await browser.waitUntil(async () => rewritten().length > 0, {
      timeout: 120000,
      timeoutMsg: "no file was re-sealed, so the rotation never started work",
    });

    kill();
    await browser.waitUntil(async () => running().length === 0, {
      timeout: 15000,
      timeoutMsg: "the application survived the kill",
    });

    const manifest = readManifest();
    if (manifest === null) {
      throw new Error("the interruption left no manifest, so nothing can resume");
    }
    const converted = manifest.entries.filter((e) => e.standing === "converted");
    const moved = rewritten();
    console.log(
      `INTERRUPTED → manifest records ${converted.length} of ${manifest.entries.length} converted;`,
      `disk shows ${moved.length} re-sealed: ${moved.join(", ")}`,
    );

    if (moved.length === 0) {
      throw new Error("nothing was rewritten, so the run was not interrupted mid-work");
    }
    if (converted.length === 0) {
      throw new Error(
        "the interruption recorded nothing as converted, so the manifest cannot say what moved",
      );
    }
    if (converted.length === manifest.entries.length) {
      throw new Error("the rotation finished before it could be interrupted");
    }
  });

  it("says so unprompted on reopening, without being asked to look", async () => {
    await relaunch();

    await expect($("h1=Seal is locked")).toBeDisplayed();
    await enterPassphrase(NEW_PASSWORD);

    const banner = $(".shell__rekey");
    await expect(banner).toBeDisplayed();
    await expect(banner).toHaveText(
      expect.stringContaining("A password change was not finished"),
    );
    await expect(banner).toHaveText(expect.stringContaining("keep both"));
  });

  it("names which files are still on the old password, not a bare count", async () => {
    await $(".shell__rekey").$("button=Finish it").click();

    await expect($("h1=Change your master password")).toBeDisplayed();
    const resume = $(".rekey__resume");
    await expect(resume).toBeDisplayed();
    await expect(resume).toHaveText(
      expect.stringContaining("A password change was not finished"),
    );

    const manifest = readManifest();
    if (manifest === null) throw new Error("the manifest vanished before the resume");
    const outstanding = manifest.entries.filter((e) => e.standing !== "converted");

    for (const entry of outstanding) {
      const name = entry.path.split("/").pop() ?? "";
      await expect(resume.$(`span=${name}`)).toBeDisplayed();
    }

    const moved = rewritten();
    const named: string[] = [];
    for await (const row of resume.$$("span.rekey__path")) {
      named.push(await row.getText());
    }
    const misreported = moved.filter((name) => named.includes(`.env.${name}`));
    if (misreported.length > 0) {
      throw new Error(
        `the resume screen asks for the old password for ${misreported
          .map((name) => `.env.${name}`)
          .join(", ")}, which the interruption had already moved to the new one`,
      );
    }
  });

  it("resumes from where it stopped and finishes the job", async () => {
    await typeInto("#current", PASSWORD);
    await typeInto("#replacement", NEW_PASSWORD);
    await typeInto("#confirmation", NEW_PASSWORD);
    await typeInto("#phrase", "CHANGE MY PASSWORD");

    await $("button=Retry the rest").click();

    await browser.waitUntil(async () => readManifest() === null, {
      timeout: 120000,
      timeoutMsg: "the resumed rotation never completed",
    });

    await expect($(".shell__rekey")).not.toBeDisplayed();
  });

  it("leaves every file on the new password, and the old one opens nothing", async () => {
    await $("button=Lock").click();
    await expect($("h1=Seal is locked")).toBeDisplayed();

    await enterPassphrase(PASSWORD);
    await expect($('[role="status"][aria-label="Unlock status"]')).toHaveText(
      expect.stringContaining("did not open your files"),
    );

    await enterPassphrase(NEW_PASSWORD);
    await expect($("h1=Seal is locked")).not.toBeDisplayed();

    for (const name of FILES) {
      const contents = readFileSync(join(repo(), `.env.${name}`), "utf8");
      if (!contents.startsWith(ARMOR)) {
        throw new Error(`.env.${name} is not sealed after the rotation finished`);
      }
    }
  });
});
