import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManageFlow } from "./ManageFlow";
import type { ScanView, TreeNode } from "../ipc";

function file(
  relativePath: string,
  candidate?: Partial<Extract<TreeNode, { kind: "file" }>>,
): TreeNode {
  return {
    kind: "file",
    name: relativePath.split("/").pop() ?? relativePath,
    relativePath,
    confidence: null,
    reason: null,
    preselected: false,
    alreadyManaged: false,
    ...candidate,
  };
}

function directory(
  relativePath: string,
  children: TreeNode[],
  walked = true,
): TreeNode {
  return {
    kind: "directory",
    name: relativePath.split("/").pop() ?? relativePath,
    relativePath,
    walked,
    children,
  };
}

const scan: ScanView = {
  root: "/repos/app",
  alreadyRegistered: false,
  candidates: [
    { relativePath: ".env.production", confidence: "secret", reason: "an env file", preselected: true, alreadyManaged: false },
    { relativePath: "services/api/.env", confidence: "secret", reason: "an env file", preselected: true, alreadyManaged: false },
    { relativePath: "config/keys.json", confidence: "ambiguous", reason: "may hold credentials", preselected: false, alreadyManaged: false },
    { relativePath: ".env.example", confidence: "template", reason: "an example file", preselected: false, alreadyManaged: false },
  ],
  tree: [
    directory("config", [
      file("config/keys.json", { confidence: "ambiguous", reason: "may hold credentials" }),
      file("config/settings.toml"),
    ]),
    directory("node_modules", [], false),
    directory("services", [
      directory("services/api", [
        file("services/api/.env", {
          confidence: "secret",
          reason: "an env file",
          preselected: true,
        }),
        file("services/api/server.ts"),
        file("services/api/routes.ts"),
      ]),
    ]),
    file(".env.example", { confidence: "template", reason: "an example file" }),
    file(".env.production", {
      confidence: "secret",
      reason: "an env file",
      preselected: true,
    }),
    file("README.md"),
  ],
};

function setup(overrides: Partial<ScanView> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const onRetry = vi.fn();
  render(
    <ManageFlow
      root={scan.root}
      scan={{ ...scan, ...overrides }}
      failure={null}
      onRetry={onRetry}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel, onRetry };
}

function row(name: string) {
  return screen.getByRole("treeitem", { name });
}

describe("ManageFlow", () => {
  it("draws the repository, not only what Seal proposed", async () => {
    const user = userEvent.setup();
    setup();

    expect(row("README.md")).toBeInTheDocument();
    expect(row("config")).toBeInTheDocument();
    expect(row("server.ts")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand config" }));
    expect(row("settings.toml")).toBeInTheDocument();
  });

  it("preselects only the files that look genuinely secret", () => {
    setup();
    expect(row(".env.production")).toHaveAttribute("aria-checked", "true");
    expect(row(".env")).toHaveAttribute("aria-checked", "true");
    expect(row(".env.example")).toHaveAttribute("aria-checked", "false");
  });

  it("never preselects a template, since managing one breaks a build", () => {
    setup();
    expect(row(".env.example")).toHaveAttribute("aria-checked", "false");
  });

  it("expands exactly the branches leading to a preselected file", () => {
    setup();
    expect(row("services")).toHaveAttribute("aria-expanded", "true");
    expect(row("api")).toHaveAttribute("aria-expanded", "true");
    expect(row("config")).toHaveAttribute("aria-expanded", "false");
  });

  it("renders no rows for a collapsed directory's children", () => {
    setup();
    expect(row("config")).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("treeitem", { name: "settings.toml" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("treeitem", { name: "keys.json" }),
    ).not.toBeInTheDocument();
  });

  it("lets the user select a file Seal never proposed", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();

    await user.click(row("README.md"));
    await user.click(screen.getByRole("button", { name: /Manage 3 files/ }));

    const [selected] = onConfirm.mock.calls[0] as [string[]];
    expect(selected).toContain("README.md");
  });

  it("selects only the detected files beneath a folder, never every file", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();

    await user.click(row("services"));
    expect(row("services")).toHaveAttribute("aria-checked", "false");

    await user.click(row("services"));
    await user.click(screen.getByRole("button", { name: /Manage 2 files/ }));

    const [selected] = onConfirm.mock.calls[0] as [string[]];
    expect(selected).toContain("services/api/.env");
    expect(selected).not.toContain("services/api/server.ts");
    expect(selected).not.toContain("services/api/routes.ts");
  });

  it("opens a folder that holds nothing detected, rather than doing nothing at all", async () => {
    const user = userEvent.setup();
    setup({
      tree: [
        directory("src", [file("src/main.ts"), file("src/util.ts")]),
        file(".env.production", {
          confidence: "secret",
          reason: "an env file",
          preselected: true,
        }),
      ],
    });

    expect(row("src")).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("treeitem", { name: "main.ts" }),
    ).not.toBeInTheDocument();

    await user.click(row("src"));

    expect(row("src")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("treeitem", { name: "main.ts" })).toBeInTheDocument();
  });

  it("does not let opening a folder select anything inside it", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup({
      tree: [
        directory("src", [file("src/main.ts"), file("src/util.ts")]),
        file(".env.production", {
          confidence: "secret",
          reason: "an env file",
          preselected: true,
        }),
      ],
    });

    await user.click(row("src"));
    await user.click(screen.getByRole("button", { name: /Manage 1 file/ }));

    const [selected] = onConfirm.mock.calls[0] as [string[]];
    expect(selected).toEqual([".env.production"]);
  });

  it("marks a folder holding some of a selection differently from a full one", async () => {
    const user = userEvent.setup();
    setup();

    expect(row("services")).toHaveAttribute("aria-checked", "true");
    expect(row("config")).toHaveAttribute("aria-checked", "false");

    await user.click(row("config"));
    expect(row("config")).toHaveAttribute("aria-checked", "true");

    await user.click(screen.getByRole("button", { name: "Expand config" }));
    expect(row("keys.json")).toHaveAttribute("aria-checked", "true");
    await user.click(row("keys.json"));
    expect(row("config")).toHaveAttribute("aria-checked", "false");
  });

  it("shows a directory it did not look in, and refuses to expand it", () => {
    setup();
    const pruned = row("node_modules");
    expect(pruned).not.toHaveAttribute("aria-expanded");
    expect(within(pruned).getByText("not looked in")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Expand node_modules/ }),
    ).not.toBeInTheDocument();
  });

  it("expands and collapses without changing the selection", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Expand config" }));
    expect(row("config")).toHaveAttribute("aria-expanded", "true");
    expect(row("config")).toHaveAttribute("aria-checked", "false");
    expect(row("keys.json")).toHaveAttribute("aria-checked", "false");
  });

  it("carries no aria-selected anywhere in the tree", () => {
    setup();
    for (const item of screen.getAllByRole("treeitem")) {
      expect(item).not.toHaveAttribute("aria-selected");
    }
  });

  it("discloses on demand that confirming encrypts nothing and files do not move", async () => {
    const user = userEvent.setup();
    setup();

    expect(screen.queryByText(/does not encrypt anything/i)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "What managing these files does" }),
    );

    expect(screen.getByText(/does not encrypt anything/i)).toBeInTheDocument();
    expect(
      screen.getByText(/nothing is moved, renamed, or copied/i),
    ).toBeInTheDocument();
  });

  it("confirms with exactly the selected paths", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();

    await user.click(screen.getByRole("button", { name: "Expand config" }));
    await user.click(row("keys.json"));
    await user.click(screen.getByRole("button", { name: /Manage 3 files/ }));

    const [selected] = onConfirm.mock.calls[0] as [string[]];
    expect([...selected].sort()).toEqual([
      ".env.production",
      "config/keys.json",
      "services/api/.env",
    ]);
  });

  it("reaches an undetected file deep in the tree without opening a single folder", async () => {
    const user = userEvent.setup();
    setup();

    expect(
      screen.queryByRole("treeitem", { name: "settings.toml" }),
    ).not.toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Filter files" }), "settings");

    expect(screen.getByRole("treeitem", { name: "settings.toml" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "README.md" })).not.toBeInTheDocument();
  });

  it("matches on the path, so a folder's name reveals what is under it", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByRole("searchbox", { name: "Filter files" }), "services");

    expect(screen.getByRole("treeitem", { name: "server.ts" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "routes.ts" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "keys.json" })).not.toBeInTheDocument();
  });

  it("never changes the selection, and confirms the whole of it while filtered", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();

    const field = screen.getByRole("searchbox", { name: "Filter files" });
    await user.type(field, "server");

    expect(screen.getByRole("button", { name: /Manage 2 files/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Manage 2 files/ }));
    const [selected] = onConfirm.mock.calls[0] as [string[]];
    expect([...selected].sort()).toEqual([".env.production", "services/api/.env"]);
  });

  it("restores exactly the expansion that was in force before the filter was typed", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Expand config" }));
    expect(screen.getByRole("treeitem", { name: "keys.json" })).toBeInTheDocument();

    const field = screen.getByRole("searchbox", { name: "Filter files" });
    await user.type(field, "settings");
    expect(screen.getByRole("treeitem", { name: "settings.toml" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "README.md" })).not.toBeInTheDocument();

    await user.clear(field);

    expect(screen.getByRole("treeitem", { name: "keys.json" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "README.md" })).toBeInTheDocument();
  });

  it("does not carry an expansion made while filtering back into the cleared tree", async () => {
    const user = userEvent.setup();
    setup();

    expect(
      screen.queryByRole("treeitem", { name: "settings.toml" }),
    ).not.toBeInTheDocument();

    const field = screen.getByRole("searchbox", { name: "Filter files" });
    await user.type(field, "config");

    await user.click(screen.getByRole("button", { name: "Collapse config" }));
    await user.click(screen.getByRole("button", { name: "Expand config" }));

    await user.clear(field);

    expect(
      screen.queryByRole("treeitem", { name: "settings.toml" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "README.md" })).toBeInTheDocument();
  });

  it("says so when nothing matches, and offers to clear the field", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(
      screen.getByRole("searchbox", { name: "Filter files" }),
      "nothing-matches-this",
    );

    expect(screen.getByText(/No file or folder matches/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear the filter" }));
    expect(screen.getByRole("treeitem", { name: "README.md" })).toBeInTheDocument();
  });

  it("says on the visible surface that a rescan is a rescan", () => {
    setup({ alreadyRegistered: true });

    expect(
      screen.getByRole("heading", { name: /More files in app/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Already managed")).toBeInTheDocument();
  });

  it("does not claim a first add is already managed", () => {
    setup();

    expect(screen.getByRole("heading", { name: /Seal in app/ })).toBeInTheDocument();
    expect(screen.queryByText("Already managed")).not.toBeInTheDocument();
  });

  it("accounts for the files a rescan will leave alone", () => {
    setup({
      alreadyRegistered: true,
      tree: [
        file(".env.production", {
          confidence: "secret",
          reason: "an env file",
          preselected: true,
          alreadyManaged: true,
        }),
        file(".env.staging", {
          confidence: "secret",
          reason: "an env file",
          preselected: true,
        }),
      ],
    });

    expect(screen.getByText(/1 already managed, left as it is/)).toBeInTheDocument();
  });

  it("cannot confirm an empty selection", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(row(".env.production"));
    await user.click(row(".env"));
    expect(screen.getByRole("button", { name: /Manage 0 files/ })).toBeDisabled();
  });

  it("shows an already-managed file as such and does not re-select it", () => {
    setup({
      candidates: [
        { relativePath: ".env.production", confidence: "secret", reason: "an env file", preselected: true, alreadyManaged: true },
      ],
      tree: [
        file(".env.production", {
          confidence: "secret",
          reason: "an env file",
          preselected: true,
          alreadyManaged: true,
        }),
      ],
    });

    const managed = row(".env.production");
    expect(managed).toHaveAttribute("aria-checked", "false");
    expect(managed).toHaveAttribute("aria-disabled", "true");
    expect(within(managed).getByText("already managed")).toBeInTheDocument();
  });

  it("explains a rescan rather than implying it replaces anything", async () => {
    const user = userEvent.setup();
    setup({ alreadyRegistered: true });

    await user.click(
      screen.getByRole("button", { name: "What managing these files does" }),
    );
    expect(screen.getByText(/nothing already managed is changed/i)).toBeInTheDocument();
  });

  it("shows why each candidate was proposed, on its own row", async () => {
    const user = userEvent.setup();
    setup();

    expect(within(row(".env.production")).getByText("an env file")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand config" }));
    expect(within(row("keys.json")).getByText("may hold credentials")).toBeInTheDocument();
  });

  it("names the repository while the scan is still running", () => {
    render(
      <ManageFlow
        root="/repos/app"
        scan={null}
        failure={null}
        onRetry={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Seal in app" })).toBeInTheDocument();
    expect(screen.getByText("/repos/app")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Manage 0 files/ })).toBeDisabled();
    expect(screen.queryByRole("tree")).not.toBeInTheDocument();
  });

  it("owns a failed scan rather than losing it to the previous screen", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ManageFlow
        root="/repos/app"
        scan={null}
        failure="Seal could not read that folder."
        onRetry={onRetry}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Seal could not read that folder.",
    );
    expect(screen.getByRole("heading", { name: "Seal in app" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
