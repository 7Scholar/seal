import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SecretValue } from "./SecretValue";
import { MASK } from "../format";

function setup(revealed: string | null) {
  const onReveal = vi.fn();
  const onConceal = vi.fn();
  const onEdit = vi.fn();
  render(
    <SecretValue
      variableName="DATABASE_URL"
      revealed={revealed}
      onReveal={onReveal}
      onConceal={onConceal}
      onEdit={onEdit}
    />,
  );
  return { onReveal, onConceal, onEdit };
}

const masked = () =>
  screen.getByRole("button", { name: "Reveal value for DATABASE_URL" });
const shown = () => screen.getByRole("button", { name: "Edit DATABASE_URL" });

describe("SecretValue, the value as the button", () => {
  it("shows the mask and never the value until revealed", () => {
    setup(null);
    expect(screen.getByText(MASK)).toBeInTheDocument();
    expect(screen.queryByText("postgres://real")).not.toBeInTheDocument();
  });

  it("carries its state in aria-pressed rather than in the label", () => {
    setup(null);
    expect(masked()).toHaveAttribute("aria-pressed", "false");
    screen.getByText(MASK);
  });

  it("reports itself pressed once the value is shown", () => {
    setup("postgres://real");
    expect(shown()).toHaveAttribute("aria-pressed", "true");
  });

  it("names the variable so rows are distinguishable to a screen reader", () => {
    setup(null);
    expect(masked()).toBeInTheDocument();
  });

  it("names what a press will do, because the same press reveals or edits", () => {
    const { unmount } = render(<span />);
    unmount();
    setup(null);
    expect(masked()).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit DATABASE_URL" }),
    ).not.toBeInTheDocument();
  });

  it("announces the reveal state to assistive technology", () => {
    setup("postgres://real");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Value for DATABASE_URL is shown",
    );
  });

  it("reveals on the first press", async () => {
    const user = userEvent.setup();
    const { onReveal, onEdit } = setup(null);
    await user.click(masked());
    expect(onReveal).toHaveBeenCalledOnce();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("edits on a press once the value is already shown", async () => {
    const user = userEvent.setup();
    const { onReveal, onEdit } = setup("postgres://real");
    await user.click(shown());
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onReveal).not.toHaveBeenCalled();
  });

  it("re-masks on Escape, so a revealed secret can be put back", async () => {
    const user = userEvent.setup();
    const { onConceal } = setup("postgres://real");
    shown().focus();
    await user.keyboard("{Escape}");
    expect(onConceal).toHaveBeenCalledOnce();
  });

  it("does not re-mask on Escape when nothing is revealed", async () => {
    const user = userEvent.setup();
    const { onConceal } = setup(null);
    masked().focus();
    await user.keyboard("{Escape}");
    expect(onConceal).not.toHaveBeenCalled();
  });

  it("offers no copy control, and leaves the revealed value selectable instead", () => {
    setup("postgres://real");
    expect(screen.queryByRole("button", { name: /Copy/ })).not.toBeInTheDocument();
    expect(screen.getByText("postgres://real")).toHaveClass("secret-value__text");
  });

  it("is reachable by keyboard", async () => {
    const user = userEvent.setup();
    const { onReveal } = setup(null);
    await user.tab();
    expect(masked()).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onReveal).toHaveBeenCalledOnce();
  });
});
