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
});

async function openShell() {
  render(<App />);
  await screen.findByRole("tree");
}

describe("the application shell", () => {
  it("shows the sidebar and a detail surface, not a single scrolling column", async () => {
    await openShell();
    expect(screen.getByRole("tree")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Repositories" })).toBeInTheDocument();
  });

  it("is never blank: with nothing selected it says what to do", async () => {
    await openShell();
    expect(screen.getByRole("heading", { name: "Nothing selected" })).toBeInTheDocument();
  });

  it("expands a repository holding an exposed file, since the exception is what the surface is for", async () => {
    await openShell();
    await waitFor(() => {
      expect(screen.getByRole("treeitem", { name: /site/ })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });
    expect(screen.getByRole("treeitem", { name: /^app/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("keeps the sidebar present while a repository is shown", async () => {
    const user = userEvent.setup();
    await openShell();

    await user.click(screen.getByRole("treeitem", { name: /^app/ }));

    expect(screen.getByRole("heading", { name: "app" })).toBeInTheDocument();
    expect(screen.getByRole("tree")).toBeInTheDocument();
  });

  it("keeps the sidebar present while a file is open in the editor", async () => {
    const user = userEvent.setup();
    mocked.openFile.mockResolvedValue({
      kind: "env",
      path: "/code/app/.env",
      variables: [{ key: "API_KEY", masked: "••••••••", empty: false }],
      duplicateKeys: [],
      unparseableLines: 0,
    });
    await openShell();

    await user.click(screen.getByRole("treeitem", { name: /^app/ }));
    await user.click(screen.getByRole("button", { name: "Open .env" }));

    await screen.findByRole("heading", { name: ".env" });
    expect(screen.getByRole("tree")).toBeInTheDocument();
  });

  it("keeps lock reachable from the frame", async () => {
    const user = userEvent.setup();
    mocked.lock.mockResolvedValue(undefined);
    await openShell();

    await user.click(screen.getByRole("button", { name: "Lock" }));
    expect(mocked.lock).toHaveBeenCalledOnce();
  });

  it("keeps changing the master password behind a disclosure, not on the surface", async () => {
    const user = userEvent.setup();
    await openShell();

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
    await openShell();

    await user.click(screen.getByRole("treeitem", { name: /^app/ }));
    await user.click(screen.getByRole("checkbox", { name: "Select .env" }));
    await user.click(screen.getByRole("button", { name: "Seal selected file" }));

    expect(mocked.sealFiles).toHaveBeenCalledWith(["/code/app/.env"]);
    expect(await screen.findByText(/1 file is now sealed/)).toBeInTheDocument();
  });

  it("falls back to the repository when the open file stops being managed", async () => {
    const user = userEvent.setup();
    mocked.openFile.mockResolvedValue({
      kind: "opaque",
      path: "/code/app/.env",
      bytes: 42,
    });
    mocked.closeFile.mockResolvedValue(undefined);
    await openShell();

    await user.click(screen.getByRole("treeitem", { name: /^app/ }));
    await user.click(screen.getByRole("button", { name: "Open .env" }));
    await screen.findByRole("heading", { name: ".env" });

    mocked.overview.mockResolvedValue([
      { root: "/code/app", name: "app", files: [] },
      repos[1]!,
    ]);
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(await screen.findByRole("heading", { name: "app" })).toBeInTheDocument();
  });
});
