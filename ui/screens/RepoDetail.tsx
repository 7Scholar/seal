import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Toggletip } from "../components/Toggletip";
import { Overflow } from "../components/Overflow";
import { BrokenSeal } from "../components/BrokenSeal";
import { Icon } from "../components/Icon";
import type { RepoView, SealOutcome } from "../ipc";
import type { Load } from "./Repositories";
import { reason } from "../errors";
import { fileName } from "../format";
import { conditionOf, sealable } from "../state";
import { buildTree, filterTree, folderPaths, type TreeNode } from "../managedTree";

interface Props {
  repo: RepoView;
  load: Load;
  onRetry: () => void;
  onOpen: (path: string) => void;
  onSeal: (path: string) => void | Promise<void>;
  onRelease: (path: string) => void;
  onReleaseRepo: () => void;
  onRescan: () => void;
  onSealAll: () => void;
  onUnseal: (path: string) => void;
  outcomes: Outcomes | null;
  onDismissOutcomes: () => void;
}

export interface Outcomes {
  did: "seal" | "unseal";
  results: SealOutcome[];
}

export function StaleNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="stale" role="alert">
      <span className="stale__text">
        Seal could not re-read this repository, so what is below is what it last
        saw. Your files are untouched and still sealed.
      </span>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function filePath(repo: RepoView, relativePath: string) {
  return `${repo.root}/${relativePath}`;
}

const INDENT_BASE = 14;
const INDENT_STEP = 20;

export function RepoDetail({
  repo,
  load,
  onRetry,
  onOpen,
  onSeal,
  onRelease,
  onReleaseRepo,
  onRescan,
  onSealAll,
  onUnseal,
  outcomes,
  onDismissOutcomes,
}: Props) {
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    setFilter("");
    setCollapsed(new Set());
  }, [repo.root]);

  const tree = useMemo(() => buildTree(repo.files), [repo.files]);
  const shown = useMemo(() => filterTree(tree, filter), [tree, filter]);
  const revealed = useMemo(
    () => new Set(filter.trim() === "" ? [] : folderPaths(shown)),
    [shown, filter],
  );

  const isOpen = (path: string) => revealed.has(path) || !collapsed.has(path);

  function toggleFolder(path: string) {
    setCollapsed((was) => {
      const next = new Set(was);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function rows(nodes: TreeNode[], depth: number): ReactNode[] {
    return nodes.flatMap((node) => {
      const indent = INDENT_BASE + INDENT_STEP * (depth - 1);

      if (node.kind === "folder") {
        const open = isOpen(node.path);
        return [
          <li key={`d:${node.path}`} className="line line--folder">
            <span className="line__bar" />
            <span className="line__indent" style={{ width: indent }} />
            <button
              type="button"
              className="line__twisty"
              aria-expanded={open}
              aria-label={`${open ? "Collapse" : "Expand"} ${node.path}`}
              onClick={() => toggleFolder(node.path)}
            >
              <Icon name={open ? "chevron-down" : "chevron-right"} />
            </button>
            <span className="line__name">{node.name}</span>
          </li>,
          ...(open ? rows(node.children, depth + 1) : []),
        ];
      }

      const file = node.file;
      const path = filePath(repo, file.relativePath);
      const condition = conditionOf(file);
      const gone = condition === "gone";

      return [
        <li key={`f:${path}`} className="line" data-condition={condition}>
          <span className="line__bar" />
          <span className="line__indent" style={{ width: indent }} />
          <span className="line__twisty line__twisty--none" />

          <button
            type="button"
            className="line__open"
            aria-label={`Open ${file.relativePath}`}
            disabled={gone}
            aria-describedby={gone ? `why-${path}` : undefined}
            onClick={() => onOpen(path)}
          >
            {node.name}
          </button>

          {gone ? (
            <span className="line__why" id={`why-${path}`}>
              Seal cannot open it — it is no longer at this path.
            </span>
          ) : null}

          <span className="line__actions">
            {condition === "broken" ? (
              <BrokenSeal label={`Why ${file.relativePath} is marked`} />
            ) : null}

            {condition === "broken" || condition === "open" ? (
              <button
                type="button"
                className="line__seal"
                aria-label={`Seal ${file.relativePath}`}
                onClick={() => void onSeal(path)}
              >
                <Icon name="lock" />
                Seal
              </button>
            ) : null}
          </span>

          <span className="line__menu">
            <Overflow label={`More actions for ${file.relativePath}`}>
              {condition === "sealed" ? (
                <button
                  type="button"
                  aria-label={`Unseal ${file.relativePath}`}
                  onClick={() => onUnseal(path)}
                >
                  Unseal
                </button>
              ) : null}
              <button
                type="button"
                className="overflow__danger"
                onClick={() => onRelease(path)}
              >
                Stop managing this file
              </button>
            </Overflow>
          </span>
        </li>,
      ];
    });
  }

  return (
    <section className="surface" data-surface="repository">
      {load === "failed" ? <StaleNotice onRetry={onRetry} /> : null}

      {outcomes ? (
        <div className="outcomes" role="status">
          <p>
            {outcomes.results.filter((result) => result.ok).length} of{" "}
            {outcomes.results.length}{" "}
            {outcomes.results.length === 1 ? "file is" : "files are"} now{" "}
            {outcomes.did === "seal" ? "sealed" : "readable"}.
          </p>
          {outcomes.results.some((result) => !result.ok) ? (
            <ul className="outcomes__failures">
              {outcomes.results
                .filter((result) => !result.ok)
                .map((result) => (
                  <li key={result.path}>
                    <span className="outcomes__path">{fileName(result.path)}</span>
                    <span className="outcomes__reason">
                      {result.reason ? reason(result.reason) : "did not change"}
                    </span>
                  </li>
                ))}
            </ul>
          ) : null}
          <button type="button" onClick={onDismissOutcomes}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="toolbar toolbar--repo">
        <p className="toolbar__path">{repo.root}</p>

        <Toggletip label="What Seal does with these files" place="left">
          Seal <strong>watches</strong> every file listed here, and{" "}
          <strong>protects</strong> the ones you have sealed. Watching only means
          Seal knows about the file — its contents are still readable by anything
          on this machine. Sealing is what makes it unreadable.
        </Toggletip>

        <span className="toolbar__search toolbar__search--narrow">
          <Icon name="search" className="toolbar__search-icon" />
          <input
            type="search"
            aria-label="Search files"
            placeholder="filter"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </span>

        <button type="button" onClick={onRescan}>
          <Icon name="plus" />
          Add files
        </button>

        <Overflow label={`More actions for ${repo.name}`}>
          {sealable(repo.files).length > 0 ? (
            <button type="button" onClick={onSealAll}>
              Seal every file
            </button>
          ) : null}
          <button type="button" onClick={onRescan}>
            Scan for more files
          </button>
          <button type="button" className="overflow__danger" onClick={onReleaseRepo}>
            Stop managing this repository
          </button>
        </Overflow>
      </div>

      {shown.length === 0 ? (
        <div className="nomatch">
          <span className="nomatch__lead">No file matches</span>
          <span className="nomatch__needle">{filter}</span>
          <span className="nomatch__spacer" />
          <button type="button" onClick={() => setFilter("")}>
            Clear
          </button>
        </div>
      ) : (
        <ul className="lines">{rows(shown, 1)}</ul>
      )}
    </section>
  );
}
