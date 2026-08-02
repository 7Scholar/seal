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
    hasAcknowledged: vi.fn(),
    lock: vi.fn(),
    themeMode: vi.fn(),
    setThemeMode: vi.fn(),
    save: vi.fn(),
    reveal: vi.fn(),
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
  mocked.themeMode.mockResolvedValue("system");
  mocked.setThemeMode.mockResolvedValue(undefined);
});

async function openApp() {
  render(<App />);
  await screen.findByRole("heading", { name: "Repositories" });
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
  it("offers the three modes with the current one marked", async () => {
    const user = userEvent.setup();
    await openApp();

    await user.click(screen.getByRole("button", { name: "Theme: System" }));

    expect(screen.getByRole("button", { name: "System" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("applies and stores a chosen mode", async () => {
    const user = userEvent.setup();
    await openApp();

    await user.click(screen.getByRole("button", { name: "Theme: System" }));
    await user.click(screen.getByRole("button", { name: "Light" }));

    expect(mocked.setThemeMode).toHaveBeenCalledWith("light");
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });
  });

  it("starts from the stored mode rather than the default", async () => {
    mocked.themeMode.mockResolvedValue("dark");
    await openApp();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Theme: Dark" }),
      ).toBeInTheDocument();
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
