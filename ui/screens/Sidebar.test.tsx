import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar, type Selection } from "./Sidebar";
import type { RepoView } from "../ipc";

const app: RepoView = {
  root: "/code/app",
  name: "app",
  files: [
    { relativePath: ".env.production", state: "sealed", alert: false },
    { relativePath: "config/keys.json", state: "plaintext", alert: false },
  ],
};

const site: RepoView = {
  root: "/code/site",
  name: "site",
  files: [{ relativePath: ".env", state: "plaintext", alert: true }],
};

function renderSidebar(overrides: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  const props = {
    repos: [app, site],
    selection: { kind: "none" } as Selection,
    expanded: new Set<string>(),
    onToggleExpand: vi.fn(),
    onSelect: vi.fn(),
    onAdd: vi.fn(),
    ...overrides,
  };
  render(<Sidebar {...props} />);
  return props;
}

describe("Sidebar", () => {
  it("lists every repository", () => {
    renderSidebar();
    expect(screen.getByRole("treeitem", { name: /app/ })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: /site/ })).toBeInTheDocument();
  });

  it("collapses repositories by default, so files are disclosed on request", () => {
    renderSidebar();
    expect(screen.queryByText(".env.production")).not.toBeInTheDocument();
  });

  it("reveals a repository's files once expanded", () => {
    renderSidebar({ expanded: new Set(["/code/app"]) });
    expect(screen.getByText(".env.production")).toBeInTheDocument();
    expect(screen.getByText("config/keys.json")).toBeInTheDocument();
  });

  it("expands without selecting, so browsing is not navigating", async () => {
    const user = userEvent.setup();
    const props = renderSidebar();

    await user.click(screen.getByRole("button", { name: "Expand app" }));

    expect(props.onToggleExpand).toHaveBeenCalledWith("/code/app");
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it("selects without expanding, so reading a summary does not open the list", async () => {
    const user = userEvent.setup();
    const props = renderSidebar();

    await user.click(screen.getByRole("treeitem", { name: /app/ }));

    expect(props.onSelect).toHaveBeenCalledWith({
      kind: "repo",
      root: "/code/app",
    });
    expect(props.onToggleExpand).not.toHaveBeenCalled();
  });

  it("selects a file directly, without selecting its repository first", async () => {
    const user = userEvent.setup();
    const props = renderSidebar({ expanded: new Set(["/code/app"]) });

    await user.click(screen.getByRole("treeitem", { name: /\.env\.production/ }));

    expect(props.onSelect).toHaveBeenCalledWith({
      kind: "file",
      root: "/code/app",
      path: "/code/app/.env.production",
    });
  });

  it("says a repository holds an exposed file without being expanded", () => {
    renderSidebar();
    expect(screen.getByText("1 exposed")).toBeInTheDocument();
  });

  it("says nothing at all about a repository with nothing exposed", () => {
    renderSidebar({ repos: [app] });
    expect(screen.queryByText(/exposed/)).not.toBeInTheDocument();
  });

  it("carries expansion state in aria-expanded", () => {
    renderSidebar({ expanded: new Set(["/code/app"]) });
    expect(screen.getByRole("treeitem", { name: /app/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("treeitem", { name: /site/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("marks the selected repository as selected", () => {
    renderSidebar({ selection: { kind: "repo", root: "/code/site" } });
    expect(screen.getByRole("treeitem", { name: /site/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("expands and collapses from the keyboard with the arrow keys", async () => {
    const user = userEvent.setup();
    const props = renderSidebar();

    screen.getByRole("treeitem", { name: /app/ }).focus();
    await user.keyboard("{ArrowRight}");

    expect(props.onToggleExpand).toHaveBeenCalledWith("/code/app");
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it("selects from the keyboard with Enter", async () => {
    const user = userEvent.setup();
    const props = renderSidebar();

    screen.getByRole("treeitem", { name: /app/ }).focus();
    await user.keyboard("{Enter}");

    expect(props.onSelect).toHaveBeenCalledWith({
      kind: "repo",
      root: "/code/app",
    });
  });

  it("moves between rows with the down arrow", async () => {
    const user = userEvent.setup();
    renderSidebar();

    screen.getByRole("treeitem", { name: /app/ }).focus();
    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("treeitem", { name: /site/ })).toHaveFocus();
  });

  it("offers adding even when nothing is added yet", async () => {
    const user = userEvent.setup();
    const props = renderSidebar({ repos: [] });

    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(props.onAdd).toHaveBeenCalled();
  });

  it("keeps every file reachable by keyboard, not only by pointer", () => {
    renderSidebar({ expanded: new Set(["/code/app"]) });
    for (const item of screen.getAllByRole("treeitem")) {
      expect(item).toHaveAttribute("tabIndex", "0");
    }
  });
});
