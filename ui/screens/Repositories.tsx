import { useState } from "react";
import { Overflow } from "../components/Overflow";
import { Icon } from "../components/Icon";
import type { RepoView } from "../ipc";

export type Load = "loading" | "ready" | "failed";

interface Props {
  repos: RepoView[];
  load: Load;
  onRetry: () => void;
  onOpen: (root: string) => void;
  onAdd: () => void;
  onRescan: (root: string) => void;
  onReleaseRepo: (repo: RepoView) => void;
}

function AddTile({ onAdd }: { onAdd: () => void }) {
  return (
    <li className="tile tile--add">
      <button type="button" className="tile__button tile__add" onClick={onAdd}>
        <Icon name="plus" className="tile__add-icon" />
        <span className="tile__name">Add repository</span>
      </button>
    </li>
  );
}

export function Repositories({
  repos,
  load,
  onRetry,
  onOpen,
  onAdd,
  onRescan,
  onReleaseRepo,
}: Props) {
  const [filter, setFilter] = useState("");

  const needle = filter.trim().toLowerCase();
  const matches = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(needle) ||
      repo.root.toLowerCase().includes(needle),
  );

  const count =
    load !== "ready" || repos.length === 0
      ? null
      : repos.length === 1
        ? "1 repository"
        : `${repos.length} repositories`;

  return (
    <section className="surface">
      <header className="surface__head">
        <h1>Repositories</h1>
        {count ? <span className="surface__count">{count}</span> : null}
      </header>

      <div className="toolbar">
        <span className="toolbar__search">
          <Icon name="search" className="toolbar__search-icon" />
          <input
            type="search"
            aria-label="Search repositories"
            placeholder="Search for a repository"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={load !== "ready" || repos.length === 0}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </span>
        <span className="toolbar__spacer" />
        <button
          type="button"
          className="button--primary"
          disabled={load === "loading"}
          onClick={onAdd}
        >
          <Icon name="plus" />
          Add repository
        </button>
      </div>

      {load === "loading" ? (
        <ul className="grid" aria-busy="true" aria-label="Loading repositories">
          {[0, 1, 2].map((slot) => (
            <li key={slot} className="tile tile--placeholder" aria-hidden="true">
              <span className="tile__button tile__skeleton">
                <span className="skeleton skeleton--name" />
                <span className="skeleton skeleton--path" />
                <span className="skeleton skeleton--count" />
              </span>
            </li>
          ))}
        </ul>
      ) : load === "failed" ? (
        <div className="grid">
          <div className="tile tile--wide">
            <div className="tile__button tile__failed" role="alert">
              <span className="tile__name">Seal could not read what it manages</span>
              <span className="tile__failed-note">
                Your repositories are untouched and still sealed.
              </span>
              <button type="button" onClick={onRetry}>
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : matches.length === 0 && needle !== "" ? (
        <ul className="grid">
          <li className="tile tile--wide">
            <p className="tile__nomatch">
              No repository matches “{filter}”.{" "}
              <button type="button" onClick={() => setFilter("")}>
                Clear the search
              </button>
            </p>
          </li>
        </ul>
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
                  <span className="tile__name" title={repo.name}>
                    {repo.name}
                  </span>
                  <span className="tile__path" title={repo.root}>
                    {repo.root}
                  </span>
                  <span className="tile__foot">
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
          <AddTile onAdd={onAdd} />
        </ul>
      )}
    </section>
  );
}
