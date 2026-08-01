import { useMemo, useState } from "react";
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

export function ManageFlow({ scan, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() =>
    preselectedPaths(scan.tree),
  );
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() =>
    preselectedAncestors(scan.tree),
  );

  const managed = useMemo(() => managedPaths(scan.tree), [scan.tree]);

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

  const nothingFound = scan.candidates.length === 0;

  return (
    <section className="manage">
      <header className="manage__head">
        <h1>Seal in {fileName(scan.root)}</h1>
        <Toggletip label="What managing these files does">
          Seal records which files it manages here. It does not encrypt
          anything — sealing stays a separate, deliberate action. Your files
          stay where they are: nothing is moved, renamed, or copied.
          {scan.alreadyRegistered
            ? " This folder is already managed; nothing already managed is changed."
            : ""}
        </Toggletip>
        <p className="manage__root">{scan.root}</p>
      </header>

      {nothingFound ? (
        <p className="manage__empty">Nothing recognised — choose any file.</p>
      ) : null}

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

      <footer className="manage__actions">
        <span className="manage__spacer" />
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
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
