import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggletip } from "./Toggletip";

function setup() {
  return render(
    <Toggletip label="What sealed means">
      A sealed file cannot be read without your password.
    </Toggletip>,
  );
}

describe("Toggletip", () => {
  it("starts collapsed, so the explanation is disclosed only on request", () => {
    setup();
    expect(
      screen.queryByText(/cannot be read without your password/),
    ).not.toBeInTheDocument();
  });

  it("carries its state in aria-expanded rather than in its label", async () => {
    const user = userEvent.setup();
    setup();
    const trigger = screen.getByRole("button", { name: "What sealed means" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "What sealed means" })).toBe(trigger);
  });

  it("discloses its content on click", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "What sealed means" }));
    expect(
      screen.getByText(/cannot be read without your password/),
    ).toBeInTheDocument();
  });

  it("opens from the keyboard, since it is a real button", async () => {
    const user = userEvent.setup();
    setup();

    await user.tab();
    expect(screen.getByRole("button", { name: "What sealed means" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByText(/cannot be read without your password/),
    ).toBeInTheDocument();
  });

  it("dismisses on Escape and returns focus to its trigger", async () => {
    const user = userEvent.setup();
    setup();
    const trigger = screen.getByRole("button", { name: "What sealed means" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(
      screen.queryByText(/cannot be read without your password/),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("dismisses when the pointer goes elsewhere", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Toggletip label="What sealed means">
          A sealed file cannot be read without your password.
        </Toggletip>
        <button type="button">Somewhere else</button>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "What sealed means" }));
    await user.click(screen.getByRole("button", { name: "Somewhere else" }));

    expect(
      screen.queryByText(/cannot be read without your password/),
    ).not.toBeInTheDocument();
  });

  it("announces the disclosed content through a live region", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "What sealed means" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      /cannot be read without your password/,
    );
  });

  it("never describes its trigger, so pressing it is not a no-op for a screen reader", async () => {
    const user = userEvent.setup();
    setup();
    const trigger = screen.getByRole("button", { name: "What sealed means" });

    expect(trigger).not.toHaveAttribute("aria-describedby");
    await user.click(trigger);
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });
});
