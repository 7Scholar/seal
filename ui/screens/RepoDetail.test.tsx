import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RepoDetail, type Outcomes } from "./RepoDetail";
import type { Load } from "./Repositories";
import type { RepoView } from "../ipc";

const app: RepoView = {
  root: "/repos/app",
  name: "app",
  files: [
    { relativePath: ".env.production", state: "sealed", alert: false },
    { relativePath: ".env", state: "plaintext", alert: false },
  ],
};

function setup(
  repo: RepoView = app,
  outcomes: Outcomes | null = null,
  load: Load = "ready",
) {
  const handlers = {
    onOpen: vi.fn(),
    onSeal: vi.fn(),
    onRelease: vi.fn(),
    onReleaseRepo: vi.fn(),
    onRescan: vi.fn(),
    onSealAll: vi.fn(),
    onUnseal: vi.fn(),
    onDismissOutcomes: vi.fn(),
    onRetry: vi.fn(),
  };
  const view = render(
    <RepoDetail repo={repo} load={load} outcomes={outcomes} {...handlers} />,
  );
  return { ...handlers, view };
}

const lines = () => [...document.querySelectorAll(".line")];
const conditionOf = (name: string) =>
  lines()
    .find((line) => (line.textContent ?? "").includes(name))
    ?.getAttribute("data-condition");

describe("RepoDetail, the tree", () => {
  it("draws a folder for every level of a nested path, and the file under it", () => {
    setup({
      ...app,
      files: [
        { relativePath: "apps/app/.env", state: "sealed", alert: false },
        { relativePath: "apps/api/.env", state: "plaintext", alert: false },
        { relativePath: ".npmrc", state: "sealed", alert: false },
      ],
    });

    expect(screen.getByText("apps")).toBeInTheDocument();
    expect(screen.getByText("app")).toBeInTheDocument();
    expect(screen.getByText("api")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open apps/app/.env" }),
    ).toHaveTextContent(".env");
  });

  it("keeps the state bar in its own lane, so nesting never moves it", () => {
    setup({
      ...app,
      files: [
        { relativePath: "a/b/c/.env", state: "sealed", alert: false },
        { relativePath: ".env", state: "sealed", alert: false },
      ],
    });

    const offsets = [...document.querySelectorAll(".line__bar")].map(
      (bar) => (bar as HTMLElement).previousElementSibling,
    );
    expect(offsets.every((before) => before === null)).toBe(true);
  });

  it("indents deeper files further, without indenting the bar", () => {
    setup({
      ...app,
      files: [
        { relativePath: "a/b/.env", state: "sealed", alert: false },
        { relativePath: ".env", state: "sealed", alert: false },
      ],
    });

    const widths = [...document.querySelectorAll(".line__indent")].map(
      (span) => (span as HTMLElement).style.width,
    );
    expect(widths).toContain("14px");
    expect(widths).toContain("54px");
  });

  it("gives a folder no state bar and no menu", () => {
    setup({
      ...app,
      files: [{ relativePath: "apps/.env", state: "sealed", alert: false }],
    });

    const folder = lines().find((line) => line.classList.contains("line--folder"));
    expect(folder).toBeDefined();
    expect(folder!.querySelector(".line__menu")).toBeNull();
    expect(folder!.getAttribute("data-condition")).toBeNull();
  });

  it("collapses a folder and shows it again", async () => {
    const user = userEvent.setup();
    setup({
      ...app,
      files: [{ relativePath: "apps/.env", state: "sealed", alert: false }],
    });

    expect(screen.getByRole("button", { name: "Open apps/.env" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse apps" }));
    expect(screen.queryByRole("button", { name: "Open apps/.env" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Expand apps" }));
    expect(screen.getByRole("button", { name: "Open apps/.env" })).toBeInTheDocument();
  });

  it("reveals a match inside a collapsed folder while filtering, and re-collapses after", async () => {
    const user = userEvent.setup();
    setup({
      ...app,
      files: [{ relativePath: "apps/.env.staging", state: "sealed", alert: false }],
    });

    await user.click(screen.getByRole("button", { name: "Collapse apps" }));
    expect(screen.queryByRole("button", { name: "Open apps/.env.staging" })).toBeNull();

    await user.type(screen.getByLabelText("Search files"), "staging");
    expect(
      screen.getByRole("button", { name: "Open apps/.env.staging" }),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search files"));
    expect(screen.queryByRole("button", { name: "Open apps/.env.staging" })).toBeNull();
  });

  it("states what matched nothing, and clears it", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText("Search files"), "nothing");
    expect(screen.getByText("No file matches")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(document.querySelectorAll(".line")).toHaveLength(2);
  });
});

describe("RepoDetail, the four conditions", () => {
  it("marks a sealed file sealed and a readable one open, saying neither in words", () => {
    setup();
    expect(conditionOf(".env.production")).toBe("sealed");
    expect(conditionOf(".env")).toBe("open");
    expect(screen.queryByText("Sealed")).toBeNull();
    expect(screen.queryByText("Readable")).toBeNull();
  });

  it("marks a file recorded sealed but found readable as broken, and explains it", () => {
    setup({
      ...app,
      files: [{ relativePath: ".env", state: "plaintext", alert: true }],
    });

    expect(conditionOf(".env")).toBe("broken");
    expect(
      screen.getByRole("button", { name: "Why .env is marked" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seal .env" })).toBeInTheDocument();
  });

  it("never treats a missing file as broken, and strikes its name instead", () => {
    setup({
      ...app,
      files: [{ relativePath: ".env", state: "missing", alert: false }],
    });

    expect(conditionOf(".env")).toBe("gone");
    expect(screen.getByRole("button", { name: "Open .env" })).toBeDisabled();
    expect(
      screen.getByText("Seal cannot open it — it is no longer at this path."),
    ).toBeInTheDocument();
  });

  it("offers Seal only where a file is not already sealed", () => {
    setup();
    expect(screen.getByRole("button", { name: "Seal .env" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Seal .env.production" }),
    ).toBeNull();
  });

  it("offers no action at all on a file that is gone", () => {
    setup({
      ...app,
      files: [{ relativePath: ".env", state: "missing", alert: false }],
    });
    const line = lines()[0]!;
    expect(within(line as HTMLElement).queryByText("Seal")).toBeNull();
  });
});

describe("RepoDetail, the row's operations", () => {
  it("opens a file by its full path", async () => {
    const user = userEvent.setup();
    const { onOpen } = setup();
    await user.click(screen.getByRole("button", { name: "Open .env" }));
    expect(onOpen).toHaveBeenCalledWith("/repos/app/.env");
  });

  it("seals a file by its full path", async () => {
    const user = userEvent.setup();
    const { onSeal } = setup();
    await user.click(screen.getByRole("button", { name: "Seal .env" }));
    expect(onSeal).toHaveBeenCalledWith("/repos/app/.env");
  });

  it("keeps Unseal in the row menu, and offers it only on a sealed file", async () => {
    const user = userEvent.setup();
    const { onUnseal } = setup();

    expect(screen.queryByRole("button", { name: "Unseal .env.production" })).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "More actions for .env.production" }),
    );
    await user.click(screen.getByRole("button", { name: "Unseal .env.production" }));
    expect(onUnseal).toHaveBeenCalledWith("/repos/app/.env.production");

    await user.click(screen.getByRole("button", { name: "More actions for .env" }));
    expect(screen.queryByRole("button", { name: "Unseal .env" })).toBeNull();
  });

  it("keeps stopping management of a file behind the overflow, not on the surface", async () => {
    const user = userEvent.setup();
    const { onRelease } = setup();

    expect(screen.queryByText("Stop managing this file")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "More actions for .env" }));
    await user.click(screen.getByText("Stop managing this file"));
    expect(onRelease).toHaveBeenCalledWith("/repos/app/.env");
  });

  it("offers stopping management of the whole repository as one operation", async () => {
    const user = userEvent.setup();
    const { onReleaseRepo } = setup();

    await user.click(screen.getByRole("button", { name: "More actions for app" }));
    await user.click(screen.getByText("Stop managing this repository"));
    expect(onReleaseRepo).toHaveBeenCalled();
  });

  it("explains watched versus protected behind a disclosure rather than on the surface", async () => {
    const user = userEvent.setup();
    setup();

    expect(screen.queryByText(/Watching only means/)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "What Seal does with these files" }),
    );
    expect(screen.getByText(/Watching only means/)).toBeInTheDocument();
  });
});

describe("RepoDetail, seal every file", () => {
  it("offers it, and hides it once every file is sealed", async () => {
    const user = userEvent.setup();
    const { onSealAll } = setup();

    await user.click(screen.getByRole("button", { name: "More actions for app" }));
    await user.click(screen.getByRole("button", { name: "Seal every file" }));
    expect(onSealAll).toHaveBeenCalled();

    const sealed: RepoView = {
      ...app,
      files: app.files.map((file) => ({ ...file, state: "sealed" as const })),
    };
    setup(sealed);
    await user.click(
      screen.getAllByRole("button", { name: "More actions for app" })[1]!,
    );
    expect(screen.queryByRole("button", { name: "Seal every file" })).toBeNull();
  });
});

describe("RepoDetail, what it reports", () => {
  it("names every file that failed and why, rather than reporting a count", () => {
    setup(app, {
      did: "seal",
      results: [
        { path: "/repos/app/.env", ok: true, reason: null },
        { path: "/repos/app/.env.production", ok: false, reason: "alreadySealed" },
      ],
    });

    expect(screen.getByText("1 of 2 files are now sealed.")).toBeInTheDocument();
    const failures = document.querySelector(".outcomes__failures")!;
    expect(failures).toHaveTextContent(".env.production");
    expect(failures).toHaveTextContent("already sealed");
  });

  it("reports an unseal as files becoming readable, never as sealing", () => {
    setup(app, {
      did: "unseal",
      results: [{ path: "/repos/app/.env", ok: true, reason: null }],
    });
    expect(screen.getByText("1 of 1 file is now readable.")).toBeInTheDocument();
  });

  it("marks the list stale when the last re-read failed, without hiding the rows", () => {
    setup(app, null, "failed");
    expect(screen.getByRole("alert")).toHaveTextContent("what is below is what it last");
    expect(document.querySelectorAll(".line").length).toBeGreaterThan(0);
  });

  it("says nothing about staleness when the read succeeded", () => {
    setup();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("states no managed-file count, because the rows are the count", () => {
    setup();
    expect(screen.queryByText(/^\d+ managed files?$/)).toBeNull();
  });
});
