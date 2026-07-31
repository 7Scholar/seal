import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RepoDetail } from "./RepoDetail";
import type { RepoView, SealOutcome } from "../ipc";

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
  outcomes: SealOutcome[] | null = null,
) {
  const handlers = {
    onOpen: vi.fn(),
    onSeal: vi.fn(),
    onSealMany: vi.fn(),
    onRelease: vi.fn(),
    onReleaseRepo: vi.fn(),
    onRescan: vi.fn(),
    onDismissOutcomes: vi.fn(),
  };
  render(<RepoDetail repo={repo} outcomes={outcomes} {...handlers} />);
  return handlers;
}

describe("RepoDetail", () => {
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

  it("cannot open a file that is not on disk", () => {
    setup({
      root: "/repos/app",
      name: "app",
      files: [{ relativePath: ".env", state: "missing", alert: false }],
    });
    expect(screen.getByRole("button", { name: "Open .env" })).toBeDisabled();
  });

  it("shows no alert when nothing is exposed", () => {
    setup();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("raises the alert only for a file recorded sealed but found readable", () => {
    setup({
      root: "/repos/app",
      name: "app",
      files: [
        { relativePath: ".env.production", state: "plaintext", alert: true },
        { relativePath: ".env", state: "plaintext", alert: false },
        { relativePath: ".env.gone", state: "missing", alert: false },
      ],
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(".env.production");
    expect(alert).not.toHaveTextContent(".env.gone");
  });

  it("never treats a missing file as an exposure", () => {
    setup({
      root: "/repos/app",
      name: "app",
      files: [{ relativePath: ".env", state: "missing", alert: false }],
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains watched versus protected behind a disclosure rather than on the surface", async () => {
    const user = userEvent.setup();
    setup();

    expect(screen.queryByText(/still readable by anything/i)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "What Seal does with these files" }),
    );
    expect(screen.getByText(/still readable by anything/i)).toBeInTheDocument();
  });

  it("keeps stopping management of a file behind the overflow, not on the surface", async () => {
    const user = userEvent.setup();
    const { onRelease } = setup();

    expect(
      screen.queryByRole("button", { name: "Stop managing this file" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "More actions for .env" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Stop managing this file" }),
    );
    expect(onRelease).toHaveBeenCalledWith("/repos/app/.env");
  });

  it("offers stopping management of the whole repository as one operation", async () => {
    const user = userEvent.setup();
    const { onReleaseRepo } = setup();

    await user.click(screen.getByRole("button", { name: "More actions for app" }));
    await user.click(
      screen.getByRole("button", { name: "Stop managing this repository" }),
    );
    expect(onReleaseRepo).toHaveBeenCalledOnce();
  });
});

describe("RepoDetail and sealing several files at once", () => {
  const many: RepoView = {
    root: "/repos/app",
    name: "app",
    files: [
      { relativePath: ".env", state: "plaintext", alert: false },
      { relativePath: ".env.staging", state: "plaintext", alert: false },
      { relativePath: ".env.production", state: "sealed", alert: false },
      { relativePath: ".env.gone", state: "missing", alert: false },
    ],
  };

  it("seals nothing until files are chosen", () => {
    setup(many);
    expect(
      screen.getByRole("button", { name: /Seal selected file/ }),
    ).toBeDisabled();
  });

  it("seals exactly the files the user selected, never all of them", async () => {
    const user = userEvent.setup();
    const { onSealMany } = setup(many);

    await user.click(screen.getByRole("checkbox", { name: "Select .env" }));
    await user.click(
      screen.getByRole("button", { name: "Seal selected file" }),
    );

    expect(onSealMany).toHaveBeenCalledWith(["/repos/app/.env"]);
  });

  it("counts the selection so the user knows what is about to happen", async () => {
    const user = userEvent.setup();
    setup(many);

    await user.click(screen.getByRole("checkbox", { name: "Select .env" }));
    await user.click(
      screen.getByRole("checkbox", { name: "Select .env.staging" }),
    );

    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Seal 2 selected files" }),
    ).toBeInTheDocument();
  });

  it("offers no checkbox for a file that cannot be sealed", () => {
    setup(many);
    expect(
      screen.queryByRole("checkbox", { name: "Select .env.production" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "Select .env.gone" }),
    ).not.toBeInTheDocument();
  });

  it("names every file that failed and why, rather than reporting a count", () => {
    setup(many, [
      { path: "/repos/app/.env", sealed: true, reason: null },
      { path: "/repos/app/.env.staging", sealed: false, reason: "busy" },
    ]);

    const report = screen.getByRole("status");
    expect(report).toHaveTextContent(/1 file is now sealed/);
    expect(report).toHaveTextContent(".env.staging");
    expect(report).toHaveTextContent(/Another program is working/);
    expect(
      within(report).getAllByRole("listitem").map((item) => item.textContent),
    ).toHaveLength(1);
  });

  it("says plainly that a failed file is still readable", () => {
    setup(many, [
      { path: "/repos/app/.env", sealed: false, reason: "busy" },
    ]);
    expect(screen.getByText(/still readable/)).toBeInTheDocument();
  });
});
