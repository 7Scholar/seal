import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordChange } from "./PasswordChange";
import type { Manifest } from "../ipc";

const partial: Manifest = {
  workFactor: 18,
  entries: [
    { path: "/repos/app/.env", standing: "converted" },
    { path: "/repos/app/.env.production", standing: "failed", reason: "Busy" },
    { path: "/repos/app/.env.staging", standing: "pending" },
  ],
};

function setup(manifest: Manifest | null) {
  const handlers = {
    onBegin: vi.fn(async () => {}),
    onRun: vi.fn(async () => {}),
    onAbandon: vi.fn(async () => {}),
    onClose: vi.fn(),
  };
  render(<PasswordChange manifest={manifest} {...handlers} />);
  return handlers;
}

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Current password"), "old");
  await user.type(screen.getByLabelText("New password"), "new");
  await user.type(screen.getByLabelText("New password again"), "new");
  await user.type(screen.getByLabelText(/Type/), "CHANGE MY PASSWORD");
}

describe("PasswordChange", () => {
  it("warns that both passwords are needed until it finishes", () => {
    setup(null);
    expect(screen.getByText(/Both passwords must be remembered/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be recovered/i)).toBeInTheDocument();
  });

  it("cannot be started by reflex", () => {
    setup(null);
    expect(screen.getByRole("button", { name: "Change the password" })).toBeDisabled();
  });

  it("refuses to start until the new password is confirmed and the phrase typed", async () => {
    const user = userEvent.setup();
    setup(null);

    await user.type(screen.getByLabelText("Current password"), "old");
    await user.type(screen.getByLabelText("New password"), "new");
    await user.type(screen.getByLabelText("New password again"), "different");

    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change the password" })).toBeDisabled();
  });

  it("runs once everything is satisfied", async () => {
    const user = userEvent.setup();
    const { onBegin, onRun } = setup(null);

    await fill(user);
    await user.click(screen.getByRole("button", { name: "Change the password" }));

    expect(onBegin).toHaveBeenCalledOnce();
    expect(onRun).toHaveBeenCalledWith("old", "new");
  });

  it("ANSWERS WHICH FILES ARE ON WHICH PASSWORD, not a bare failure count", () => {
    setup(partial);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("1 of 3 files are on the new password");
    expect(alert).toHaveTextContent("remaining 2 still need the old one");
    expect(alert).toHaveTextContent(/Keep both passwords/i);
  });

  it("names every unfinished file rather than counting them", () => {
    setup(partial);
    expect(screen.getByText(".env.production")).toBeInTheDocument();
    expect(screen.getByText(".env.staging")).toBeInTheDocument();
  });

  it("surfaces an unfinished run insistently", () => {
    setup(partial);
    expect(screen.getByRole("alert")).toHaveTextContent(/was not finished/i);
  });

  it("offers retrying only the rest, never redoing what converted", async () => {
    const user = userEvent.setup();
    const { onRun, onBegin } = setup(partial);

    await user.type(screen.getByLabelText("Old password"), "old");
    await user.type(screen.getByLabelText("New password"), "new");
    await user.type(screen.getByLabelText("New password again"), "new");
    await user.type(screen.getByLabelText(/Type/), "CHANGE MY PASSWORD");
    await user.click(screen.getByRole("button", { name: "Retry the rest" }));

    expect(onBegin).not.toHaveBeenCalled();
    expect(onRun).toHaveBeenCalledWith("old", "new");
  });

  it("gives no per-file skip, which would manufacture the half-done state", () => {
    setup(partial);
    expect(screen.queryByRole("button", { name: /skip/i })).not.toBeInTheDocument();
  });

  it("shows why a file could not be converted", () => {
    setup(partial);
    expect(screen.getByText("Busy")).toBeInTheDocument();
  });

  it("tells the user not to quit while it works", async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    const handlers = {
      onBegin: vi.fn(async () => {}),
      onRun: vi.fn(() => new Promise<void>((resolve) => { release = resolve; })),
      onAbandon: vi.fn(async () => {}),
      onClose: vi.fn(),
    };
    render(<PasswordChange manifest={null} {...handlers} />);

    await fill(user);
    await user.click(screen.getByRole("button", { name: "Change the password" }));

    expect(screen.getByRole("status", { name: "Password change progress" })).toHaveTextContent(
      /Do not quit/i,
    );
    release();
  });
});
