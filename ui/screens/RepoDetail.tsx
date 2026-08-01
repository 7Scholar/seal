import { useEffect, useState } from "react";
import { ExposureAlert } from "../components/ExposureAlert";
import { Toggletip } from "../components/Toggletip";
import { Overflow } from "../components/Overflow";
import { filePath } from "./Sidebar";
import type { RepoView, SealedState, SealOutcome, TreeNode } from "../ipc";
import { treeFromPaths } from "../components/FileTree";
import { reason } from "../errors";
import { fileName } from "../format";

interface Props {
  repo: RepoView;
  onOpen: (path: string) => void;
  onSeal: (path: string) => void | Promise<void>;
  onSealMany: (paths: string[]) => void | Promise<void>;
  onRelease: (path: string) => void;
  onReleaseRepo: () => void;
  onRescan: () => void;
  outcomes: SealOutcome[] | null;
  onDismissOutcomes: () => void;
}

const LABELS: Record<SealedState, string> = {
  sealed: "Sealed",
  plaintext: "Readable",
  missing: "Not found",
  unknown: "Unknown",
};

export function RepoDetail({
  repo,
  onOpen,
  onSeal,
  onSealMany,
  onRelease,
  onReleaseRepo,
  onRescan,
  outcomes,
  onDismissOutcomes,
}: Props) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    setPicked(new Set());
  }, [repo.root]);

  const sealable = repo.files.filter(
    (file) => file.state !== "sealed" && file.state !== "missing",
  );
  const sealablePaths = sealable.map((file) => filePath(repo, file.relativePath));
  const chosen = sealablePaths.filter((path) => picked.has(path));

  const exposures = repo.files
    .filter((file) => file.alert)
    .map((file) => ({
      path: filePath(repo, file.relativePath),
      relativePath: file.relativePath,
      repoName: repo.name,
    }));

  function toggle(path: string) {
    setPicked((was) => {
      const next = new Set(was);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  const failures = outcomes?.filter((outcome) => !outcome.sealed) ?? [];
  const succeeded = outcomes?.filter((outcome) => outcome.sealed).length ?? 0;

  return (
    <section className="detail">
      <header className="detail__head">
        <div className="detail__heading">
          <h1>{repo.name}</h1>
          <Toggletip label="What Seal does with these files">
            Seal <strong>watches</strong> every file listed here, and{" "}
            <strong>protects</strong> the ones you have sealed. Watching only
            means Seal knows about the file — its contents are still readable by
            anything on this machine. Sealing is what makes it unreadable.
          </Toggletip>
        </div>
        <p className="detail__root">{repo.root}</p>

        <Overflow label={`More actions for ${repo.name}`}>
          <button type="button" onClick={onRescan}>
            Scan for more files
          </button>
          <button type="button" className="overflow__danger" onClick={onReleaseRepo}>
            Stop managing this repository
          </button>
        </Overflow>
      </header>

      <ExposureAlert exposures={exposures} onSeal={onSeal} />

      {outcomes ? (
        <div className="detail__outcomes" role="status">
          <p>
            {succeeded === 1
              ? "1 file is now sealed."
              : `${succeeded} files are now sealed.`}
            {failures.length > 0
              ? ` ${failures.length} could not be sealed and ${
                  failures.length === 1 ? "is" : "are"
                } still readable:`
              : ""}
          </p>
          {failures.length > 0 ? (
            <ul className="detail__failures">
              {failures.map((failure) => (
                <li key={failure.path}>
                  <span className="detail__path">{fileName(failure.path)}</span>
                  <span className="detail__reason">{reason(failure.reason)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <button type="button" onClick={onDismissOutcomes}>
            Done
          </button>
        </div>
      ) : null}

      {repo.files.length === 0 ? (
        <p className="detail__empty">No files managed here yet.</p>
      ) : (
        <>
          {sealable.length > 0 ? (
            <div className="detail__batch">
              <span className="detail__batch-count">
                {chosen.length === 0 ? "" : `${chosen.length} selected`}
              </span>
              <button
                type="button"
                disabled={chosen.length === 0}
                onClick={() => onSealMany(chosen)}
              >
                {chosen.length <= 1
                  ? "Seal selected file"
                  : `Seal ${chosen.length} selected files`}
              </button>
            </div>
          ) : null}

          <ManagedTree
            repo={repo}
            picked={picked}
            onToggle={toggle}
            onOpen={onOpen}
            onSeal={onSeal}
            onRelease={onRelease}
          />
        </>
      )}
    </section>
  );
}

interface TreeProps {
  repo: RepoView;
  picked: ReadonlySet<string>;
  onToggle: (path: string) => void;
  onOpen: (path: string) => void;
  onSeal: (path: string) => void | Promise<void>;
  onRelease: (path: string) => void;
}

function ManagedTree({ repo, picked, onToggle, onOpen, onSeal, onRelease }: TreeProps) {
  const nodes = treeFromPaths(repo.files.map((file) => file.relativePath));
  const byPath = new Map(repo.files.map((file) => [file.relativePath, file]));

  function rows(list: TreeNode[], depth: number): React.ReactNode {
    return list.map((node) => {
      if (node.kind === "directory") {
        return (
          <li key={node.relativePath} role="none">
            <div
              role="treeitem"
              aria-expanded
              aria-label={node.name}
              className="detail__dir"
              style={{ paddingLeft: `${depth * 1.1}rem` }}
            >
              <span aria-hidden="true">▾</span>
              <span className="detail__dir-name">{node.name}</span>
            </div>
            <ul role="group" className="detail__files">
              {rows(node.children, depth + 1)}
            </ul>
          </li>
        );
      }

      const file = byPath.get(node.relativePath);
      if (!file) return null;
      const path = filePath(repo, file.relativePath);
      const canSeal = file.state !== "sealed" && file.state !== "missing";

      return (
        <li key={path} role="none">
          <div
            role="treeitem"
            aria-label={file.relativePath}
            className="detail__file"
            data-alert={file.alert}
            style={{ paddingLeft: `${depth * 1.1}rem` }}
          >
            {canSeal ? (
              <input
                type="checkbox"
                checked={picked.has(path)}
                aria-label={`Select ${file.relativePath}`}
                onChange={() => onToggle(path)}
              />
            ) : (
              <span className="detail__no-checkbox" aria-hidden="true" />
            )}

            <span className="detail__path">{node.name}</span>
            <span className="detail__state" data-state={file.state}>
              {file.alert ? "Readable — should be sealed" : LABELS[file.state]}
            </span>

            <button
              type="button"
              aria-label={`Open ${file.relativePath}`}
              disabled={file.state === "missing"}
              onClick={() => onOpen(path)}
            >
              Open
            </button>

            {canSeal ? (
              <button
                type="button"
                aria-label={`Seal ${file.relativePath}`}
                onClick={() => onSeal(path)}
              >
                Seal
              </button>
            ) : null}

            <Overflow label={`More actions for ${file.relativePath}`}>
              <button
                type="button"
                className="overflow__danger"
                onClick={() => onRelease(path)}
              >
                Stop managing this file
              </button>
            </Overflow>
          </div>
        </li>
      );
    });
  }

  return (
    <ul className="detail__files" role="tree" aria-label={`Files Seal manages in ${repo.name}`}>
      {rows(nodes, 0)}
    </ul>
  );
}
