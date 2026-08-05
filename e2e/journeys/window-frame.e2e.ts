import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browser, $, expect } from "@wdio/globals";
import { enterPassphrase } from "./typing";

const PASSWORD = "correct horse battery staple";

interface Frame {
  dragRegions: number;
  titlebarTop: number | null;
  surfaceTop: number | null;
  surfaceHeight: number | null;
  viewportHeight: number;
}

const frame = (surface: string) =>
  browser.execute((selector: string) => {
    const strip = document.querySelector(".shell__titlebar");
    const element = document.querySelector(selector);
    return {
      dragRegions: document.querySelectorAll("[data-tauri-drag-region]").length,
      titlebarTop: strip ? strip.getBoundingClientRect().top : null,
      surfaceTop: element ? element.getBoundingClientRect().top : null,
      surfaceHeight: element ? element.getBoundingClientRect().height : null,
      viewportHeight: window.innerHeight,
    };
  }, surface) as Promise<Frame>;

const region = () =>
  browser.execute(() => {
    const element = document.querySelector(".manage__region");
    const documentScrolls =
      document.documentElement.scrollHeight >
      document.documentElement.clientHeight + 1;
    if (!element) return null;
    return {
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      scrolls: element.scrollHeight > element.clientHeight + 1,
      documentScrolls,
    };
  }) as Promise<{
    scrollHeight: number;
    clientHeight: number;
    scrolls: boolean;
    documentScrolls: boolean;
  } | null>;

function assertFramed(where: string, measured: Frame) {
  console.log(`FRAME ${where} →`, JSON.stringify(measured));

  if (measured.dragRegions === 0) {
    throw new Error(
      `${where}: no [data-tauri-drag-region] in the document, so the window cannot be dragged or zoomed from this surface`,
    );
  }
  if (measured.titlebarTop === null) {
    throw new Error(`${where}: the title bar strip is absent from this surface`);
  }
  if (measured.surfaceTop === null) {
    throw new Error(`${where}: the surface itself was not found`);
  }
  if (measured.surfaceTop < 20) {
    throw new Error(
      `${where}: the surface starts at top ${measured.surfaceTop}, underneath the platform's window controls`,
    );
  }
}

describe("every surface sits in the window's frame", () => {
  it("carries the title bar on the locked screen, before anything is established", async () => {
    await expect($("h1=Choose your master password")).toBeDisplayed();
    assertFramed("locked", await frame(".unlock"));

    const strip = await browser.execute(() => {
      const bar = document.querySelector(".shell__titlebar");
      const unlocked = document.querySelector(".shell__main");
      if (!bar || !unlocked) return null;
      const style = getComputedStyle(bar);
      return {
        background: style.backgroundColor,
        border: style.borderBottomColor,
        borderWidth: style.borderBottomWidth,
      };
    });

    if (!strip) throw new Error("locked: the shell or its strip is absent");
    if (strip.background.includes("rgba(0, 0, 0, 0)")) {
      throw new Error(
        `locked: the strip is transparent (${strip.background}) rather than carrying the same bar as every other surface`,
      );
    }
    if (
      strip.border.includes("rgba(0, 0, 0, 0)") ||
      strip.borderWidth === "0px"
    ) {
      throw new Error(
        `locked: the strip draws no divider (${strip.border} at ${strip.borderWidth}) where every other surface has one`,
      );
    }
  });

  it("carries the title bar on the manage surface, which does not scroll as a document", async () => {
    await enterPassphrase(PASSWORD);
    await expect($('[role="status"][aria-label="Unlock status"]')).toHaveText(
      expect.stringContaining("confirm"),
    );
    await enterPassphrase(PASSWORD);
    await expect($("h1=Repositories")).toBeDisplayed();

    const repo = process.env.SEAL_E2E_PICK_FOLDER ?? "";
    for (let service = 0; service < 12; service += 1) {
      const folder = join(repo, `service-${service}`);
      mkdirSync(folder, { recursive: true });
      writeFileSync(join(folder, ".env"), "API_KEY=sk-live-1234567890abcdef\n");
      for (let index = 0; index < 4; index += 1) {
        writeFileSync(join(folder, `file-${index}.txt`), "filler\n");
      }
    }
    writeFileSync(join(repo, ".env"), "API_KEY=sk-live-1234567890abcdef\n");

    await $(".tile--add button").click();
    await expect($("h1*=Seal in")).toBeDisplayed();

    const measured = await frame(".manage");
    const measuredRegionFirst = await region();
    console.log("REGION(pre) →", JSON.stringify(measuredRegionFirst));
    assertFramed("manage", measured);

    if (
      measured.surfaceHeight !== null &&
      measured.surfaceHeight > measured.viewportHeight
    ) {
      throw new Error(
        `manage: the surface is ${measured.surfaceHeight}px tall in a ${measured.viewportHeight}px viewport, so its fixed header and footer scroll away`,
      );
    }

    const measuredRegion = await region();
    console.log("REGION →", JSON.stringify(measuredRegion));
    if (!measuredRegion) throw new Error("manage: the tree region is absent");
    if (!measuredRegion.scrolls) {
      throw new Error(
        `manage: the tree region does not scroll (scrollHeight ${measuredRegion.scrollHeight} === clientHeight ${measuredRegion.clientHeight}), so the document scrolls instead`,
      );
    }
    if (measuredRegion.documentScrolls) {
      throw new Error(
        "manage: the document itself scrolls, so the chrome leaves the viewport",
      );
    }
  });

  it("keeps the header and footer in view when the tree is scrolled to its end", async () => {
    await browser.execute(() => {
      const element = document.querySelector(".manage__region");
      if (element) element.scrollTop = element.scrollHeight;
    });
    await browser.pause(200);

    const measured = await browser.execute(() => {
      const head = document.querySelector(".manage__head");
      const actions = document.querySelector(".manage__actions");
      return {
        headTop: head ? head.getBoundingClientRect().top : null,
        actionsBottom: actions ? actions.getBoundingClientRect().bottom : null,
        viewportHeight: window.innerHeight,
      };
    });
    console.log("SCROLLED →", JSON.stringify(measured));

    if (measured.headTop === null || measured.actionsBottom === null) {
      throw new Error("the manage chrome is absent");
    }
    if (measured.headTop < 0) {
      throw new Error(
        `the header scrolled out of view (top ${measured.headTop})`,
      );
    }
    if (measured.actionsBottom > measured.viewportHeight + 1) {
      throw new Error(
        `the footer scrolled out of view (bottom ${measured.actionsBottom} in a ${measured.viewportHeight}px viewport)`,
      );
    }
  });

  it("carries the title bar on the password-change surface", async () => {
    await $("button=Cancel").click();
    await expect($("h1=Repositories")).toBeDisplayed();

    await $('button[aria-label="Seal settings"]').click();
    await $("button=Change master password").click();
    await expect($("h1*=master password")).toBeDisplayed();

    assertFramed("password change", await frame(".rekey"));
  });
});
