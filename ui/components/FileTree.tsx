import { useCallback, useMemo, useState } from "react";
import type { TreeNode } from "../ipc";
import { Icon } from "./Icon";

export interface Props {
  nodes: TreeNode[];
  selected: ReadonlySet<string>;
  expanded: ReadonlySet<string>;
  disabled?: ReadonlySet<string>;
  onToggleSelect: (path: string) => void;
  onToggleSelectMany: (paths: string[], on: boolean) => void;
  onToggleExpand: (path: string) => void;
  label: string;
}

export function candidatePathsUnder(node: TreeNode): string[] {
  if (node.kind === "file") {
    return node.confidence === null ? [] : [node.relativePath];
  }
  return node.children.flatMap(candidatePathsUnder);
}

export function preselectedPaths(nodes: TreeNode[]): Set<string> {
  const picked = new Set<string>();

  function walk(node: TreeNode): void {
    if (node.kind === "file") {
      if (node.preselected && !node.alreadyManaged) picked.add(node.relativePath);
      return;
    }
    for (const child of node.children) walk(child);
  }

  for (const node of nodes) walk(node);
  return picked;
}

export function managedPaths(nodes: TreeNode[]): Set<string> {
  const managed = new Set<string>();

  function walk(node: TreeNode): void {
    if (node.kind === "file") {
      if (node.alreadyManaged) managed.add(node.relativePath);
      return;
    }
    for (const child of node.children) walk(child);
  }

  for (const node of nodes) walk(node);
  return managed;
}

export function preselectedAncestors(nodes: TreeNode[]): Set<string> {
  const open = new Set<string>();

  function walk(node: TreeNode, ancestors: string[]): void {
    if (node.kind === "file") {
      if (node.preselected && !node.alreadyManaged) {
        for (const ancestor of ancestors) open.add(ancestor);
      }
      return;
    }
    const deeper = [...ancestors, node.relativePath];
    for (const child of node.children) walk(child, deeper);
  }

  for (const node of nodes) walk(node, []);
  return open;
}

export function treeFromPaths(paths: string[]): TreeNode[] {
  const roots: TreeNode[] = [];

  for (const path of [...paths].sort()) {
    const segments = path.split("/");
    let siblings = roots;

    segments.forEach((segment, index) => {
      const here = segments.slice(0, index + 1).join("/");
      const leaf = index === segments.length - 1;

      if (leaf) {
        siblings.push({
          kind: "file",
          name: segment,
          relativePath: here,
          confidence: null,
          reason: null,
          preselected: false,
          alreadyManaged: false,
        });
        return;
      }

      let directory = siblings.find(
        (node): node is Extract<TreeNode, { kind: "directory" }> =>
          node.kind === "directory" && node.relativePath === here,
      );
      if (!directory) {
        directory = {
          kind: "directory",
          name: segment,
          relativePath: here,
          walked: true,
          children: [],
        };
        siblings.push(directory);
      }
      siblings = directory.children;
    });
  }

  return roots;
}

export function everyDirectory(nodes: TreeNode[]): Set<string> {
  const all = new Set<string>();

  function walk(node: TreeNode): void {
    if (node.kind !== "directory") return;
    all.add(node.relativePath);
    for (const child of node.children) walk(child);
  }

  for (const node of nodes) walk(node);
  return all;
}

type Coverage = "none" | "some" | "all";

function coverage(node: TreeNode, selected: ReadonlySet<string>): Coverage {
  const candidates = candidatePathsUnder(node);
  if (candidates.length === 0) return "none";
  const picked = candidates.filter((path) => selected.has(path)).length;
  if (picked === 0) return "none";
  return picked === candidates.length ? "all" : "some";
}

export function FileTree({
  nodes,
  selected,
  expanded,
  disabled,
  onToggleSelect,
  onToggleSelectMany,
  onToggleExpand,
  label,
}: Props) {
  const [focused, setFocused] = useState<string | null>(
    nodes[0]?.relativePath ?? null,
  );

  const visible = useMemo(() => {
    const rows: TreeNode[] = [];
    function walk(list: TreeNode[]): void {
      for (const node of list) {
        rows.push(node);
        if (
          node.kind === "directory" &&
          node.walked &&
          expanded.has(node.relativePath)
        ) {
          walk(node.children);
        }
      }
    }
    walk(nodes);
    return rows;
  }, [nodes, expanded]);

  const move = useCallback(
    (from: string, direction: 1 | -1) => {
      const index = visible.findIndex((node) => node.relativePath === from);
      const next = visible[index + direction];
      if (next) setFocused(next.relativePath);
    },
    [visible],
  );

  return (
    <ul className="tree" role="tree" aria-multiselectable="true" aria-label={label}>
      {nodes.map((node) => (
        <Row
          key={node.relativePath}
          node={node}
          depth={0}
          selected={selected}
          expanded={expanded}
          disabled={disabled}
          focused={focused}
          setFocused={setFocused}
          move={move}
          onToggleSelect={onToggleSelect}
          onToggleSelectMany={onToggleSelectMany}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </ul>
  );
}

interface RowProps {
  node: TreeNode;
  depth: number;
  selected: ReadonlySet<string>;
  expanded: ReadonlySet<string>;
  disabled?: ReadonlySet<string>;
  focused: string | null;
  setFocused: (path: string) => void;
  move: (from: string, direction: 1 | -1) => void;
  onToggleSelect: (path: string) => void;
  onToggleSelectMany: (paths: string[], on: boolean) => void;
  onToggleExpand: (path: string) => void;
}

function Row({
  node,
  depth,
  selected,
  expanded,
  disabled,
  focused,
  setFocused,
  move,
  onToggleSelect,
  onToggleSelectMany,
  onToggleExpand,
}: RowProps) {
  const path = node.relativePath;
  const isDirectory = node.kind === "directory";
  const openable = isDirectory && node.walked;
  const isExpanded = openable && expanded.has(path);
  const state = isDirectory ? coverage(node, selected) : null;
  const isDisabled =
    node.kind === "file" ? node.alreadyManaged || (disabled?.has(path) ?? false) : false;

  const checked = isDirectory ? state === "all" : selected.has(path);
  const mixed = isDirectory && state === "some";

  function toggle() {
    if (isDisabled) return;
    if (isDirectory) {
      const candidates = candidatePathsUnder(node).filter(
        (candidate) => !(disabled?.has(candidate) ?? false),
      );
      if (candidates.length > 0) onToggleSelectMany(candidates, state !== "all");
      return;
    }
    onToggleSelect(path);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(path, event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (openable && !isExpanded) onToggleExpand(path);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (openable && isExpanded) onToggleExpand(path);
    } else if (event.key === " ") {
      event.preventDefault();
      toggle();
    }
  }

  const selectable = isDirectory
    ? candidatePathsUnder(node).length > 0
    : true;

  return (
    <li role="none" className="tree__item">
      <div
        role="treeitem"
        tabIndex={focused === path ? 0 : -1}
        aria-checked={selectable ? (mixed ? "mixed" : checked) : undefined}
        aria-expanded={openable ? isExpanded : undefined}
        aria-disabled={isDisabled || undefined}
        aria-label={node.name}
        className="tree__row"
        data-kind={node.kind}
        data-quiet={node.kind === "file" && node.confidence === null}
        data-unwalked={isDirectory && !node.walked}
        style={{ paddingLeft: `${depth * 1.1 + 0.3}rem` }}
        onFocus={() => setFocused(path)}
        onKeyDown={onKeyDown}
        onClick={toggle}
      >
        {openable ? (
          <button
            type="button"
            className="tree__twisty"
            tabIndex={-1}
            aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpand(path);
            }}
          >
            <Icon name={isExpanded ? "chevron-down" : "chevron-right"} />
          </button>
        ) : (
          <span className="tree__twisty tree__twisty--none" aria-hidden="true" />
        )}

        {selectable ? (
          <input
            type="checkbox"
            className="tree__check"
            tabIndex={-1}
            aria-hidden="true"
            checked={checked}
            disabled={isDisabled}
            ref={(box) => {
              if (box) box.indeterminate = mixed;
            }}
            onChange={toggle}
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          <span className="tree__check tree__check--none" aria-hidden="true" />
        )}

        <span className="tree__name">{node.name}</span>

        {node.kind === "file" && node.reason ? (
          <span className="tree__reason">{node.reason}</span>
        ) : null}
        {node.kind === "file" && node.alreadyManaged ? (
          <span className="tree__note">already managed</span>
        ) : null}
        {isDirectory && !node.walked ? (
          <span className="tree__note">not looked in</span>
        ) : null}
      </div>

      {isExpanded ? (
        <ul role="group" className="tree__group">
          {node.children.map((child) => (
            <Row
              key={child.relativePath}
              node={child}
              depth={depth + 1}
              selected={selected}
              expanded={expanded}
              disabled={disabled}
              focused={focused}
              setFocused={setFocused}
              move={move}
              onToggleSelect={onToggleSelect}
              onToggleSelectMany={onToggleSelectMany}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
