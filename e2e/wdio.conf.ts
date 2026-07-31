import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
process.env.SEAL_E2E_HOME ??= mkdtempSync(join(tmpdir(), "seal-e2e-home-"));
process.env.SEAL_E2E_PICK_FOLDER ??= mkdtempSync(join(tmpdir(), "seal-e2e-repo-"));

export const config = {
  runner: "local",
  specs: ["./journeys/first-run.e2e.ts"],
  maxInstances: 1,
  capabilities: [
    {
      browserName: "tauri",
      "tauri:options": {
        application: join(here, "launch-fresh.sh"),
      },
    },
  ],
  services: [
    [
      "tauri",
      {
        driverProvider: "embedded",
        startTimeout: 60000,
        clearMocks: false,
        resetMocks: false,
        restoreMocks: false,
      },
    ],
  ],
  framework: "mocha",
  mochaOpts: { ui: "bdd", timeout: 180000 },
  reporters: ["spec"],
  logLevel: "warn",
  waitforTimeout: 15000,
  afterTest: async function (
    test: { title: string },
    _context: unknown,
    result: { passed: boolean },
  ) {
    if (result.passed) return;
    const { browser } = await import("@wdio/globals");
    const state = await browser
      .execute(() => ({
        h1: document.querySelector("h1")?.textContent,
        alerts: [...document.querySelectorAll('[role="alert"]')].map((a) =>
          a.textContent?.slice(0, 160),
        ),
        dialog: document.querySelector('[role="dialog"]')?.textContent?.slice(0, 160),
        status: document.querySelector('[role="status"]')?.textContent,
      }))
      .catch(() => "(page unreachable)");
    console.log("FAILDUMP", test.title, "→", JSON.stringify(state));
  },
};
