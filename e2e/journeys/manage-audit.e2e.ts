import { browser, $, expect } from "@wdio/globals";

const PASSWORD = "correct horse battery staple";

describe("manage surface audit", () => {
  it("gets past first open", async () => {
    await expect($("h1=Choose your master password")).toBeDisplayed();
    await browser.keys([...PASSWORD]);
    await browser.keys("Enter");
    await browser.keys([...PASSWORD]);
    await browser.keys("Enter");
    await expect($("h1=Repositories")).toBeDisplayed();
  });

  it("reaches the manage surface and measures it", async () => {
    await $(".tile--add button").click();
    await expect($("h1*=Seal in")).toBeDisplayed();

    const dump = await browser.execute(() => {
      const box = (el: Element | null) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      };
      const manage = document.querySelector(".manage");
      const tree = document.querySelector(".tree");
      const rows = [...document.querySelectorAll('[role="treeitem"]')].map((r) => {
        const rect = r.getBoundingClientRect();
        const cs = getComputedStyle(r);
        return {
          label: r.getAttribute("aria-label"),
          kind: r.getAttribute("data-kind"),
          checked: r.getAttribute("aria-checked"),
          expanded: r.getAttribute("aria-expanded"),
          quiet: r.getAttribute("data-quiet"),
          unwalked: r.getAttribute("data-unwalked"),
          tabindex: r.getAttribute("tabindex"),
          h: Math.round(rect.height),
          top: Math.round(rect.top),
          padLeft: cs.paddingLeft,
          hasCheckbox: !!r.querySelector("input.tree__check"),
          hasTwisty: !!r.querySelector("button.tree__twisty"),
          text: (r.textContent ?? "").trim(),
        };
      });
      return {
        shellPresent: !!document.querySelector(".shell"),
        titlebarPresent: !!document.querySelector(".shell__titlebar"),
        breadcrumbPresent: !!document.querySelector('nav[aria-label="Breadcrumb"]'),
        themeControlPresent: !!document.querySelector(".theme"),
        lockPresent: !!document.querySelector(".shell__lock"),
        window: { w: window.innerWidth, h: window.innerHeight },
        bodyScrollHeight: document.body.scrollHeight,
        docScrollHeight: document.documentElement.scrollHeight,
        manage: box(manage),
        manageComputed: manage
          ? {
              maxWidth: getComputedStyle(manage).maxWidth,
              padding: getComputedStyle(manage).padding,
            }
          : null,
        head: box(document.querySelector(".manage__head")),
        rootPath: document.querySelector(".manage__root")?.textContent,
        h1: document.querySelector(".manage h1")?.textContent,
        tree: box(tree),
        treeComputed: tree
          ? {
              maxHeight: getComputedStyle(tree).maxHeight,
              overflowY: getComputedStyle(tree).overflowY,
              scrollHeight: tree.scrollHeight,
              clientHeight: tree.clientHeight,
            }
          : null,
        footer: box(document.querySelector(".manage__actions")),
        footerButtons: [...document.querySelectorAll(".manage__actions button")].map(
          (b) => ({
            text: b.textContent,
            disabled: (b as HTMLButtonElement).disabled,
            classes: b.className,
          }),
        ),
        emptyText: document.querySelector(".manage__empty")?.textContent ?? null,
        rowCount: rows.length,
        rows,
        focusable: [...document.querySelectorAll(".manage [tabindex='0'], .manage button, .manage input")].map(
          (e) => ({
            tag: e.tagName,
            cls: e.className,
            tabindex: e.getAttribute("tabindex"),
            label: e.getAttribute("aria-label") ?? e.textContent?.trim().slice(0, 40),
          }),
        ),
      };
    });

    console.log("MANAGE_DUMP", JSON.stringify(dump, null, 1));
  });

  it("probes the inert folder click and keyboard reachability", async () => {
    const probe = await browser.execute(() => {
      const out: Record<string, unknown> = {};
      const rows = [...document.querySelectorAll('[role="treeitem"]')];
      const byLabel = (l: string) => rows.find((r) => r.getAttribute("aria-label") === l);

      const before = rows.map((r) => ({
        l: r.getAttribute("aria-label"),
        c: r.getAttribute("aria-checked"),
        e: r.getAttribute("aria-expanded"),
      }));
      out.before = before;

      const inert = rows.find(
        (r) =>
          r.getAttribute("data-kind") === "directory" &&
          r.getAttribute("aria-checked") === null &&
          !r.querySelector("input.tree__check"),
      );
      out.inertFolderLabel = inert?.getAttribute("aria-label") ?? null;
      out.inertFolderText = inert?.textContent?.trim() ?? null;
      out.inertFolderCursor = inert ? getComputedStyle(inert).cursor : null;
      out.inertFolderHasTwisty = inert ? !!inert.querySelector("button.tree__twisty") : null;

      out.directoriesWithNoCheckbox = rows
        .filter(
          (r) =>
            r.getAttribute("data-kind") === "directory" &&
            !r.querySelector("input.tree__check"),
        )
        .map((r) => r.getAttribute("aria-label"));
      out.directoriesTotal = rows.filter(
        (r) => r.getAttribute("data-kind") === "directory",
      ).length;

      out.docs = byLabel("docs") ? "present" : "absent";
      return out;
    });
    console.log("PROBE", JSON.stringify(probe, null, 1));

    const clicked = await browser.execute(() => {
      const rows = [...document.querySelectorAll('[role="treeitem"]')];
      const inert = rows.find(
        (r) =>
          r.getAttribute("data-kind") === "directory" &&
          !r.querySelector("input.tree__check"),
      ) as HTMLElement | undefined;
      if (!inert) return { clicked: false };
      const label = inert.getAttribute("aria-label");
      inert.click();
      return { clicked: true, label };
    });
    console.log("CLICKED", JSON.stringify(clicked));

    await browser.pause(300);

    const after = await browser.execute(() => {
      return [...document.querySelectorAll('[role="treeitem"]')].map((r) => ({
        l: r.getAttribute("aria-label"),
        c: r.getAttribute("aria-checked"),
        e: r.getAttribute("aria-expanded"),
      }));
    });
    console.log("AFTER_CLICK", JSON.stringify(after));
  });

  it("measures tab order into and out of the tree", async () => {
    const seq: unknown[] = [];
    await browser.execute(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      document.body.focus();
    });
    for (let i = 0; i < 10; i += 1) {
      await browser.keys("Tab");
      const now = await browser.execute(() => {
        const a = document.activeElement;
        if (!a) return null;
        const cs = getComputedStyle(a);
        return {
          tag: a.tagName,
          cls: (a as HTMLElement).className,
          role: a.getAttribute("role"),
          label: a.getAttribute("aria-label") ?? a.textContent?.trim().slice(0, 40),
          outline: cs.outlineWidth + " " + cs.outlineStyle,
        };
      });
      seq.push(now);
    }
    console.log("TABSEQ", JSON.stringify(seq, null, 1));
  });

  it("measures the scan-in-flight and enormous-tree behaviour", async () => {
    const timing = await browser.execute(() => {
      return {
        note: "measured separately",
        treeScroll: (() => {
          const t = document.querySelector(".tree");
          if (!t) return null;
          return { scrollHeight: t.scrollHeight, clientHeight: t.clientHeight };
        })(),
      };
    });
    console.log("TIMING", JSON.stringify(timing));
  });
});
