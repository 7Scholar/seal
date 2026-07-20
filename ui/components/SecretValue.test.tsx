import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SecretValue } from "./SecretValue";
import { MASK } from "../format";

function setup(revealed: string | null) {
  const onReveal = vi.fn();
  const onConceal = vi.fn();
  const onCopy = vi.fn();
  render(
    <SecretValue
      variableName="DATABASE_URL"
      revealed={revealed}
      onReveal={onReveal}
      onConceal={onConceal}
      onCopy={onCopy}
    />,
  );
  return { onReveal, onConceal, onCopy };
}

describe("SecretValue", () => {
  it("shows the mask and never the value until revealed", () => {
    setup(null);
    expect(screen.getByText(MASK)).toBeInTheDocument();
    expect(screen.queryByText("postgres://real")).not.toBeInTheDocument();
  });

  it("carries its state in aria-pressed rather than in the label", () => {
    setup(null);
    const toggle = screen.getByRole("button", {
      name: "Reveal value for DATABASE_URL",
    });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("names the variable so rows are distinguishable to a screen reader", () => {
    setup(null);
    expect(
      screen.getByRole("button", { name: "Reveal value for DATABASE_URL" }),
    ).toBeInTheDocument();
  });

  it("keeps the accessible name constant across states", () => {
    setup("postgres://real");
    const toggle = screen.getByRole("button", {
      name: "Reveal value for DATABASE_URL",
    });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("announces the reveal state to assistive technology", () => {
    setup("postgres://real");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Value for DATABASE_URL is shown",
    );
  });

  it("asks to reveal when hidden and to conceal when shown", async () => {
    const user = userEvent.setup();
    const { onReveal } = setup(null);
    await user.click(
      screen.getByRole("button", { name: "Reveal value for DATABASE_URL" }),
    );
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it("offers copy only once the value is actually revealed", () => {
    setup(null);
    expect(
      screen.queryByRole("button", { name: /Copy value/ }),
    ).not.toBeInTheDocument();
  });

  it("offers copy when revealed", () => {
    setup("postgres://real");
    expect(
      screen.getByRole("button", { name: "Copy value for DATABASE_URL" }),
    ).toBeInTheDocument();
  });

  it("is reachable by keyboard", async () => {
    const user = userEvent.setup();
    const { onReveal } = setup(null);
    await user.tab();
    expect(
      screen.getByRole("button", { name: "Reveal value for DATABASE_URL" }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onReveal).toHaveBeenCalledOnce();
  });
});
