import { useState } from "react";
import { Overflow } from "../components/Overflow";
import type { RepoView } from "../ipc";

interface Props {
  repos: RepoView[];
  onOpen: (root: string) => void;
  onAdd: () => void;
  onRescan: (root: string) => void;
  onReleaseRepo: (repo: RepoView) => void;
}

export function Repositories({ repos, onOpen, onAdd, onRescan, onReleaseRepo }: Props) {
  const [filter, setFilter] = useState("");

  if (repos.length === 0) {
    return (
      <section className="surface">
        <div className="empty-state">
          <h1>Seal manages nothing yet</h1>
          <p>
            Point Seal at a repository and it will look for secret files you may
            want to protect. Nothing is encrypted until you choose to seal it.
          </p>
          <button type="button" className="button--primary" onClick={onAdd}>
            Add a folder
          </button>
        </div>
      </section>
    );
  }

  const needle = filter.trim().toLowerCase();
  const matches = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(needle) ||
      repo.root.toLowerCase().includes(needle),
  );

  return (
    <section className="surface">
      <header className="surface__head">
        <h1>Repositories</h1>
      </header>

      <div className="toolbar">
        <span className="toolbar__search">
          <input
            type="search"
            aria-label="Search repositories"
            placeholder="Search for a repository"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </span>
        <span className="toolbar__spacer" />
        <button type="button" className="button--primary" onClick={onAdd}>
          + Add repository
        </button>
      </div>

      {matches.length === 0 ? (
        <p className="grid__empty">
          No repository matches “{filter}”.{" "}
          <button type="button" onClick={() => setFilter("")}>
            Clear the search
          </button>
        </p>
      ) : (
        <ul className="grid">
          {matches.map((repo) => {
            const exposed = repo.files.filter((file) => file.alert).length;
            return (
              <li key={repo.root} className="tile">
                <button
                  type="button"
                  className="tile__button"
                  onClick={() => onOpen(repo.root)}
                >
                  <span className="tile__name">{repo.name}</span>
                  <span className="tile__path">{repo.root}</span>
                  {exposed > 0 ? (
                    <span className="tile__exposed">
                      {exposed === 1
                        ? "1 file readable — should be sealed"
                        : `${exposed} files readable — should be sealed`}
                    </span>
                  ) : null}
                  <span className="tile__count">
                    {repo.files.length === 1
                      ? "1 managed file"
                      : `${repo.files.length} managed files`}
                  </span>
                </button>

                <span className="tile__menu">
                  <Overflow label={`More actions for ${repo.name}`}>
                    <button type="button" onClick={() => onRescan(repo.root)}>
                      Scan for more files
                    </button>
                    <button
                      type="button"
                      className="overflow__danger"
                      onClick={() => onReleaseRepo(repo)}
                    >
                      Stop managing this repository
                    </button>
                  </Overflow>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
