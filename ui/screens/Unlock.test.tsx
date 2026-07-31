import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Unlock } from "./Unlock";

describe("Unlock", () => {
  it("names the locked state and the way through it", () => {
    render(<Unlock onUnlock={vi.fn()} />);
    expect(screen.getByText("Seal is locked")).toBeInTheDocument();
    expect(
      screen.getByText("Type your master password, then press Enter."),
    ).toBeInTheDocument();
  });

  it("focuses the password field so typing works immediately", () => {
    render(<Unlock onUnlock={vi.fn()} />);
    expect(screen.getByLabelText("Master password")).toHaveFocus();
  });

  it("masks the password field and opts out of autocomplete", () => {
    render(<Unlock onUnlock={vi.fn()} />);
    const field = screen.getByLabelText("Master password");
    expect(field).toHaveAttribute("type", "password");
    expect(field).toHaveAttribute("autocomplete", "off");
    expect(field).toHaveAttribute("spellcheck", "false");
  });

  it("attempts the unlock on Enter", async () => {
    const user = userEvent.setup();
    const onUnlock = vi.fn(async () => {});
    render(<Unlock onUnlock={onUnlock} />);

    await user.keyboard("sesame{Enter}");

    expect(onUnlock).toHaveBeenCalledWith("sesame");
  });

  it("does not attempt an unlock on Enter with nothing typed", async () => {
    const user = userEvent.setup();
    const onUnlock = vi.fn();
    render(<Unlock onUnlock={onUnlock} />);

    await user.keyboard("{Enter}");

    expect(onUnlock).not.toHaveBeenCalled();
  });

  it("shows a working state while the key is derived", async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    const onUnlock = vi.fn(
      () => new Promise<void>((resolve) => { release = resolve; }),
    );
    render(<Unlock onUnlock={onUnlock} />);

    await user.keyboard("secret{Enter}");

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

    await user.keyboard("nope{Enter}");

    expect(
      await screen.findByText(/did not open your files. Nothing was changed./i),
    ).toBeInTheDocument();
  });

  it("clears a failed attempt so retyping and Enter submit only the fresh text", async () => {
    const user = userEvent.setup();
    const onUnlock = vi
      .fn<(passphrase: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("wrong"))
      .mockResolvedValueOnce(undefined);
    render(<Unlock onUnlock={onUnlock} />);

    await user.keyboard("nope{Enter}");
    expect(await screen.findByLabelText("Master password")).toHaveValue("");

    await user.keyboard("sesame{Enter}");
    expect(onUnlock).toHaveBeenLastCalledWith("sesame");
  });
});
