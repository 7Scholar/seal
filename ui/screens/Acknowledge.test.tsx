import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Acknowledge } from "./Acknowledge";

describe("Acknowledge", () => {
  it("states both irreversible facts", () => {
    render(<Acknowledge onAcknowledge={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/your sealed files are gone/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot reach backwards/i)).toBeInTheDocument();
  });

  it("tells the user to rotate an already-exposed credential", () => {
    render(<Acknowledge onAcknowledge={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/rotate it/i)).toBeInTheDocument();
  });

  it("states plainly that no recovery exists", () => {
    render(<Acknowledge onAcknowledge={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/no reset, no recovery key/i)).toBeInTheDocument();
  });

  it("cannot be cleared by the reflex that opened it", async () => {
    const user = userEvent.setup();
    const onAcknowledge = vi.fn();
    render(<Acknowledge onAcknowledge={onAcknowledge} onCancel={vi.fn()} />);

    const confirm = screen.getByRole("button", { name: /I understand/ });
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(onAcknowledge).not.toHaveBeenCalled();
  });

  it("proceeds once the phrase is typed", async () => {
    const user = userEvent.setup();
    const onAcknowledge = vi.fn();
    render(<Acknowledge onAcknowledge={onAcknowledge} onCancel={vi.fn()} />);

    await user.type(screen.getByRole("textbox"), "I UNDERSTAND");
    await user.click(screen.getByRole("button", { name: /I understand/ }));
    expect(onAcknowledge).toHaveBeenCalledOnce();
  });
});
