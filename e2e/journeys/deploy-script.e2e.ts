import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { browser, $, expect } from "@wdio/globals";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";
const ARMOR = "-----BEGIN AGE ENCRYPTED FILE-----";
const SECRET_FILE = ".env.production";
const API_KEY = "live-key-9f3a";

const EXIT = {
  SUCCESS: 0,
  WRONG_PASSPHRASE: 3,
  NOT_FOUND: 4,
  NOT_SEALED: 5,
};

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";
const repoName = () => repo().split("/").pop() ?? "";

const sealBinary = join(root, "target", "release", "seal");
const script = join(root, "e2e", "cli", "deploy-script.sh");

interface Run {
  stdout: string;
  stderr: string;
  code: number;
}

function runScript(secretPath: string, passphraseFile: string): Run {
  try {
    const stdout = execFileSync(script, [secretPath, passphraseFile], {
      env: { ...process.env, SEAL_BINARY: sealBinary },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, stderr: "", code: 0 };
  } catch (error) {
    const failure = error as {
      status?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      code: failure.status ?? -1,
    };
  }
}

function runSeal(args: string[], passphraseFile?: string): Run {
  const full = passphraseFile
    ? `exec 3<"${passphraseFile}"; "${sealBinary}" ${args
        .map((a) => `"${a}"`)
        .join(" ")} --passphrase-fd 3`
    : `"${sealBinary}" ${args.map((a) => `"${a}"`).join(" ")}`;
  try {
    const stdout = execFileSync("/bin/sh", ["-c", full], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, stderr: "", code: 0 };
  } catch (error) {
    const failure = error as {
      status?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      code: failure.status ?? -1,
    };
  }
}

describe("a deploy script reads a secret at the moment of use", () => {
  const passwordFile = () => join(repo(), "..", "seal-e2e-password");
  const wrongPasswordFile = () => join(repo(), "..", "seal-e2e-wrong-password");

  before(async () => {
    mkdirSync(repo(), { recursive: true });
    writeFileSync(join(repo(), SECRET_FILE), `API_KEY=${API_KEY}\n`);
    writeFileSync(passwordFile(), `${PASSWORD}\n`);
    writeFileSync(wrongPasswordFile(), "not the password at all\n");
    chmodSync(script, 0o755);

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

    const home = $("button=Repositories");
    if (await home.isDisplayed().catch(() => false)) {
      await home.click();
    }
    const tile = $(`button*=${repoName()}`);
    await tile.waitForClickable({ timeout: 30000 });
    await tile.click();

    const seal = $(`button[aria-label="Seal ${SECRET_FILE}"]`);
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
        readFileSync(join(repo(), SECRET_FILE), "utf8").startsWith(ARMOR),
      { timeout: 30000, timeoutMsg: `${SECRET_FILE} never sealed` },
    );
  });

  it("resolves a file the desktop application sealed, from a real script", () => {
    const result = runScript(join(repo(), SECRET_FILE), passwordFile());

    if (result.code !== EXIT.SUCCESS) {
      throw new Error(
        `the deploy script failed with ${result.code}: ${result.stderr}`,
      );
    }
    if (result.stdout !== `deployed-with:${API_KEY}`) {
      throw new Error(
        `the script did not receive the secret the application sealed — got "${result.stdout}"`,
      );
    }
  });

  it("puts nothing but the secret on standard output", () => {
    const result = runSeal(["resolve", join(repo(), SECRET_FILE)], passwordFile());

    if (result.code !== EXIT.SUCCESS) {
      throw new Error(`resolve failed with ${result.code}: ${result.stderr}`);
    }
    if (result.stdout !== `API_KEY=${API_KEY}\n`) {
      throw new Error(
        `standard output carried more than the file's bytes: ${JSON.stringify(result.stdout)}`,
      );
    }
  });

  it("leaves the file sealed on disk after resolving it", () => {
    const onDisk = readFileSync(join(repo(), SECRET_FILE), "utf8");
    if (!onDisk.startsWith(ARMOR)) {
      throw new Error("resolving left the file readable on disk");
    }
  });

  it("tells a wrong password apart from a missing file, so a script can retry", () => {
    const wrong = runSeal(
      ["resolve", join(repo(), SECRET_FILE)],
      wrongPasswordFile(),
    );
    const missing = runSeal(
      ["resolve", join(repo(), ".env.does-not-exist")],
      passwordFile(),
    );

    if (wrong.code !== EXIT.WRONG_PASSPHRASE) {
      throw new Error(
        `a wrong password exited ${wrong.code}, not ${EXIT.WRONG_PASSPHRASE}`,
      );
    }
    if (missing.code !== EXIT.NOT_FOUND) {
      throw new Error(
        `a missing file exited ${missing.code}, not ${EXIT.NOT_FOUND}`,
      );
    }
    if (wrong.code === missing.code) {
      throw new Error(
        "a wrong password and a missing file are indistinguishable, so a retry loop cannot be written",
      );
    }
    if (wrong.stdout.length > 0 || missing.stdout.length > 0) {
      throw new Error("a failing resolve still wrote to standard output");
    }
  });

  it("says on standard error what went wrong, in the script author's language", () => {
    const wrong = runSeal(
      ["resolve", join(repo(), SECRET_FILE)],
      wrongPasswordFile(),
    );

    if (!/password/i.test(wrong.stderr)) {
      throw new Error(
        `the failure does not name the password as the cause: "${wrong.stderr.trim()}"`,
      );
    }
    if (/panicked|unwrap|RUST_BACKTRACE/.test(wrong.stderr)) {
      throw new Error(`a fault leaked to the script author: ${wrong.stderr}`);
    }
  });

  it("answers whether a file is sealed without asking for a password at all", () => {
    const sealed = runSeal(["status", join(repo(), SECRET_FILE)]);
    if (sealed.code !== EXIT.SUCCESS) {
      throw new Error(`status failed with ${sealed.code}: ${sealed.stderr}`);
    }
    if (!/sealed/i.test(sealed.stdout)) {
      throw new Error(`status did not report the file sealed: "${sealed.stdout}"`);
    }

    const readable = join(repo(), ".env.readable");
    writeFileSync(readable, "PLAIN=value\n");
    const plain = runSeal(["status", readable]);
    if (/^sealed/i.test(plain.stdout.trim())) {
      throw new Error("a readable file was reported as sealed");
    }
  });

  it("refuses a file that is not sealed with its own distinct code", () => {
    const readable = join(repo(), ".env.readable");
    writeFileSync(readable, "PLAIN=value\n");

    const result = runSeal(["resolve", readable], passwordFile());
    if (result.code !== EXIT.NOT_SEALED) {
      throw new Error(
        `resolving a readable file exited ${result.code}, not ${EXIT.NOT_SEALED}`,
      );
    }
  });
});
