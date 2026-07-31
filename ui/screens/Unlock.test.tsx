import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Unlock } from "./Unlock";

describe("Unlock, entering", () => {
  it("names the locked state and the way through it", () => {
    render(<Unlock mode="verify" onSubmit={vi.fn()} />);
    expect(screen.getByText("Seal is locked")).toBeInTheDocument();
    expect(
      screen.getByText("Type your master password, then press Enter."),
    ).toBeInTheDocument();
  });

  it("focuses the password field so typing works immediately", () => {
    render(<Unlock mode="verify" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Master password")).toHaveFocus();
  });

  it("masks the password field and opts out of autocomplete", () => {
    render(<Unlock mode="verify" onSubmit={vi.fn()} />);
    const field = screen.getByLabelText("Master password");
    expect(field).toHaveAttribute("type", "password");
    expect(field).toHaveAttribute("autocomplete", "off");
    expect(field).toHaveAttribute("spellcheck", "false");
  });

  it("attempts the unlock on Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(<Unlock mode="verify" onSubmit={onSubmit} />);

    await user.keyboard("sesame{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("sesame");
  });

  it("does not attempt an unlock on Enter with nothing typed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Unlock mode="verify" onSubmit={onSubmit} />);

    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a working state while the key is derived", async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    const onSubmit = vi.fn(
      () => new Promise<void>((resolve) => { release = resolve; }),
    );
    render(<Unlock mode="verify" onSubmit={onSubmit} />);

    await user.keyboard("secret{Enter}");

    expect(screen.getByRole("status", { name: "Unlock status" })).toHaveTextContent(
      /takes a moment/i,
    );
    release();
  });

  it("reports a wrong password without blaming the user's data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {
      throw new Error("wrong");
    });
    render(<Unlock mode="verify" onSubmit={onSubmit} />);

    await user.keyboard("nope{Enter}");

    expect(
      await screen.findByText(/did not open your files. Nothing was changed./i),
    ).toBeInTheDocument();
  });

  it("clears a failed attempt so retyping and Enter submit only the fresh text", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn<(passphrase: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("wrong"))
      .mockResolvedValueOnce(undefined);
    render(<Unlock mode="verify" onSubmit={onSubmit} />);

    await user.keyboard("nope{Enter}");
    expect(await screen.findByLabelText("Master password")).toHaveValue("");

    await user.keyboard("sesame{Enter}");
    expect(onSubmit).toHaveBeenLastCalledWith("sesame");
  });

  it("carries an outside notice, such as the session having ended, until typing starts", async () => {
    const user = userEvent.setup();
    render(
      <Unlock mode="verify" notice="Seal locked itself." onSubmit={vi.fn()} />,
    );

    expect(screen.getByRole("status", { name: "Unlock status" })).toHaveTextContent(
      "Seal locked itself.",
    );

    await user.keyboard("s");
    expect(screen.getByRole("status", { name: "Unlock status" })).not.toHaveTextContent(
      "Seal locked itself.",
    );
  });
});

describe("Unlock, establishing", () => {
  it("says a password is being chosen, not entered, and states unrecoverability", () => {
    render(<Unlock mode="create" onSubmit={vi.fn()} />);
    expect(screen.getByText("Choose your master password")).toBeInTheDocument();
    expect(
      screen.getByText(/choosing a password now, not entering one/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/never be recovered/i)).toBeInTheDocument();
  });

  it("asks for confirmation instead of setting on the first Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(<Unlock mode="create" onSubmit={onSubmit} />);

    await user.keyboard("chosen one{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Master password")).toHaveValue("");
    expect(screen.getByRole("status", { name: "Unlock status" })).toHaveTextContent(
      /nothing is set yet.*confirm/i,
    );
  });

  it("sets the password only when the confirmation matches", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(<Unlock mode="create" onSubmit={onSubmit} />);

    await user.keyboard("chosen one{Enter}");
    await user.keyboard("chosen one{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("chosen one");
  });

  it("catches a typo: a mismatched confirmation sets nothing and starts over", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(<Unlock mode="create" onSubmit={onSubmit} />);

    await user.keyboard("chosen one{Enter}");
    await user.keyboard("chosen wne{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("status", { name: "Unlock status" })).toHaveTextContent(
      /did not match. Nothing was set/i,
    );

    await user.keyboard("second try{Enter}");
    await user.keyboard("second try{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("second try");
  });

  it("reports a failure to set without implying anything was changed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {
      throw new Error("io");
    });
    render(<Unlock mode="create" onSubmit={onSubmit} />);

    await user.keyboard("chosen one{Enter}");
    await user.keyboard("chosen one{Enter}");

    expect(
      await screen.findByText(/could not be set. Nothing was changed/i),
    ).toBeInTheDocument();
  });
});
