import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import * as ipc from "./ipc";

vi.mock("./ipc", async () => {
  const actual = await vi.importActual<typeof ipc>("./ipc");
  return {
    ...actual,
    isUnlocked: vi.fn(),
    isEstablished: vi.fn(),
    overview: vi.fn(),
    rekeyStatus: vi.fn(),
    openFile: vi.fn(),
    closeFile: vi.fn(),
    sealFiles: vi.fn(),
    sealFile: vi.fn(),
    sealWarning: vi.fn(),
    hasAcknowledged: vi.fn(),
    lock: vi.fn(),
    themeMode: vi.fn(),
    setThemeMode: vi.fn(),
    save: vi.fn(),
    reveal: vi.fn(),
    pickFolder: vi.fn(),
    scanFolder: vi.fn(),
    manageFiles: vi.fn(),
    reobserve: vi.fn(),
  };
});

const mocked = vi.mocked(ipc);

const repos: ipc.RepoView[] = [
  {
    root: "/code/app",
    name: "app",
    files: [
      { relativePath: ".env", state: "plaintext", alert: false },
      { relativePath: ".env.production", state: "sealed", alert: false },
    ],
  },
  {
    root: "/code/site",
    name: "site",
    files: [{ relativePath: ".env", state: "plaintext", alert: true }],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocked.isUnlocked.mockResolvedValue(true);
  mocked.isEstablished.mockResolvedValue(true);
  mocked.overview.mockResolvedValue(repos);
  mocked.rekeyStatus.mockResolvedValue(null);
  mocked.hasAcknowledged.mockResolvedValue(true);
  mocked.sealWarning.mockResolvedValue(null);
  mocked.sealFile.mockResolvedValue(undefined);
  mocked.themeMode.mockResolvedValue("system");
  mocked.setThemeMode.mockResolvedValue(undefined);
});

async function openApp() {
  render(<App />);
  await screen.findByRole("heading", { name: "Repositories" });
  await waitFor(() =>
    expect(screen.queryByLabelText("Loading repositories")).not.toBeInTheDocument(),
  );
}

async function openRepository(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));
  await screen.findByRole("navigation", { name: "Breadcrumb" });
}

describe("the application shell", () => {
  it("lands on the repositories grid, with no sidebar anywhere", async () => {
    await openApp();
    expect(screen.getByRole("heading", { name: "Repositories" })).toBeInTheDocument();
    expect(screen.queryByRole("tree")).not.toBeInTheDocument();
  });

  it("shows every repository as a tile carrying its path and file count", async () => {
    await openApp();
    expect(screen.getByText("/code/app")).toBeInTheDocument();
    expect(screen.getByText("2 managed files")).toBeInTheDocument();
    expect(screen.getByText("1 managed file")).toBeInTheDocument();
  });

  it("states an exposure on the tile, and says nothing on a healthy repository", async () => {
    await openApp();
    expect(
      screen.getByText("1 file readable — should be sealed"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/readable — should be sealed/)).toHaveLength(1);
  });

  it("carries the cross-repository exposure into the title bar, from every altitude", async () => {
    const user = userEvent.setup();
    await openApp();

    const pill = screen.getByRole("button", {
      name: "1 repository has a readable secret",
    });
    expect(pill).toBeInTheDocument();

    await openRepository(user, "app");
    expect(
      screen.getByRole("button", { name: "1 repository has a readable secret" }),
    ).toBeInTheDocument();
  });

  it("shows no exposure indicator when nothing is exposed", async () => {
    mocked.overview.mockResolvedValue([repos[0]!]);
    await openApp();
    expect(
      screen.queryByRole("button", { name: /readable secret/ }),
    ).not.toBeInTheDocument();
  });

  it("navigates into a repository from its tile, and the trail says where you are", async () => {
    const user = userEvent.setup();
    await openApp();

    await openRepository(user, "app");

    const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(trail).toHaveTextContent("Repositories");
    expect(trail).toHaveTextContent("app");
    expect(screen.getByText("/code/app")).toBeInTheDocument();
  });

  it("the current breadcrumb segment does not navigate", async () => {
    const user = userEvent.setup();
    await openApp();
    await openRepository(user, "app");

    const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(trail.querySelector('[aria-current="page"]')).toHaveTextContent("app");
    expect(
      screen.queryByRole("button", { name: "app" }),
    ).not.toBeInTheDocument();
  });

  it("navigates back up through the trail", async () => {
    const user = userEvent.setup();
    await openApp();
    await openRepository(user, "app");

    await user.click(screen.getByRole("button", { name: "Repositories" }));

    expect(
      await screen.findByRole("heading", { name: "Repositories" }),
    ).toBeInTheDocument();
  });

  it("switches repository from the breadcrumb without passing through the grid", async () => {
    const user = userEvent.setup();
    await openApp();
    await openRepository(user, "app");

    await user.click(screen.getByRole("button", { name: "Switch repository" }));
    await user.click(screen.getByRole("option", { name: /site/ }));

    await waitFor(() => {
      expect(screen.getByText("/code/site")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("heading", { name: "Repositories" }),
    ).not.toBeInTheDocument();
  });

  it("filters the switcher by what is typed, and marks the current repository", async () => {
    const user = userEvent.setup();
    await openApp();
    await openRepository(user, "app");

    await user.click(screen.getByRole("button", { name: "Switch repository" }));
    expect(screen.getByRole("option", { name: /app/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.type(screen.getByRole("combobox"), "site");
    expect(screen.queryByRole("option", { name: /^app/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /site/ })).toBeInTheDocument();
  });

  it("dismisses the switcher on Escape without navigating", async () => {
    const user = userEvent.setup();
    await openApp();
    await openRepository(user, "app");

    await user.click(screen.getByRole("button", { name: "Switch repository" }));
    expect(screen.getByRole("combobox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("/code/app")).toBeInTheDocument();
  });

  it("opens a file, and the trail gains its segment", async () => {
    const user = userEvent.setup();
    mocked.openFile.mockResolvedValue({
      kind: "env",
      path: "/code/app/.env",
      variables: [{ key: "API_KEY", masked: "••••••••", empty: false }],
      duplicateKeys: [],
      unparseableLines: 0,
    });
    await openApp();
    await openRepository(user, "app");

    await user.click(screen.getByRole("button", { name: "Open .env" }));

    await screen.findByText("API_KEY");
    const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(trail).toHaveTextContent(".env");
    expect(trail.querySelector('[aria-current="page"]')).toHaveTextContent(".env");
  });

  it("closes the open file when navigating up, rather than only hiding it", async () => {
    const user = userEvent.setup();
    mocked.openFile.mockResolvedValue({
      kind: "env",
      path: "/code/app/.env",
      variables: [{ key: "API_KEY", masked: "••••••••", empty: false }],
      duplicateKeys: [],
      unparseableLines: 0,
    });
    mocked.closeFile.mockResolvedValue(undefined);
    await openApp();
    await openRepository(user, "app");
    await user.click(screen.getByRole("button", { name: "Open .env" }));
    await screen.findByText("API_KEY");

    await user.click(screen.getByRole("button", { name: "app" }));

    await waitFor(() => {
      expect(mocked.closeFile).toHaveBeenCalledWith("/code/app/.env");
    });
  });

  it("keeps lock reachable from the frame", async () => {
    const user = userEvent.setup();
    mocked.lock.mockResolvedValue(undefined);
    await openApp();

    await user.click(screen.getByRole("button", { name: "Lock" }));
    expect(mocked.lock).toHaveBeenCalledOnce();
  });

  it("keeps changing the master password behind a disclosure, not on the surface", async () => {
    const user = userEvent.setup();
    await openApp();

    expect(
      screen.queryByRole("button", { name: "Change master password" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Seal settings" }));
    expect(
      screen.getByRole("button", { name: "Change master password" }),
    ).toBeInTheDocument();
  });

  it("seals the selected files together and reports the result per file", async () => {
    const user = userEvent.setup();
    mocked.sealFiles.mockResolvedValue([
      { path: "/code/app/.env", sealed: true, reason: null },
    ]);
    await openApp();
    await openRepository(user, "app");

    await user.click(screen.getByRole("checkbox", { name: "Select .env" }));
    await user.click(screen.getByRole("button", { name: "Seal selected file" }));

    expect(mocked.sealFiles).toHaveBeenCalledWith(["/code/app/.env"]);
    expect(await screen.findByText(/1 file is now sealed/)).toBeInTheDocument();
  });

  it("warns before sealing a selection holding a recently modified file", async () => {
    const user = userEvent.setup();
    mocked.sealWarning.mockResolvedValue({
      path: "/code/app/.env",
      modifiedSecondsAgo: 4,
    });
    mocked.sealFiles.mockResolvedValue([
      { path: "/code/app/.env", sealed: true, reason: null },
    ]);
    await openApp();
    await openRepository(user, "app");

    await user.click(screen.getByRole("checkbox", { name: "Select .env" }));
    await user.click(screen.getByRole("button", { name: "Seal selected file" }));

    expect(mocked.sealFiles).not.toHaveBeenCalled();
    expect(mocked.sealFile).not.toHaveBeenCalled();
    expect(await screen.findByText(/may be editing it/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Seal it anyway" }));
    await waitFor(() =>
      expect(
        mocked.sealFile.mock.calls.length + mocked.sealFiles.mock.calls.length,
      ).toBe(1),
    );
  });

  it("falls back to the repository when the open file stops being managed", async () => {
    const user = userEvent.setup();
    mocked.openFile.mockResolvedValue({
      kind: "env",
      path: "/code/app/.env",
      variables: [{ key: "API_KEY", masked: "••••••••", empty: false }],
      duplicateKeys: [],
      unparseableLines: 0,
    });
    mocked.closeFile.mockResolvedValue(undefined);
    mocked.save.mockResolvedValue(undefined);
    mocked.reveal.mockResolvedValue(new TextEncoder().encode("sk-live"));
    await openApp();
    await openRepository(user, "app");
    await user.click(screen.getByRole("button", { name: "Open .env" }));
    await screen.findByText("API_KEY");

    mocked.overview.mockResolvedValue([
      {
        root: "/code/app",
        name: "app",
        files: [{ relativePath: ".env.production", state: "sealed", alert: false }],
      },
      repos[1]!,
    ]);

    await user.click(screen.getByRole("button", { name: "Edit API_KEY" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("/code/app")).toBeInTheDocument();
    });
    expect(screen.queryByText("API_KEY")).not.toBeInTheDocument();
  });

  it("falls back to the grid when the whole repository disappears", async () => {
    const user = userEvent.setup();
    mocked.sealFiles.mockResolvedValue([]);
    await openApp();
    await openRepository(user, "app");

    mocked.overview.mockResolvedValue([repos[1]!]);
    await user.click(screen.getByRole("checkbox", { name: "Select .env" }));
    await user.click(screen.getByRole("button", { name: "Seal selected file" }));

    expect(
      await screen.findByRole("heading", { name: "Repositories" }),
    ).toBeInTheDocument();
  });
});

describe("the theme control", () => {
  it("names the current mode and the one a press moves to", async () => {
    await openApp();

    expect(
      screen.getByRole("button", { name: "Theme: System. Switch to Light." }),
    ).toBeInTheDocument();
  });

  it("cycles system to light to dark and back on successive presses", async () => {
    const user = userEvent.setup();
    await openApp();

    await user.click(
      screen.getByRole("button", { name: "Theme: System. Switch to Light." }),
    );
    expect(mocked.setThemeMode).toHaveBeenCalledWith("light");
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });

    await user.click(
      screen.getByRole("button", { name: "Theme: Light. Switch to Dark." }),
    );
    expect(mocked.setThemeMode).toHaveBeenCalledWith("dark");
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });

    await user.click(
      screen.getByRole("button", { name: "Theme: Dark. Switch to System." }),
    );
    expect(mocked.setThemeMode).toHaveBeenCalledWith("system");
  });

  it("starts from the stored mode rather than the default", async () => {
    mocked.themeMode.mockResolvedValue("dark");
    await openApp();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Theme: Dark. Switch to System." }),
      ).toBeInTheDocument();
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("never reports the product as empty while the overview is still in flight", async () => {
    let settle: (repos: ipc.RepoView[]) => void = () => {};
    mocked.overview.mockReturnValue(
      new Promise<ipc.RepoView[]>((resolve) => {
        settle = resolve;
      }),
    );

    render(<App />);
    await screen.findByLabelText("Loading repositories");

    expect(document.querySelector(".tile--add")).not.toBeInTheDocument();

    settle(repos);
    await waitFor(() =>
      expect(screen.queryByLabelText("Loading repositories")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /^site/ })).toBeInTheDocument();
  });

  it("states that the overview failed rather than claiming nothing is managed", async () => {
    mocked.overview.mockRejectedValue(new Error("no"));

    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Seal could not read what it manages",
      ),
    );
    expect(document.querySelector(".tile--add")).not.toBeInTheDocument();
  });

  it("says the files list is stale rather than passing off a failed re-read as current", async () => {
    const user = userEvent.setup();
    await openApp();
    await openRepository(user, "app");

    expect(document.querySelector(".stale")).not.toBeInTheDocument();

    mocked.overview.mockRejectedValue(new Error("no"));
    mocked.sealFile.mockResolvedValue(undefined);
    await user.click(screen.getByRole("button", { name: "Seal .env" }));

    await waitFor(() =>
      expect(document.querySelector(".stale")).toHaveTextContent(
        "Seal could not re-read this repository",
      ),
    );
    expect(document.querySelector(".stale")).toHaveTextContent(
      "still sealed",
    );
    expect(document.querySelectorAll(".row").length).toBeGreaterThan(0);
  });

  it("states the managed-file count on the files list", async () => {
    const user = userEvent.setup();
    await openApp();
    await openRepository(user, "app");

    expect(document.querySelector(".surface__count")).toHaveTextContent(
      "2 managed files",
    );
  });

  it("says why a missing file cannot be opened, rather than disabling it silently", async () => {
    const user = userEvent.setup();
    mocked.overview.mockResolvedValue([
      {
        root: "/code/app",
        name: "app",
        files: [
          { relativePath: ".env", state: "plaintext", alert: false },
          { relativePath: "gone/.env.local", state: "missing", alert: false },
        ],
      },
    ]);
    await openApp();
    await openRepository(user, "app");

    const open = screen.getByRole("button", { name: "Open gone/.env.local" });
    expect(open).toBeDisabled();

    const why = open.getAttribute("aria-describedby");
    expect(why).toBeTruthy();
    expect(document.getElementById(why!)).toHaveTextContent(
      "Seal cannot open it — it is no longer at this path.",
    );
  });

  it("carries a switcher on the root segment, on the one screen a new user sees", async () => {
    const user = userEvent.setup();
    await openApp();

    await user.click(screen.getByRole("button", { name: "Open a repository" }));

    expect(screen.getByRole("option", { name: /^app/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /site/ })).toBeInTheDocument();
    expect(document.querySelector(".switcher__add")).toHaveTextContent(
      "Add repository",
    );
  });

  it("opens a repository from the root switcher, without touching a tile", async () => {
    const user = userEvent.setup();
    await openApp();

    await user.click(screen.getByRole("button", { name: "Open a repository" }));
    await user.click(screen.getByRole("option", { name: /site/ }));

    await waitFor(() => {
      expect(screen.getByText("/code/site")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("heading", { name: "Repositories" }),
    ).not.toBeInTheDocument();
  });

  it("marks no repository as current at the root, because the root is not one of them", async () => {
    const user = userEvent.setup();
    await openApp();

    await user.click(screen.getByRole("button", { name: "Open a repository" }));

    for (const option of screen.getAllByRole("option")) {
      expect(option).toHaveAttribute("aria-selected", "false");
    }
  });

  it("reaches the add action from the trail when there is nothing to switch between", async () => {
    const user = userEvent.setup();
    mocked.overview.mockResolvedValue([]);
    await openApp();

    await user.click(screen.getByRole("button", { name: "Open a repository" }));

    expect(screen.getByText("No repositories yet.")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(document.querySelector(".switcher__add")).toHaveFocus();
  });

  it("draws the file surface while the open is in flight, rather than nothing at all", async () => {
    const user = userEvent.setup();
    let settle: (view: ipc.OpenedFile) => void = () => {};
    mocked.openFile.mockReturnValue(
      new Promise<ipc.OpenedFile>((resolve) => {
        settle = resolve;
      }),
    );
    await openApp();
    await openRepository(user, "app");

    await user.click(screen.getByRole("button", { name: "Open .env" }));

    const opening = await screen.findByLabelText("Opening .env");
    expect(opening).toBeInTheDocument();
    expect(document.querySelector(".env-editor")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(document.querySelector(".env-editor .file-head__path")).toHaveTextContent(
      ".env",
    );

    settle({
      kind: "env",
      path: "/code/app/.env",
      variables: [{ key: "API_KEY", masked: "••••••••", empty: false }],
      duplicateKeys: [],
      unparseableLines: 0,
    });
    await screen.findByText("API_KEY");
    expect(screen.queryByLabelText("Opening .env")).not.toBeInTheDocument();
  });

  it("states a failed open on the surface, with a retry and a way back", async () => {
    const user = userEvent.setup();
    mocked.openFile.mockRejectedValue({
      kind: "damaged",
      path: "/code/app/.env",
      message: "no",
    });
    await openApp();
    await openRepository(user, "app");

    await user.click(screen.getByRole("button", { name: "Open .env" }));

    const failed = await screen.findByRole("alert");
    expect(failed).toHaveTextContent("Seal could not open this file");
    expect(failed).toHaveTextContent("The file could not be read as a sealed file");

    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to the repository" }));

    await screen.findByRole("button", { name: "Open .env" });
    expect(document.querySelector(".file-failed")).not.toBeInTheDocument();
  });

  it("retries the open from the surface it failed on", async () => {
    const user = userEvent.setup();
    mocked.openFile.mockRejectedValueOnce({
      kind: "io",
      path: "/code/app/.env",
      message: "no",
    });
    await openApp();
    await openRepository(user, "app");

    await user.click(screen.getByRole("button", { name: "Open .env" }));
    await screen.findByRole("alert");

    mocked.openFile.mockResolvedValue({
      kind: "env",
      path: "/code/app/.env",
      variables: [{ key: "API_KEY", masked: "••••••••", empty: false }],
      duplicateKeys: [],
      unparseableLines: 0,
    });
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await screen.findByText("API_KEY");
  });

  it("states the file's variable count, in the singular and the plural", async () => {
    const user = userEvent.setup();
    mocked.openFile.mockResolvedValue({
      kind: "env",
      path: "/code/app/.env",
      variables: [
        { key: "API_KEY", masked: "••••••••", empty: false },
        { key: "DATABASE_URL", masked: "••••••••", empty: false },
      ],
      duplicateKeys: [],
      unparseableLines: 0,
    });
    await openApp();
    await openRepository(user, "app");
    await user.click(screen.getByRole("button", { name: "Open .env" }));

    await screen.findByText("API_KEY");
    expect(document.querySelector(".env-editor .surface__count")).toHaveTextContent(
      "2 variables",
    );

    await user.click(screen.getByRole("button", { name: "app" }));
    mocked.openFile.mockResolvedValue({
      kind: "env",
      path: "/code/app/.env",
      variables: [{ key: "API_KEY", masked: "••••••••", empty: false }],
      duplicateKeys: [],
      unparseableLines: 0,
    });
    await user.click(screen.getByRole("button", { name: "Open .env" }));

    await screen.findByText("API_KEY");
    expect(document.querySelector(".env-editor .surface__count")).toHaveTextContent(
      "1 variable",
    );
  });

  it("keeps the save control out of the scrolling region, whatever the file holds", async () => {
    const user = userEvent.setup();
    mocked.openFile.mockResolvedValue({
      kind: "env",
      path: "/code/app/.env",
      variables: Array.from({ length: 400 }, (_, i) => ({
        key: `VARIABLE_${i}`,
        masked: "••••••••",
        empty: false,
      })),
      duplicateKeys: [],
      unparseableLines: 0,
    });
    await openApp();
    await openRepository(user, "app");
    await user.click(screen.getByRole("button", { name: "Open .env" }));

    await screen.findByText("VARIABLE_0");

    const region = document.querySelector(".env-editor__region");
    const save = screen.getByRole("button", { name: "Save" });
    expect(region).toBeInTheDocument();
    expect(region!.contains(screen.getByText("VARIABLE_0"))).toBe(true);
    expect(region!.contains(save)).toBe(false);
  });
});

describe("a relock arriving while a manage selection is live", () => {
  const scan: ipc.ScanView = {
    root: "/code/new",
    alreadyRegistered: false,
    candidates: [
      {
        relativePath: ".env",
        confidence: "secret",
        reason: null,
        preselected: true,
        alreadyManaged: false,
      },
    ],
    tree: [
      {
        kind: "file",
        name: ".env",
        relativePath: ".env",
        confidence: "secret",
        reason: null,
        preselected: true,
        alreadyManaged: false,
      },
      {
        kind: "file",
        name: "config.yml",
        relativePath: "config.yml",
        confidence: null,
        reason: null,
        preselected: false,
        alreadyManaged: false,
      },
    ],
  };

  async function openManageWithSelection(user: ReturnType<typeof userEvent.setup>) {
    mocked.pickFolder.mockResolvedValue("/code/new");
    mocked.scanFolder.mockResolvedValue(scan);
    await openApp();
    await user.click(screen.getAllByRole("button", { name: /Add repository/ })[0]!);
    await screen.findByRole("button", { name: "Manage 1 file" });
    await user.click(screen.getByRole("treeitem", { name: "config.yml" }));
    await screen.findByRole("button", { name: "Manage 2 files" });
  }

  it("keeps the selection when the reobserve poll reports the session locked", async () => {
    const user = userEvent.setup();
    await openManageWithSelection(user);

    mocked.reobserve.mockRejectedValue({ kind: "locked", message: "locked" });

    await waitFor(() => expect(mocked.reobserve).toHaveBeenCalled(), { timeout: 8000 });

    expect(screen.getByRole("button", { name: "Manage 2 files" })).toBeInTheDocument();
  }, 15000);

  it("relocks and discards the selection when confirming reports the session locked", async () => {
    const user = userEvent.setup();
    await openManageWithSelection(user);

    mocked.manageFiles.mockRejectedValue({ kind: "locked", message: "locked" });
    await user.click(screen.getByRole("button", { name: "Manage 2 files" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Seal is locked" })).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Manage 2 files" }),
    ).not.toBeInTheDocument();
  });
});
