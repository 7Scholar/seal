import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Confirm } from "./Confirm";

describe("Confirm", () => {
  it("labels its buttons with outcomes, never Yes and No", () => {
    render(
      <Confirm
        title="Stop managing .env.production?"
        confirmLabel="Stop managing it"
        cancelLabel="Keep managing it"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      >
        body
      </Confirm>,
    );

    expect(screen.getByRole("button", { name: "Stop managing it" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep managing it" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^(yes|no|ok)$/i })).not.toBeInTheDocument();
  });

  it("confirms immediately when no typing is demanded", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <Confirm
        title="t"
        confirmLabel="Do it"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      >
        body
      </Confirm>,
    );

    await user.click(screen.getByRole("button", { name: "Do it" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("cannot be confirmed by reflex when it demands typing", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <Confirm
        title="t"
        confirmLabel="Change the password"
        cancelLabel="Cancel"
        typeToConfirm="CHANGE"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      >
        body
      </Confirm>,
    );

    const confirm = screen.getByRole("button", { name: "Change the password" });
    expect(confirm).toBeDisabled();

    await user.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("unlocks only on the exact phrase", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <Confirm
        title="t"
        confirmLabel="Change the password"
        cancelLabel="Cancel"
        typeToConfirm="CHANGE"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      >
        body
      </Confirm>,
    );

    const field = screen.getByRole("textbox");
    await user.type(field, "chang");
    expect(screen.getByRole("button", { name: "Change the password" })).toBeDisabled();

    await user.clear(field);
    await user.type(field, "CHANGE");
    const confirm = screen.getByRole("button", { name: "Change the password" });
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("is a labelled modal dialog", () => {
    render(
      <Confirm
        title="Stop managing it?"
        confirmLabel="Do it"
        cancelLabel="Cancel"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      >
        body
      </Confirm>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Stop managing it?");
  });
});
