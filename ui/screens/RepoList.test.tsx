import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RepoList } from "./RepoList";
import type { RepoView } from "../ipc";

const repos: RepoView[] = [
  {
    root: "/repos/app",
    name: "app",
    files: [
      { relativePath: ".env.production", state: "sealed", alert: false },
      { relativePath: ".env", state: "plaintext", alert: false },
    ],
  },
];

function setup(list: RepoView[] = repos) {
  const handlers = {
    onImport: vi.fn(),
    onOpen: vi.fn(),
    onSeal: vi.fn(),
    onRelease: vi.fn(),
    onLock: vi.fn(),
  };
  render(<RepoList repos={list} {...handlers} />);
  return handlers;
}

describe("RepoList", () => {
  it("makes the empty state the import action itself", () => {
    const { onImport } = setup([]);
    expect(screen.getByText(/manages nothing yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import a folder" })).toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  });

  it("shows no alert when nothing is exposed", () => {
    setup();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("raises the alert only for a file recorded sealed but found readable", () => {
    setup([
      {
        root: "/repos/app",
        name: "app",
        files: [
          { relativePath: ".env.production", state: "plaintext", alert: true },
          { relativePath: ".env", state: "plaintext", alert: false },
          { relativePath: ".env.gone", state: "missing", alert: false },
        ],
      },
    ]);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(".env.production");
    expect(alert).not.toHaveTextContent(".env.gone");
  });

  it("never treats a missing file as an exposure", () => {
    setup([
      {
        root: "/repos/app",
        name: "app",
        files: [{ relativePath: ".env", state: "missing", alert: false }],
      },
    ]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("labels each file with its state", () => {
    setup();
    expect(screen.getByText("Sealed")).toBeInTheDocument();
    expect(screen.getByText("Readable")).toBeInTheDocument();
  });

  it("offers sealing only for a file that is not already sealed", () => {
    setup();
    expect(screen.getByRole("button", { name: "Seal .env" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Seal .env.production" }),
    ).not.toBeInTheDocument();
  });

  it("opens a file by its full path", async () => {
    const user = userEvent.setup();
    const { onOpen } = setup();
    await user.click(screen.getByRole("button", { name: "Open .env" }));
    expect(onOpen).toHaveBeenCalledWith("/repos/app/.env");
  });

  it("offers stopping management per file", async () => {
    const user = userEvent.setup();
    const { onRelease } = setup();
    await user.click(screen.getByRole("button", { name: "Stop managing .env" }));
    expect(onRelease).toHaveBeenCalledWith("/repos/app/.env");
  });

  it("cannot open a file that is not on disk", () => {
    setup([
      {
        root: "/repos/app",
        name: "app",
        files: [{ relativePath: ".env", state: "missing", alert: false }],
      },
    ]);
    expect(screen.getByRole("button", { name: "Open .env" })).toBeDisabled();
  });

  it("keeps lock reachable", async () => {
    const user = userEvent.setup();
    const { onLock } = setup();
    await user.click(screen.getByRole("button", { name: "Lock Seal" }));
    expect(onLock).toHaveBeenCalledOnce();
  });
});
