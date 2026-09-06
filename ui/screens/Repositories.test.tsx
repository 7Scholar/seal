import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Repositories, type Load } from "./Repositories";
import type { RepoView } from "../ipc";

const repos: RepoView[] = [
  {
    root: "/code/site",
    name: "site",
    files: [{ relativePath: ".env", state: "plaintext", alert: true }],
  },
  {
    root: "/code/api",
    name: "api",
    files: [{ relativePath: ".env", state: "sealed", alert: false }],
  },
];

function show(load: Load, list: RepoView[] = repos, extra = {}) {
  const props = {
    repos: list,
    load,
    onRetry: vi.fn(),
    onOpen: vi.fn(),
    onAdd: vi.fn(),
    onRescan: vi.fn(),
    onReleaseRepo: vi.fn(),
    onSealRepo: vi.fn(),
    onSealAll: vi.fn(),
    ...extra,
  };
  render(<Repositories {...props} />);
  return props;
}

describe("the repositories list's states", () => {
  it("says it is loading rather than reporting an empty product", () => {
    show("loading", []);

    expect(screen.getByLabelText("Loading repositories")).toBeInTheDocument();
    expect(document.querySelector(".surface__nothing")).not.toBeInTheDocument();
  });

  it("states a failure to read, and offers a retry, rather than claiming nothing is managed", async () => {
    const user = userEvent.setup();
    const props = show("failed", []);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Seal could not read what it manages",
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it("replaces the list with the one action there is, when nothing is managed yet", async () => {
    const user = userEvent.setup();
    const props = show("ready", []);

    expect(screen.getByText("Nothing is under Seal yet.")).toBeInTheDocument();
    expect(document.querySelector(".repos")).not.toBeInTheDocument();

    const add = screen.getByRole("button", { name: "Add repository" });
    expect(add).toHaveClass("button--primary");
    await user.click(add);
    expect(props.onAdd).toHaveBeenCalled();
  });

  it("leaves the add action unfilled once the list is the point of the screen", () => {
    show("ready");

    expect(screen.getByRole("button", { name: /^site/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add repository" }),
    ).not.toHaveClass("button--primary");
  });

  it("never states a repository count, because the rows are the count", () => {
    show("ready");
    expect(screen.queryByText(/^\d+ repositor(y|ies)$/)).not.toBeInTheDocument();
  });

  it("draws one tick per managed file, and names them for a reader who cannot see", () => {
    show("ready");

    const site = screen.getByLabelText("1 managed file: 1 with a broken seal");
    expect(
      site.querySelector('.ticks__tick[data-condition="broken"]'),
    ).toBeInTheDocument();

    const api = screen.getByLabelText("1 managed file: 1 sealed");
    expect(
      api.querySelector('.ticks__tick[data-condition="sealed"]'),
    ).toBeInTheDocument();
  });

  it("caps the ticks at nine and counts the rest, keeping every broken one visible", () => {
    const files = Array.from({ length: 30 }, (_, index) => ({
      relativePath: `.env.${index}`,
      state: "sealed" as const,
      alert: index === 20,
    }));
    show("ready", [{ root: "/code/big", name: "big", files }]);

    expect(document.querySelectorAll(".ticks__tick")).toHaveLength(9);
    expect(screen.getByText("+21")).toBeInTheDocument();
    expect(
      document.querySelectorAll('.ticks__tick[data-condition="broken"]'),
    ).toHaveLength(1);
  });

  it("carries the full path for a row that has to truncate it", () => {
    const long = "a".repeat(160);
    show("ready", [{ root: `/code/${long}`, name: long, files: [] }]);

    expect(screen.getByTitle(`/code/${long}`)).toBeInTheDocument();
  });

  it("mats the row whose seal broke and offers the fix at rest, leaving a healthy row plain", async () => {
    const user = userEvent.setup();
    const props = show("ready");

    const broken = document.querySelectorAll('.repo-row[data-broken="true"]');
    expect(broken).toHaveLength(1);
    expect(broken[0]).toHaveTextContent("site");
    expect(
      document.querySelector('.repo-row[data-broken="false"]'),
    ).toHaveTextContent("api");

    expect(
      screen.getByRole("button", { name: "Why site is marked" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Seal" }));
    expect(props.onSealRepo).toHaveBeenCalledWith(repos[0]);
  });

  it("offers Seal every file where something is unsealed, and hides it where nothing is", async () => {
    const user = userEvent.setup();
    const props = show("ready");

    await user.click(screen.getByRole("button", { name: "More actions for site" }));
    const all = screen.getByRole("button", { name: "Seal every file" });
    await user.click(all);
    expect(props.onSealAll).toHaveBeenCalledWith(repos[0]);

    await user.click(screen.getByRole("button", { name: "More actions for api" }));
    expect(
      screen.queryByRole("button", { name: "Seal every file" }),
    ).not.toBeInTheDocument();
  });

  it("sorts a repository whose seal broke to the top, whatever its place in the registry", () => {
    show("ready", [
      { root: "/code/a", name: "a", files: [{ relativePath: ".env", state: "sealed", alert: false }] },
      { root: "/code/b", name: "b", files: [{ relativePath: ".env", state: "sealed", alert: false }] },
      repos[0]!,
    ]);

    const order = [...document.querySelectorAll(".repo-row__open")].map(
      (row) => row.textContent,
    );
    expect(order[0]).toBe("site");
  });

  it("says it cannot vouch for a repository it could not re-read, rather than showing stale ticks", async () => {
    const user = userEvent.setup();
    const props = show("ready", [
      {
        root: "/code/dot",
        name: "dotfiles",
        files: [
          { relativePath: ".env", state: "unknown", alert: false },
          { relativePath: ".npmrc", state: "unknown", alert: false },
        ],
      },
    ]);

    expect(document.querySelector(".ticks__dash")).toBeInTheDocument();
    expect(document.querySelectorAll(".ticks__tick")).toHaveLength(0);
    expect(
      screen.getByLabelText(
        "Seal could not re-read dotfiles, so it cannot say what is sealed",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it("keeps drawing ticks where only some files are unreadable", () => {
    show("ready", [
      {
        root: "/code/dot",
        name: "dotfiles",
        files: [
          { relativePath: ".env", state: "sealed", alert: false },
          { relativePath: ".npmrc", state: "unknown", alert: false },
        ],
      },
    ]);

    expect(document.querySelector(".ticks__dash")).toBeNull();
    expect(document.querySelectorAll(".ticks__tick")).toHaveLength(2);
    expect(
      screen.getByLabelText("2 managed files: 1 sealed, 1 unknown"),
    ).toBeInTheDocument();
  });

  it("states what matched nothing, and clears it", async () => {
    const user = userEvent.setup();
    show("ready");

    await user.type(screen.getByLabelText("Search repositories"), "vault");
    expect(screen.getByText("No repository matches")).toBeInTheDocument();
    expect(screen.getByText("vault")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(document.querySelectorAll(".repo-row")).toHaveLength(2);
  });
});
