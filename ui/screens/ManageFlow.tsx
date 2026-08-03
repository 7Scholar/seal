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
  root: string;
  scan: ScanView | null;
  failure: string | null;
  onRetry: () => void;
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

export function ManageFlow({
  root,
  scan,
  failure,
  onRetry,
  onConfirm,
  onCancel,
}: Props) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [scrolled, setScrolled] = useState(false);
  const [atEnd, setAtEnd] = useState(true);
  const [waited, setWaited] = useState(false);
  const region = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scan) return;
    setSelected(preselectedPaths(scan.tree));
    setExpanded(preselectedAncestors(scan.tree));
  }, [scan]);

  useEffect(() => {
    if (scan || failure) return;
    const timer = setTimeout(() => setWaited(true), 250);
    return () => clearTimeout(timer);
  }, [scan, failure]);

  const managed = useMemo(
    () => (scan ? managedPaths(scan.tree) : new Set<string>()),
    [scan],
  );
  const rows = useMemo(() => (scan ? countRows(scan.tree) : 0), [scan]);

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
  }, [scan, failure]);

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

  const scanning = !scan && !failure;
  const nothingFound = scan !== null && scan.candidates.length === 0;

  return (
    <section
      className="manage"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-heading"
      onKeyDown={onKeyDown}
    >
      <header className="manage__head" data-scrolled={scrolled || undefined}>
        <h1 id="manage-heading">Seal in {fileName(root)}</h1>
        <Toggletip label="What managing these files does">
          Seal records which files it manages here. It does not encrypt
          anything — sealing stays a separate, deliberate action. Your files
          stay where they are: nothing is moved, renamed, or copied.
          {scan?.alreadyRegistered
            ? " This folder is already managed; nothing already managed is changed."
            : ""}
        </Toggletip>
        {scan ? (
          <span className="manage__count">
            {rows === 1 ? "1 item" : `${rows} items`}
          </span>
        ) : null}
        <p className="manage__root">{root}</p>
      </header>

      <div className="manage__region" ref={region} aria-busy={scanning || undefined}>
        {failure ? (
          <div className="manage__failure" role="alert">
            <p className="manage__failure-message">{failure}</p>
            <button type="button" onClick={onRetry}>
              Try again
            </button>
          </div>
        ) : scanning ? (
          waited ? (
            <p className="manage__scanning">Looking through {fileName(root)}…</p>
          ) : null
        ) : scan ? (
          <FileTree
            label={`Files in ${root}`}
            nodes={scan.tree}
            selected={selected}
            expanded={expanded}
            disabled={managed}
            onToggleSelect={toggleSelect}
            onToggleSelectMany={toggleSelectMany}
            onToggleExpand={toggleExpand}
          />
        ) : null}
      </div>

      <footer className="manage__actions" data-scrolled={!atEnd || undefined}>
        <span className="manage__tally">
          {scanning
            ? "Scanning"
            : failure
              ? ""
              : nothingFound && selected.size === 0
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
