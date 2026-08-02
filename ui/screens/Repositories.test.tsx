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
    ...extra,
  };
  render(<Repositories {...props} />);
  return props;
}

describe("the repositories grid's states", () => {
  it("says it is loading rather than reporting an empty product", () => {
    show("loading", []);

    expect(screen.getByLabelText("Loading repositories")).toBeInTheDocument();
    expect(document.querySelector(".tile--add")).not.toBeInTheDocument();
    expect(screen.queryByText(/repositories$/)).not.toBeInTheDocument();
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

  it("offers the add tile inside the grid when empty, in the grid's own language", async () => {
    const user = userEvent.setup();
    const props = show("ready", []);

    const tile = document.querySelector(".tile--add");
    expect(tile).toBeInTheDocument();
    expect(screen.getByRole("list")).toContainElement(tile as HTMLElement);

    await user.click(tile!.querySelector("button")!);
    expect(props.onAdd).toHaveBeenCalled();
  });

  it("keeps the add tile in the grid once repositories exist", () => {
    show("ready");

    expect(screen.getByRole("button", { name: /^site/ })).toBeInTheDocument();
    expect(document.querySelector(".tile--add")).toBeInTheDocument();
  });

  it("states how many repositories there are", () => {
    show("ready");
    expect(screen.getByText("2 repositories")).toBeInTheDocument();
  });

  it("counts nothing when there is nothing, rather than saying zero", () => {
    show("ready", []);
    expect(screen.queryByText(/repositories$/)).not.toBeInTheDocument();
    expect(screen.queryByText("0 repositories")).not.toBeInTheDocument();
  });

  it("carries the full name and path for a tile that has to truncate them", () => {
    const long = "a".repeat(160);
    show("ready", [
      { root: `/code/${long}`, name: long, files: [] },
    ]);

    expect(screen.getByTitle(long)).toBeInTheDocument();
    expect(screen.getByTitle(`/code/${long}`)).toBeInTheDocument();
  });

  it("states an exposure on the tile and stays quiet on a healthy one", () => {
    show("ready");

    expect(screen.getByText("1 file readable — should be sealed")).toBeInTheDocument();
    const healthy = screen.getByRole("button", { name: /^api/ });
    expect(healthy).not.toHaveTextContent("readable");
  });
});
