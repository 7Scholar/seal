import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Problem } from "./Problem";

describe("Problem", () => {
  it("announces the message as an alert", () => {
    render(<Problem message="Could not open the file." onDismiss={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not open the file.");
  });

  it("is dismissible, unlike the exposure alert", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Problem message="Could not open the file." onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalled();
  });
});
