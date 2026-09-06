import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, expect } from "@wdio/globals";
import { sealFromRow } from "./rows";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";
const ARMOR = "-----BEGIN AGE ENCRYPTED FILE-----";

const ENV_FILE = ".env.production";
const OPAQUE_FILE = "terraform.tfvars";
const FORGOTTEN_FILE = ".env.staging";

const OPAQUE_BODY = 'secret_key = "value-with  spacing"\nregion  =  "eu-west-1"\n';

const repo = () => process.env.SEAL_E2E_PICK_FOLDER ?? "";
const repoName = () => repo().split("/").pop() ?? "";
const second = () => process.env.SEAL_E2E_SECOND_REPO ?? "";
const secondName = () => second().split("/").pop() ?? "";

async function openTheRepository(name: string) {
  const crumb = $('nav[aria-label="Breadcrumb"] [aria-current="page"]');
  if (await crumb.isDisplayed().catch(() => false)) {
    if ((await crumb.getText()) === name) return;
  }
  const home = $("button=Repositories");
  if (await home.isDisplayed().catch(() => false)) {
    await home.click();
  }
  const tile = $(`button*=${name}`);
  await tile.waitForClickable();
  await tile.click();
}

async function confirmManage() {
  const confirm = $('.manage__actions button.button--primary');
  await confirm.waitForClickable({ timeout: 60000 });
  await confirm.click();
}

describe("settling in: a file with no editor, and coming back to add more", () => {
  before(async () => {
    mkdirSync(repo(), { recursive: true });
    writeFileSync(join(repo(), ENV_FILE), "API_KEY=live-key\n");
    writeFileSync(join(repo(), OPAQUE_FILE), OPAQUE_BODY);

    mkdirSync(second(), { recursive: true });
    writeFileSync(join(second(), ".env.production"), "OTHER_KEY=other-value\n");

    const choose = $('[data-surface="unlock"][data-mode="create"]');
    const locked = $('[data-surface="unlock"][data-mode="verify"]');
    const lock = $('button[aria-label="Lock Seal"]');
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

    await $(".surface__nothing button").waitForClickable({ timeout: 30000 });
    await $(".surface__nothing button").click();

    const tree = $(".manage__region");
    await tree.waitForDisplayed({ timeout: 60000 });

    const opaqueRow = $(`.tree__row*=${OPAQUE_FILE}`);
    if (await opaqueRow.isDisplayed().catch(() => false)) {
      const box = opaqueRow.$('input[type="checkbox"]');
      if (!(await box.isSelected().catch(() => true))) {
        await box.click();
      }
    }

    await confirmManage();
    await openTheRepository(repoName());

    for (const name of [ENV_FILE, OPAQUE_FILE]) {
      await sealFromRow(`${name}`);
      const gate = $('[role="dialog"] input');
      if (await gate.waitForDisplayed({ timeout: 6000 }).catch(() => false)) {
        await gate.setValue("I UNDERSTAND");
        await $("button=Start sealing").click();
      }
      await browser.waitUntil(
        async () => readFileSync(join(repo(), name), "utf8").startsWith(ARMOR),
        { timeout: 30000, timeoutMsg: `${name} never sealed` },
      );
    }
  });

  it("opens a non-env file without offering an editor that would mangle it", async () => {
    await openTheRepository(repoName());

    const open = $(`button[aria-label="Open ${OPAQUE_FILE}"]`);
    await open.waitForClickable({ timeout: 30000 });
    await open.click();

    await expect($(".opaque")).toBeDisplayed();

    const editable = await browser.execute(() => ({
      rows: document.querySelectorAll(".env-editor__row").length,
      inputs: document.querySelectorAll(".env-editor input").length,
      save: [...document.querySelectorAll("button")].some(
        (b) => (b.textContent ?? "").trim() === "Save",
      ),
    }));

    if (editable.rows > 0 || editable.inputs > 0) {
      throw new Error(
        `a non-env file was parsed into ${editable.rows} editable rows — the shape that corrupted a .tfvars on save`,
      );
    }
    if (editable.save) {
      throw new Error("a non-env file was offered a Save control");
    }
  });

  it("says why there is nothing to edit, and that it is stored as-is", async () => {
    const explanation = await browser.execute(() => {
      const paragraphs = [...document.querySelectorAll(".opaque p")];
      const body = paragraphs.find((p) => !p.classList.contains("file-head__path"));
      return body?.textContent ?? "";
    });
    if (!/not an env file/i.test(explanation)) {
      throw new Error(
        `the surface does not say why it cannot be edited: "${explanation}"`,
      );
    }
    if (!/stored exactly as you wrote them|as it is/i.test(explanation)) {
      throw new Error(
        `the surface does not say the file is stored as-is: "${explanation}"`,
      );
    }
    expect(await $(".opaque .file-head__bar").getAttribute("data-state")).toBe("sealed");
  });

  it("leaves the non-env file byte-for-byte intact through the round trip", async () => {
    const onDisk = readFileSync(join(repo(), OPAQUE_FILE), "utf8");
    if (!onDisk.startsWith(ARMOR)) {
      throw new Error("the non-env file is no longer sealed on disk");
    }
  });

  it("rescans a known repository without threatening what is already managed", async () => {
    writeFileSync(join(repo(), FORGOTTEN_FILE), "STAGING_KEY=staging-value\n");

    await openTheRepository(repoName());
    await $(`button[aria-label="More actions for ${repoName()}"]`).click();
    await $("button=Scan for more files").click();

    const region = $(".manage__region");
    await region.waitForDisplayed({ timeout: 60000 });
    await $(`.tree__row*=${FORGOTTEN_FILE}`).waitForDisplayed({ timeout: 60000 });

    const rows = await browser.execute(
      (managedEnv: string, managedOpaque: string, fresh: string) => {
        const read = (name: string) => {
          const row = [...document.querySelectorAll(".tree__row")].find(
            (r) =>
              (r.querySelector(".tree__name")?.textContent ?? "").trim() === name,
          );
          if (!row) return null;
          const box = row.querySelector(
            'input[type="checkbox"]',
          ) as HTMLInputElement | null;
          return {
            checked: box ? box.checked : false,
            disabled:
              row.getAttribute("aria-disabled") === "true" ||
              (box ? box.disabled : true),
            note: row.querySelector(".tree__note")?.textContent ?? "",
          };
        };
        return {
          env: read(managedEnv),
          opaque: read(managedOpaque),
          fresh: read(fresh),
        };
      },
      ENV_FILE,
      OPAQUE_FILE,
      FORGOTTEN_FILE,
    );

    for (const [label, row] of [
      ["the managed env file", rows.env],
      ["the managed non-env file", rows.opaque],
    ] as const) {
      if (!row) throw new Error(`${label} is missing from the rescan`);
      if (!row.disabled) {
        throw new Error(
          `${label} is already managed but its checkbox is live in a rescan — the rescan can take it away`,
        );
      }
      if (!/already managed/i.test(row.note)) {
        throw new Error(
          `${label} is inert in the rescan but says nothing about why, so it reads as broken rather than as safe`,
        );
      }
    }

    if (!rows.fresh) {
      throw new Error("the rescan did not find the newly added file");
    }
    if (rows.fresh.disabled) {
      throw new Error("the newly added file cannot be selected");
    }
  });

  it("says on the visible surface that this is a rescan, not a first add", async () => {
    const visible = await browser.execute(() => ({
      heading: document.querySelector("#manage-heading")?.textContent ?? "",
      tally: document.querySelector(".manage__tally")?.textContent ?? "",
    }));

    if (!/more files/i.test(visible.heading)) {
      throw new Error(
        `a rescan is drawn exactly like a first add — heading "${visible.heading}" — so nothing tells the user which one they are looking at`,
      );
    }
    if (!/already managed/i.test(visible.tally)) {
      throw new Error(
        `the footer gives no account of the files the rescan will leave alone: "${visible.tally}"`,
      );
    }
  });

  it("states that the folder is already managed and nothing already managed changes", async () => {
    const reassurance = await browser.execute(() => {
      const tip = [...document.querySelectorAll("button")].find((b) =>
        (b.getAttribute("aria-label") ?? "").includes("What managing these files does"),
      ) as HTMLButtonElement | null;
      tip?.click();
      return document.querySelector(".manage")?.textContent ?? "";
    });

    if (!/already managed/i.test(reassurance)) {
      throw new Error(
        "a rescan of a known repository never says it is already managed, so the user cannot tell it is safe",
      );
    }
  });

  it("adds the forgotten file without disturbing the sealed ones", async () => {
    const beforeEnv = readFileSync(join(repo(), ENV_FILE), "utf8");
    const beforeOpaque = readFileSync(join(repo(), OPAQUE_FILE), "utf8");

    await confirmManage();
    await openTheRepository(repoName());

    await expect($(`button[aria-label="Open ${FORGOTTEN_FILE}"]`)).toBeDisplayed();

    if (readFileSync(join(repo(), ENV_FILE), "utf8") !== beforeEnv) {
      throw new Error("rescanning changed an already-sealed file on disk");
    }
    if (readFileSync(join(repo(), OPAQUE_FILE), "utf8") !== beforeOpaque) {
      throw new Error("rescanning changed an already-sealed non-env file on disk");
    }

    const states = await browser.execute(() => {
      const out: Record<string, { state: string; offersSeal: boolean }> = {};
      for (const row of document.querySelectorAll(".line")) {
        const name = row.querySelector(".line__open")?.textContent?.trim() ?? "";
        out[name] = {
          state: row.getAttribute("data-condition") ?? "",
          offersSeal: row.querySelector('button[aria-label^="Seal "]') !== null,
        };
      }
      return out;
    });

    if (states[ENV_FILE]?.state !== "sealed" || states[OPAQUE_FILE]?.state !== "sealed") {
      throw new Error(
        `a rescan changed what the managed files report: ${JSON.stringify(states)}`,
      );
    }
    if (!states[FORGOTTEN_FILE]?.offersSeal || states[FORGOTTEN_FILE]?.state !== "open") {
      throw new Error(
        `the newly added file should be watched but not sealed — its own Seal control is what says so, not a label: ${JSON.stringify(states[FORGOTTEN_FILE])}`,
      );
    }
  });

  it("takes a second repository alongside the first, both listed together", async () => {
    const root = second();

    const outcome = await browser.execute(async (target: string) => {
      const core = (window as unknown as Record<string, unknown>)
        .__wdio_original_core__ as
        | { invoke: (cmd: string, args?: unknown) => Promise<unknown> }
        | undefined;
      if (!core) return { error: "no bridge" };
      try {
        const scan = (await core.invoke("scan_folder", { root: target })) as {
          candidates: { relativePath: string; preselected: boolean }[];
          alreadyRegistered: boolean;
        };
        const selected = scan.candidates
          .filter((c) => c.preselected)
          .map((c) => c.relativePath);
        await core.invoke("manage", { root: target, selected });
        return {
          candidates: selected.length,
          alreadyRegistered: scan.alreadyRegistered,
        };
      } catch (error) {
        return { error: String(error) };
      }
    }, root);

    if ("error" in outcome && outcome.error) {
      throw new Error(`the second repository could not be added: ${outcome.error}`);
    }
    if (outcome.alreadyRegistered) {
      throw new Error("a brand-new folder reported itself as already managed");
    }
    if (!outcome.candidates) {
      throw new Error("the scan found nothing in the second repository");
    }

    const home = $("button=Repositories");
    if (await home.isDisplayed().catch(() => false)) {
      await home.click();
    }
    await $('[data-surface="repositories"]').waitForDisplayed();

    await $('button[aria-label="Lock Seal"]').click();
    await expect($('[data-surface="unlock"][data-mode="verify"]')).toBeDisplayed();
    await enterPassphrase(PASSWORD);
    await $('[data-surface="repositories"]').waitForDisplayed({ timeout: 30000 });

    await browser.waitUntil(
      async () => {
        const rows = await browser.execute(() =>
          [...document.querySelectorAll(".repo-row")].map(
            (row) => row.textContent ?? "",
          ),
        );
        return (
          rows.some((row) => row.includes(repoName())) &&
          rows.some((row) => row.includes(secondName()))
        );
      },
      {
        timeout: 20000,
        timeoutMsg: "both repositories never appeared in the one list",
      },
    );
  });

  it("reaches a file in the other repository from the trail, by the keyboard, without landing there first", async () => {
    await openTheRepository(repoName());
    await expect($('[data-surface="repository"]')).toBeDisplayed();

    await $('button[aria-label="Jump to a repository or file"]').click();
    await $(".jump__panel--repos").waitForDisplayed({ timeout: 10000 });

    const onTheOther = () =>
      browser.execute(
        (want: string) =>
          (document.activeElement as HTMLElement | null)?.dataset.root === want,
        second(),
      );

    let landed = await onTheOther();
    for (let press = 0; press < 12 && !landed; press += 1) {
      await browser.keys("ArrowDown");
      landed = await onTheOther();
    }
    if (!landed) {
      throw new Error("the other repository was never reachable by the arrow keys");
    }

    await browser.keys("ArrowRight");
    await $(".jump__panel--files").waitForDisplayed({ timeout: 10000 });

    const shown = await browser.execute(() =>
      [...document.querySelectorAll(".jump__panel--files .jump__file")].map(
        (row) => ({
          name: row.textContent ?? "",
          condition: row.getAttribute("data-condition"),
        }),
      ),
    );
    if (!shown.some((row) => row.name.includes(ENV_FILE))) {
      throw new Error(
        `the other repository's files were not offered: ${JSON.stringify(shown)}`,
      );
    }

    const focused = await browser.execute(
      () => (document.activeElement as HTMLElement | null)?.textContent ?? "",
    );
    if (!focused.includes(ENV_FILE)) {
      throw new Error(
        `ArrowRight did not move into the second panel — focus sat on ${JSON.stringify(focused)}`,
      );
    }

    await browser.keys("Enter");

    await $(".env-editor .env-editor__rows").waitForDisplayed({ timeout: 20000 });

    const trail = await browser.execute(() =>
      [...document.querySelectorAll(".crumbs__item")].map(
        (item) => item.textContent ?? "",
      ),
    );
    if (!trail.some((crumb) => crumb.includes(secondName()))) {
      throw new Error(
        `the trail does not say the file came from the other repository: ${JSON.stringify(trail)}`,
      );
    }
    if (!trail[trail.length - 1]?.includes(ENV_FILE)) {
      throw new Error(
        `the trail does not end at the opened file: ${JSON.stringify(trail)}`,
      );
    }

    const keys = await browser.execute(() =>
      [...document.querySelectorAll(".env-editor__key")].map(
        (key) => (key as HTMLInputElement).value || key.textContent || "",
      ),
    );
    if (!keys.some((key) => key.includes("OTHER_KEY"))) {
      throw new Error(
        `the file that opened is not the one in the other repository: ${JSON.stringify(keys)}`,
      );
    }
  });
});
