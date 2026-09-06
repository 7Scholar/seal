import type { FileView } from "./ipc";

export interface FolderNode {
  kind: "folder";
  name: string;
  path: string;
  children: TreeNode[];
}

export interface FileNode {
  kind: "file";
  name: string;
  file: FileView;
}

export type TreeNode = FolderNode | FileNode;

interface Draft {
  folders: Map<string, Draft>;
  files: FileView[];
}

function draft(): Draft {
  return { folders: new Map(), files: [] };
}

function settle(node: Draft, prefix: string): TreeNode[] {
  const folders = [...node.folders.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, child]): TreeNode => {
      const path = prefix === "" ? name : `${prefix}/${name}`;
      return { kind: "folder", name, path, children: settle(child, path) };
    });

  const files = [...node.files]
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    .map((file): TreeNode => {
      const cut = file.relativePath.lastIndexOf("/");
      return {
        kind: "file",
        name: cut === -1 ? file.relativePath : file.relativePath.slice(cut + 1),
        file,
      };
    });

  return [...folders, ...files];
}

export function buildTree(files: FileView[]): TreeNode[] {
  const root = draft();

  for (const file of files) {
    const parts = file.relativePath.split("/");
    let node = root;
    for (const part of parts.slice(0, -1)) {
      let next = node.folders.get(part);
      if (!next) {
        next = draft();
        node.folders.set(part, next);
      }
      node = next;
    }
    node.files.push(file);
  }

  return settle(root, "");
}

export function folderPaths(nodes: TreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.kind === "folder" ? [node.path, ...folderPaths(node.children)] : [],
  );
}

export function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return nodes;

  function keep(node: TreeNode): TreeNode | null {
    if (node.kind === "file") {
      return node.file.relativePath.toLowerCase().includes(needle) ? node : null;
    }
    if (node.path.toLowerCase().includes(needle)) return node;
    const children = node.children.map(keep).filter((child) => child !== null);
    return children.length === 0 ? null : { ...node, children };
  }

  return nodes.map(keep).filter((node) => node !== null);
}

export interface Group {
  directory: string;
  files: FileView[];
}

export function groupByDirectory(files: FileView[]): Group[] {
  const groups = new Map<string, FileView[]>();

  for (const file of files) {
    const cut = file.relativePath.lastIndexOf("/");
    const directory = cut === -1 ? "" : file.relativePath.slice(0, cut);
    const bucket = groups.get(directory);
    if (bucket) bucket.push(file);
    else groups.set(directory, [file]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === "") return 1;
      if (b === "") return -1;
      return a.localeCompare(b);
    })
    .map(([directory, held]) => ({
      directory,
      files: [...held].sort((a, b) =>
        a.relativePath.localeCompare(b.relativePath),
      ),
    }));
}
