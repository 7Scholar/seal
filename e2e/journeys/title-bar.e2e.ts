import { browser, $, expect } from "@wdio/globals";

const PASSWORD = "correct horse battery staple";

const CLICKABLE = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY"];
const INTERACTIVE_ROLES = [
  "button",
  "link",
  "menuitem",
  "tab",
  "checkbox",
  "radio",
  "switch",
  "option",
];

async function unlockIntoTheShell() {
  const choose = $("h1=Choose your master password");
  if (await choose.isDisplayed().catch(() => false)) {
    await browser.keys([...PASSWORD]);
    await browser.keys("Enter");
    await browser.pause(800);
  }
  await browser.keys([...PASSWORD]);
  await browser.keys("Enter");
  await $('nav[aria-label="Breadcrumb"]').waitForDisplayed({ timeout: 30000 });
}

const probe = function (clickable: string[], roles: string[]) {
  const CLICKABLE_TAGS = new Set(clickable);
  const ROLES = new Set(roles);

  function isClickableElement(el: Element) {
    return (
      CLICKABLE_TAGS.has(el.tagName) ||
      (el.hasAttribute("contenteditable") &&
        el.getAttribute("contenteditable") !== "false") ||
      (el.hasAttribute("tabindex") && el.getAttribute("tabindex") !== "-1") ||
      ROLES.has(el.getAttribute("role") ?? "")
    );
  }

  function isDragRegion(path: Element[]) {
    for (const el of path) {
      if (!(el instanceof HTMLElement)) continue;
      const attr = el.getAttribute("data-tauri-drag-region");
      if (isClickableElement(el) && attr === null) return false;
      if (attr === null) continue;
      if (attr === "false") return false;
      if (attr === "deep") return true;
      if (attr === "" || attr === "true") return el === path[0];
    }
    return false;
  }

  function pathOf(el: Element | null) {
    const path: Element[] = [];
    let node: Element | null = el;
    while (node) {
      path.push(node);
      node = node.parentElement;
    }
    return path;
  }

  const strip = document.querySelector(".shell__titlebar");
  const spacer = document.querySelector(".shell__spacer");
  const trail = document.querySelector('nav[aria-label="Breadcrumb"]');
  const current = document.querySelector(".crumbs__current");

  return {
    surfaces: {
      strip: strip ? isDragRegion(pathOf(strip)) : null,
      spacer: spacer ? isDragRegion(pathOf(spacer)) : null,
      trail: trail ? isDragRegion(pathOf(trail)) : null,
      currentSegment: current ? isDragRegion(pathOf(current)) : null,
    },
    controls: strip
      ? [...strip.querySelectorAll("button, input")].map((el) => ({
          name: el.getAttribute("aria-label") ?? el.textContent?.trim()?.slice(0, 24),
          swallowed: isDragRegion(pathOf(el)),
        }))
      : [],
  };
};

describe("the title bar is a real window control surface", () => {
  before(unlockIntoTheShell);

  it("drags the window from its empty space, its breadcrumb area, and the current segment", async () => {
    const { surfaces } = await browser.execute(probe, CLICKABLE, INTERACTIVE_ROLES);
    console.log("DRAG →", JSON.stringify(surfaces));

    const dead = Object.entries(surfaces).filter(([, ok]) => ok !== true);
    if (dead.length > 0) {
      throw new Error(
        `these parts of the strip cannot drag the window: ${JSON.stringify(dead)}`,
      );
    }
  });

  it("never swallows a press meant for one of the strip's own controls", async () => {
    const { controls } = await browser.execute(probe, CLICKABLE, INTERACTIVE_ROLES);
    console.log("CONTROLS →", JSON.stringify(controls));

    const swallowed = controls.filter((control) => control.swallowed);
    if (swallowed.length > 0) {
      throw new Error(
        `these strip controls would be unclickable: ${JSON.stringify(swallowed)}`,
      );
    }
  });

  it("keeps the strip's controls operable, and the theme applies live", async () => {
    await $('button[aria-label^="Theme:"]').click();
    await expect($("button=Light")).toBeDisplayed();
    await $("button=Light").click();

    const applied = await browser.execute(
      () => document.documentElement.dataset.theme,
    );
    if (applied !== "light") {
      throw new Error(`choosing Light did not apply it: ${applied}`);
    }

    await $('button[aria-label^="Theme:"]').click();
    await $("button=Dark").click();
    const back = await browser.execute(
      () => document.documentElement.dataset.theme,
    );
    if (back !== "dark") {
      throw new Error(`choosing Dark did not apply it: ${back}`);
    }
  });

  it("does not let the strip's own text be selected like content", async () => {
    const selectable = await browser.execute(() => {
      const strip = document.querySelector(".shell__titlebar");
      if (!strip) return null;
      const style = getComputedStyle(strip);
      return style.getPropertyValue("-webkit-user-select") || style.userSelect;
    });
    if (selectable !== "none") {
      throw new Error(`the strip's text is selectable: ${selectable}`);
    }
  });
});
