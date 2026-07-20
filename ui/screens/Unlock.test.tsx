import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Unlock } from "./Unlock";

describe("Unlock", () => {
  it("names the state's exit in its primary button", () => {
    render(<Unlock onUnlock={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Unlock" })).toBeInTheDocument();
    expect(screen.getByText("Seal is locked")).toBeInTheDocument();
  });

  it("does not submit an empty password", () => {
    render(<Unlock onUnlock={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Unlock" })).toBeDisabled();
  });

  it("masks the password field and opts out of autocomplete", () => {
    render(<Unlock onUnlock={vi.fn()} />);
    const field = screen.getByLabelText("Master password");
    expect(field).toHaveAttribute("type", "password");
    expect(field).toHaveAttribute("autocomplete", "off");
    expect(field).toHaveAttribute("spellcheck", "false");
  });

  it("shows a working state while the key is derived", async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    const onUnlock = vi.fn(
      () => new Promise<void>((resolve) => { release = resolve; }),
    );
    render(<Unlock onUnlock={onUnlock} />);

    await user.type(screen.getByLabelText("Master password"), "secret");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    expect(screen.getByRole("button", { name: "Unlocking…" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Unlock status" })).toHaveTextContent(
      /takes a moment/i,
    );
    release();
  });

  it("reports a wrong password without blaming the user's data", async () => {
    const user = userEvent.setup();
    const onUnlock = vi.fn(async () => {
      throw new Error("wrong");
    });
    render(<Unlock onUnlock={onUnlock} />);

    await user.type(screen.getByLabelText("Master password"), "nope");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    expect(
      await screen.findByText(/did not open your files. Nothing was changed./i),
    ).toBeInTheDocument();
  });

  it("clears the field after a failed attempt", async () => {
    const user = userEvent.setup();
    const onUnlock = vi.fn(async () => {
      throw new Error("wrong");
    });
    render(<Unlock onUnlock={onUnlock} />);

    await user.type(screen.getByLabelText("Master password"), "nope");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    expect(await screen.findByLabelText("Master password")).toHaveValue("");
  });
});
