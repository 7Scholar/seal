import { describe, expect, it } from "vitest";
import { preselectedPaths } from "./FileTree";
import type { TreeNode } from "../ipc";

const node = (
  name: string,
  extra: Partial<Extract<TreeNode, { kind: "file" }>>,
): TreeNode => ({
  kind: "file",
  name,
  relativePath: name,
  confidence: null,
  reason: null,
  preselected: false,
  alreadyManaged: false,
  ...extra,
});

describe("preselectedPaths", () => {
  it("takes only what the scan marked preselected", () => {
    const picked = preselectedPaths([
      node(".env", { confidence: "secret", preselected: true }),
      node(".env.example", { confidence: "template", preselected: false }),
    ]);
    expect([...picked]).toEqual([".env"]);
  });
});
