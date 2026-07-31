import type { RepoView, SealedState } from "../ipc";

export type Selection =
  | { kind: "none" }
  | { kind: "repo"; root: string }
  | { kind: "file"; root: string; path: string };

interface Props {
  repos: RepoView[];
  selection: Selection;
  expanded: ReadonlySet<string>;
  onToggleExpand: (root: string) => void;
  onSelect: (selection: Selection) => void;
  onImport: () => void;
}

const STATE_LABELS: Record<SealedState, string> = {
  sealed: "Sealed",
  plaintext: "Readable",
  missing: "Not found",
  unknown: "Unknown",
};

export function exposureCount(repo: RepoView): number {
  return repo.files.filter((file) => file.alert).length;
}

export function filePath(repo: RepoView, relativePath: string): string {
  return `${repo.root}/${relativePath}`;
}

export function Sidebar({
  repos,
  selection,
  expanded,
  onToggleExpand,
  onSelect,
  onImport,
}: Props) {
  function moveFocus(from: HTMLElement, direction: 1 | -1) {
    const tree = from.closest(".sidebar__tree");
    if (!tree) return;
    const items = Array.from(
      tree.querySelectorAll<HTMLElement>("[role='treeitem']"),
    );
    const next = items[items.indexOf(from) + direction];
    next?.focus();
  }

  function onRepoKeyDown(
    event: React.KeyboardEvent<HTMLElement>,
    repo: RepoView,
    isExpanded: boolean,
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (!isExpanded) onToggleExpand(repo.root);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (isExpanded) onToggleExpand(repo.root);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(event.currentTarget, event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect({ kind: "repo", root: repo.root });
    }
  }

  function onFileKeyDown(
    event: React.KeyboardEvent<HTMLElement>,
    repo: RepoView,
    path: string,
  ) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(event.currentTarget, event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect({ kind: "file", root: repo.root, path });
    }
  }

  return (
    <nav className="sidebar" aria-label="Repositories">
      <div className="sidebar__head">
        <h2 className="sidebar__title">Repositories</h2>
        <button type="button" className="sidebar__import" onClick={onImport}>
          Import
        </button>
      </div>

      {repos.length === 0 ? (
        <p className="sidebar__empty">Nothing imported yet.</p>
      ) : (
        <ul className="sidebar__tree" role="tree" aria-label="Repositories">
          {repos.map((repo) => {
            const isExpanded = expanded.has(repo.root);
            const exposed = exposureCount(repo);
            const isSelected =
              selection.kind === "repo" && selection.root === repo.root;

            return (
              <li
                key={repo.root}
                role="none"
                className="sidebar__repo"
                data-exposed={exposed > 0}
              >
                <div className="sidebar__repo-row">
                  <button
                    type="button"
                    className="sidebar__twisty"
                    tabIndex={-1}
                    aria-label={
                      isExpanded
                        ? `Collapse ${repo.name}`
                        : `Expand ${repo.name}`
                    }
                    onClick={() => onToggleExpand(repo.root)}
                  >
                    <span aria-hidden="true">{isExpanded ? "▾" : "▸"}</span>
                  </button>

                  <div
                    role="treeitem"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-selected={isSelected}
                    className="sidebar__repo-name"
                    onClick={() => onSelect({ kind: "repo", root: repo.root })}
                    onKeyDown={(event) => onRepoKeyDown(event, repo, isExpanded)}
                  >
                    <span className="sidebar__name">{repo.name}</span>
                    {exposed > 0 ? (
                      <span className="sidebar__exposed">
                        {exposed} exposed
                      </span>
                    ) : null}
                  </div>
                </div>

                {isExpanded ? (
                  <ul role="group" className="sidebar__files">
                    {repo.files.map((file) => {
                      const path = filePath(repo, file.relativePath);
                      const fileSelected =
                        selection.kind === "file" && selection.path === path;
                      return (
                        <li key={path} role="none">
                          <div
                            role="treeitem"
                            tabIndex={0}
                            aria-selected={fileSelected}
                            className="sidebar__file"
                            data-alert={file.alert}
                            onClick={() =>
                              onSelect({ kind: "file", root: repo.root, path })
                            }
                            onKeyDown={(event) =>
                              onFileKeyDown(event, repo, path)
                            }
                          >
                            <span className="sidebar__file-path">
                              {file.relativePath}
                            </span>
                            <span
                              className="sidebar__file-state"
                              data-state={file.state}
                            >
                              {file.alert ? "Exposed" : STATE_LABELS[file.state]}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
