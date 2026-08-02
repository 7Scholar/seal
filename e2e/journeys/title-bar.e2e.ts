import { browser, $, expect } from "@wdio/globals";

const PASSWORD = "correct horse battery staple";

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

async function windowPosition() {
  return browser.execute(() => ({ x: window.screenX, y: window.screenY }));
}

describe("the title bar is a real window control surface", () => {
  before(unlockIntoTheShell);

  it("moves the window when the strip's empty space is dragged", async () => {
    const before = await windowPosition();

    const spacer = await $(".shell__spacer");
    await spacer.waitForExist();
    const origin = await spacer.getLocation();
    const size = await spacer.getSize();

    await browser
      .action("pointer")
      .move({
        x: Math.round(origin.x + size.width / 2),
        y: Math.round(origin.y + size.height / 2),
      })
      .down()
      .move({
        x: Math.round(origin.x + size.width / 2) + 90,
        y: Math.round(origin.y + size.height / 2) + 70,
        duration: 260,
      })
      .up()
      .perform();

    await browser.pause(500);
    const after = await windowPosition();
    const moved = { dx: after.x - before.x, dy: after.y - before.y };
    console.log("DRAG →", JSON.stringify({ before, after, moved }));

    if (moved.dx === 0 && moved.dy === 0) {
      throw new Error(
        `dragging the strip did not move the window: ${JSON.stringify({ before, after })}`,
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
