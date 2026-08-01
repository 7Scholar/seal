import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManageFlow } from "./ManageFlow";
import type { ScanView } from "../ipc";

const scan: ScanView = {
  root: "/repos/app",
  alreadyRegistered: false,
  candidates: [
    { relativePath: ".env.production", confidence: "secret", reason: "an env file", preselected: true, alreadyManaged: false },
    { relativePath: ".env", confidence: "secret", reason: "an env file", preselected: true, alreadyManaged: false },
    { relativePath: "config/keys.json", confidence: "ambiguous", reason: "may hold credentials", preselected: false, alreadyManaged: false },
    { relativePath: ".env.example", confidence: "template", reason: "an example file", preselected: false, alreadyManaged: false },
  ],
};

function setup(overrides: Partial<ScanView> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ManageFlow scan={{ ...scan, ...overrides }} onConfirm={onConfirm} onCancel={onCancel} />,
  );
  return { onConfirm, onCancel };
}

describe("ManageFlow", () => {
  it("preselects only the files that look genuinely secret", () => {
    setup();
    const checked = screen
      .getAllByRole("checkbox")
      .filter((box) => (box as HTMLInputElement).checked)
      .map((box) => box.closest("label")?.querySelector(".manage__path")?.textContent);

    expect(checked.sort()).toEqual([".env", ".env.production"]);
  });

  it("never preselects a template, since managing one breaks a build", () => {
    setup();
    expect(screen.getByRole("checkbox", { name: /\.env\.example/ })).not.toBeChecked();
  });

  it("groups candidates by classification with counts", () => {
    setup();
    expect(screen.getByText("Secret files (2)")).toBeInTheDocument();
    expect(screen.getByText("Possibly secret (1)")).toBeInTheDocument();
    expect(screen.getByText("Templates and examples (1)")).toBeInTheDocument();
  });

  it("states plainly that confirming encrypts nothing", () => {
    setup();
    expect(screen.getByText(/does not encrypt anything/i)).toBeInTheDocument();
  });

  it("states that the files do not move", () => {
    setup();
    expect(
      screen.getByText(/nothing is moved, renamed, or copied/i),
    ).toBeInTheDocument();
  });

  it("confirms with exactly the selected paths", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();

    await user.click(screen.getByRole("checkbox", { name: /keys\.json/ }));
    await user.click(screen.getByRole("button", { name: /Manage 3 files/ }));

    const [selected] = onConfirm.mock.calls[0] as [string[]];
    expect([...selected].sort()).toEqual([".env", ".env.production", "config/keys.json"]);
  });

  it("scopes select-all to its own group", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Select all in Templates and examples" }));

    expect(screen.getByRole("checkbox", { name: /\.env\.example/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /keys\.json/ })).not.toBeChecked();
  });

  it("cannot confirm an empty selection", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Select none in Secret files" }));
    expect(screen.getByRole("button", { name: /Manage 0 files/ })).toBeDisabled();
  });

  it("shows an already-managed file as such and does not re-select it", () => {
    setup({
      candidates: [
        { relativePath: ".env.production", confidence: "secret", reason: "an env file", preselected: true, alreadyManaged: true },
      ],
    });

    const box = screen.getByRole("checkbox", { name: /\.env\.production/ });
    expect(box).toBeDisabled();
    expect(box).not.toBeChecked();
    expect(screen.getByText("already managed")).toBeInTheDocument();
  });

  it("explains a rescan rather than implying it replaces anything", () => {
    setup({ alreadyRegistered: true });
    expect(screen.getByText(/nothing already managed is changed/i)).toBeInTheDocument();
  });

  it("offers a constructive next step when the scan finds nothing", () => {
    setup({ candidates: [] });
    expect(screen.getByText(/No candidate secret files were found/i)).toBeInTheDocument();
  });

  it("shows why each candidate was proposed", () => {
    setup();
    expect(screen.getAllByText("an env file")).toHaveLength(2);
    expect(screen.getByText("may hold credentials")).toBeInTheDocument();
  });
});
