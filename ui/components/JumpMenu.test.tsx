import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RepoView } from "../ipc";
import { JumpMenu } from "./JumpMenu";

const repos: RepoView[] = [
  {
    root: "/code/seal",
    name: "seal",
    files: [
      { relativePath: "apps/app/.env", state: "sealed", alert: false },
      { relativePath: "apps/app/.env.local", state: "plaintext", alert: true },
      { relativePath: "apps/api/.env", state: "sealed", alert: false },
      { relativePath: "infra/credentials.json", state: "sealed", alert: false },
      { relativePath: "infra/.env.production", state: "plaintext", alert: false },
      { relativePath: ".npmrc", state: "missing", alert: false },
    ],
  },
  { root: "/code/notes", name: "notes", files: [] },
];

function mount(overrides: Partial<Parameters<typeof JumpMenu>[0]> = {}) {
  const props = {
    repos,
    currentRoot: null,
    currentPath: null,
    onOpenRepository: vi.fn(),
    onOpenFile: vi.fn(),
    onAdd: vi.fn(),
    ...overrides,
  };
  render(<JumpMenu {...props} />);
  return props;
}

function trigger() {
  return screen.getByRole("button", { name: "Jump to a repository or file" });
}

async function openFiles(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(trigger());
  await user.hover(screen.getByRole("menuitem", { name }));
  return screen.getByRole("menu", { name: `Files in ${name}` });
}

describe("the second panel", () => {
  it("names each directory once and hangs its files beneath, whatever their depth", async () => {
    const user = userEvent.setup();
    mount();

    const panel = await openFiles(user, "seal");
    const rows = within(panel).getAllByRole("menuitem");

    expect(rows.map((row) => row.textContent)).toEqual([
      "apps / api",
      ".env",
      "apps / app",
      ".env",
      ".env.local",
      "infra",
      ".env.production",
      "credentials.json",
      ".npmrc",
    ]);
  });

  it("wears the same state language the file line wears", async () => {
    const user = userEvent.setup();
    mount();

    const panel = await openFiles(user, "seal");
    const conditions = [...panel.querySelectorAll(".jump__file")].map(
      (row) => row.getAttribute("data-condition"),
    );

    expect(conditions).toEqual([
      "sealed",
      "sealed",
      "broken",
      "open",
      "sealed",
      "gone",
    ]);
  });

  it("indents a file under its directory and leaves a root file where it is", async () => {
    const user = userEvent.setup();
    mount();

    const panel = await openFiles(user, "seal");

    expect(
      within(panel).getByRole("menuitem", { name: "credentials.json" }),
    ).toHaveAttribute("data-indented", "true");
    expect(
      within(panel).getByRole("menuitem", { name: ".npmrc" }),
    ).toHaveAttribute("data-indented", "false");
  });

  it("folds a directory away, and the files under it go with it", async () => {
    const user = userEvent.setup();
    mount();

    const panel = await openFiles(user, "seal");
    await user.click(within(panel).getByRole("menuitem", { name: "infra" }));

    expect(
      within(panel).queryByRole("menuitem", { name: "credentials.json" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByRole("menuitem", { name: "apps / app" }),
    ).toBeInTheDocument();
  });

  it("says so when a repository holds nothing yet, rather than opening empty", async () => {
    const user = userEvent.setup();
    mount();

    const panel = await openFiles(user, "notes");

    expect(within(panel).getByText("No files under Seal yet.")).toBeInTheDocument();
  });

  it("opens a file at the repository it was found under", async () => {
    const user = userEvent.setup();
    const props = mount();

    const panel = await openFiles(user, "seal");
    await user.click(
      within(panel).getByRole("menuitem", { name: "credentials.json" }),
    );

    expect(props.onOpenFile).toHaveBeenCalledWith(
      repos[0],
      "infra/credentials.json",
    );
    expect(
      screen.queryByRole("menu", { name: "Jump to a repository or file" }),
    ).not.toBeInTheDocument();
  });
});

describe("the keyboard reaches everything the pointer reaches", () => {
  it("opens the submenu with ArrowRight and gives it back with ArrowLeft", async () => {
    const user = userEvent.setup();
    mount();

    await user.click(trigger());
    expect(screen.getByRole("menuitem", { name: "seal" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    const panel = screen.getByRole("menu", { name: "Files in seal" });
    expect(within(panel).getByRole("menuitem", { name: "apps / api" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(within(panel).getAllByRole("menuitem")[1]).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(
      screen.queryByRole("menu", { name: "Files in seal" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "seal" })).toHaveFocus();
  });

  it("closes an open submenu when the arrow moves to another repository", async () => {
    const user = userEvent.setup();
    mount();

    await user.click(trigger());
    await user.hover(screen.getByRole("menuitem", { name: "seal" }));
    expect(screen.getByRole("menu", { name: "Files in seal" })).toBeInTheDocument();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "notes" })).toHaveFocus();
    expect(
      screen.queryByRole("menu", { name: "Files in seal" }),
    ).not.toBeInTheDocument();
  });

  it("wraps from the add action back to the first repository", async () => {
    const user = userEvent.setup();
    mount();

    await user.click(trigger());
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Add repository" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "seal" })).toHaveFocus();
  });
});
