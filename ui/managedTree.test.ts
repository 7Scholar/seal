import { describe, expect, it } from "vitest";
import { buildTree, filterTree, folderPaths } from "./managedTree";
import type { FileView } from "./ipc";

const file = (relativePath: string): FileView => ({
  relativePath,
  state: "sealed",
  alert: false,
});

const shape = (nodes: ReturnType<typeof buildTree>): string[] =>
  nodes.flatMap((node) =>
    node.kind === "folder"
      ? [`${node.path}/`, ...shape(node.children)]
      : [node.name],
  );

describe("the managed tree", () => {
  it("builds a folder per path segment, sharing ancestors between siblings", () => {
    expect(
      shape(buildTree([file("apps/app/.env"), file("apps/api/.env")])),
    ).toEqual(["apps/", "apps/api/", ".env", "apps/app/", ".env"]);
  });

  it("puts folders before files at every level, each alphabetically", () => {
    expect(
      shape(buildTree([file("z.env"), file("a.env"), file("zz/.env")])),
    ).toEqual(["zz/", ".env", "a.env", "z.env"]);
  });

  it("keeps a root-level file at the root rather than inventing a folder", () => {
    const tree = buildTree([file(".npmrc")]);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.kind).toBe("file");
  });

  it("names a file by its last segment, not its whole path", () => {
    const tree = buildTree([file("a/b/c/.env.production")]);
    expect(shape(tree)).toEqual(["a/", "a/b/", "a/b/c/", ".env.production"]);
  });

  it("lists every folder path, at every depth", () => {
    expect(folderPaths(buildTree([file("a/b/.env"), file("c/.env")]))).toEqual([
      "a",
      "a/b",
      "c",
    ]);
  });

  it("keeps a folder whose descendant matches, and drops one whose does not", () => {
    const tree = buildTree([file("apps/.env.staging"), file("infra/.env")]);
    expect(shape(filterTree(tree, "staging"))).toEqual([
      "apps/",
      ".env.staging",
    ]);
  });

  it("keeps everything under a folder whose own name matches", () => {
    const tree = buildTree([file("infra/.env"), file("infra/keys.json")]);
    expect(shape(filterTree(tree, "infra"))).toEqual([
      "infra/",
      ".env",
      "keys.json",
    ]);
  });

  it("matches on the whole path, so a folder name finds files under it", () => {
    const tree = buildTree([file("apps/web/.env")]);
    expect(shape(filterTree(tree, "web/.env"))).toEqual([
      "apps/",
      "apps/web/",
      ".env",
    ]);
  });

  it("returns the tree untouched for an empty query", () => {
    const tree = buildTree([file("a/.env")]);
    expect(filterTree(tree, "   ")).toBe(tree);
  });
});
