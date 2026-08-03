import { useEffect, useMemo, useRef, useState } from "react";
import type { ScanView } from "../ipc";
import {
  FileTree,
  managedPaths,
  preselectedAncestors,
  preselectedPaths,
} from "../components/FileTree";
import { Toggletip } from "../components/Toggletip";
import { fileName } from "../format";

interface Props {
  scan: ScanView;
  onConfirm: (selected: string[]) => void | Promise<void>;
  onCancel: () => void;
}

function countRows(nodes: ScanView["tree"]): number {
  let total = 0;
  for (const node of nodes) {
    total += 1;
    if (node.kind === "directory") total += countRows(node.children);
  }
  return total;
}

export function ManageFlow({ scan, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() =>
    preselectedPaths(scan.tree),
  );
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() =>
    preselectedAncestors(scan.tree),
  );
  const [scrolled, setScrolled] = useState(false);
  const [atEnd, setAtEnd] = useState(true);
  const region = useRef<HTMLDivElement>(null);

  const managed = useMemo(() => managedPaths(scan.tree), [scan.tree]);
  const rows = useMemo(() => countRows(scan.tree), [scan.tree]);

  useEffect(() => {
    const element = region.current;
    if (!element) return;
    function measure() {
      if (!element) return;
      setScrolled(element.scrollTop > 0);
      setAtEnd(
        element.scrollTop + element.clientHeight >= element.scrollHeight - 1,
      );
    }
    measure();
    element.addEventListener("scroll", measure);
    return () => element.removeEventListener("scroll", measure);
  }, [scan.tree]);

  function toggleSelect(path: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function toggleSelectMany(paths: string[], on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const path of paths) {
        if (on) next.add(path);
        else next.delete(path);
      }
      return next;
    });
  }

  function toggleExpand(path: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  const nothingFound = scan.candidates.length === 0;

  return (
    <section
      className="manage"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-heading"
      onKeyDown={onKeyDown}
    >
      <header className="manage__head" data-scrolled={scrolled || undefined}>
        <h1 id="manage-heading">Seal in {fileName(scan.root)}</h1>
        <Toggletip label="What managing these files does">
          Seal records which files it manages here. It does not encrypt
          anything — sealing stays a separate, deliberate action. Your files
          stay where they are: nothing is moved, renamed, or copied.
          {scan.alreadyRegistered
            ? " This folder is already managed; nothing already managed is changed."
            : ""}
        </Toggletip>
        <span className="manage__count">
          {rows === 1 ? "1 item" : `${rows} items`}
        </span>
        <p className="manage__root">{scan.root}</p>
      </header>

      <div className="manage__region" ref={region}>
        <FileTree
          label={`Files in ${scan.root}`}
          nodes={scan.tree}
          selected={selected}
          expanded={expanded}
          disabled={managed}
          onToggleSelect={toggleSelect}
          onToggleSelectMany={toggleSelectMany}
          onToggleExpand={toggleExpand}
        />
      </div>

      <footer
        className="manage__actions"
        data-scrolled={!atEnd || undefined}
      >
        <span className="manage__tally">
          {nothingFound
            ? "Nothing recognised"
            : selected.size === 1
              ? "1 file selected"
              : `${selected.size} files selected`}
        </span>
        <span className="manage__spacer" />
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="button--primary"
          disabled={selected.size === 0}
          onClick={() => onConfirm([...selected])}
        >
          {selected.size === 1
            ? "Manage 1 file"
            : `Manage ${selected.size} files`}
        </button>
      </footer>
    </section>
  );
}
