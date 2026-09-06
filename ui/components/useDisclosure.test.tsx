import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Overflow } from "./Overflow";
import { Toggletip } from "./Toggletip";
import { JumpMenu } from "./JumpMenu";

function open(name: string) {
  return screen.getByRole("button", { name });
}

const disclosures = [
  {
    what: "the overflow menu",
    trigger: "More actions",
    render: () => (
      <>
        <button type="button">elsewhere</button>
        <Overflow label="More actions">
          <button type="button">Release</button>
        </Overflow>
      </>
    ),
    shown: () => screen.queryByRole("button", { name: "Release" }),
  },
  {
    what: "the toggletip",
    trigger: "What this means",
    render: () => (
      <>
        <button type="button">elsewhere</button>
        <Toggletip label="What this means">Seal watches these files.</Toggletip>
      </>
    ),
    shown: () => screen.queryByText("Seal watches these files."),
  },
  {
    what: "the jump menu",
    trigger: "Jump to a repository or file",
    render: () => (
      <>
        <button type="button">elsewhere</button>
        <JumpMenu
          repos={[
            {
              root: "/code/app",
              name: "app",
              files: [{ relativePath: ".env", state: "sealed", alert: false }],
            },
          ]}
          currentRoot="/code/app"
          currentPath={null}
          onOpenRepository={vi.fn()}
          onOpenFile={vi.fn()}
          onAdd={vi.fn()}
        />
      </>
    ),
    shown: () => screen.queryByRole("menu", { name: "Jump to a repository or file" }),
  },
];

describe("every disclosure obeys one contract", () => {
  for (const disclosure of disclosures) {
    it(`${disclosure.what} dismisses on Escape with focus outside it, returning focus to its trigger`, async () => {
      const user = userEvent.setup();
      render(disclosure.render());

      await user.click(open(disclosure.trigger));
      expect(disclosure.shown()).toBeInTheDocument();

      screen.getByRole("button", { name: "elsewhere" }).focus();
      expect(disclosure.shown()).toBeInTheDocument();

      await user.keyboard("{Escape}");

      expect(disclosure.shown()).not.toBeInTheDocument();
      expect(open(disclosure.trigger)).toHaveFocus();
    });

    it(`${disclosure.what} dismisses on a press outside it`, async () => {
      const user = userEvent.setup();
      render(disclosure.render());

      await user.click(open(disclosure.trigger));
      expect(disclosure.shown()).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "elsewhere" }));

      expect(disclosure.shown()).not.toBeInTheDocument();
    });
  }
});
