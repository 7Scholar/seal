import { useState } from "react";
import { Overflow } from "../components/Overflow";
import { Icon } from "../components/Icon";
import { Ticks } from "../components/Ticks";
import { BrokenSeal } from "../components/BrokenSeal";
import { sealable } from "../state";
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
  onSealRepo: (repo: RepoView) => void;
  onSealAll: (repo: RepoView) => void;
}

function LoadingRows() {
  return (
    <ul className="repos" aria-busy="true" aria-label="Loading repositories">
      {[0, 1, 2].map((slot) => (
        <li key={slot} className="repo-row repo-row--loading" aria-hidden="true">
          <span className="repo-row__text">
            <span className="skeleton skeleton--name" />
            <span className="skeleton skeleton--path" />
          </span>
          <span className="ticks">
            <span className="skeleton skeleton--tick" />
            <span className="skeleton skeleton--tick" />
            <span className="skeleton skeleton--tick" />
          </span>
          <span className="repo-row__actions" />
          <span className="repo-row__menu" />
        </li>
      ))}
    </ul>
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
  onSealRepo,
  onSealAll,
}: Props) {
  const [filter, setFilter] = useState("");

  const needle = filter.trim().toLowerCase();
  const matches = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(needle) ||
      repo.root.toLowerCase().includes(needle),
  );

  if (load === "failed") {
    return (
      <section className="surface" data-surface="repositories">
        <div className="surface__replaced" role="alert">
          <div className="surface__replaced-text">
            <p className="surface__replaced-title">
              Seal could not read what it manages
            </p>
            <p className="surface__replaced-note">
              Nothing on disk was touched. Every sealed file is still sealed.
            </p>
          </div>
          <button type="button" className="button--primary" onClick={onRetry}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (load === "ready" && repos.length === 0) {
    return (
      <section className="surface" data-surface="repositories">
        <div className="surface__nothing">
          <p className="surface__nothing-text">Nothing is under Seal yet.</p>
          <button type="button" className="button--primary" onClick={onAdd}>
            <Icon name="plus" />
            Add repository
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="surface" data-surface="repositories">
      <div className="toolbar">
        <span className="toolbar__search">
          <Icon name="search" className="toolbar__search-icon" />
          <input
            type="search"
            aria-label="Search repositories"
            placeholder="filter"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={load !== "ready"}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </span>
        <span className="toolbar__spacer" />
        <button type="button" disabled={load === "loading"} onClick={onAdd}>
          <Icon name="plus" />
          Add repository
        </button>
      </div>

      {load === "loading" ? (
        <LoadingRows />
      ) : matches.length === 0 ? (
        <div className="nomatch">
          <span className="nomatch__lead">No repository matches</span>
          <span className="nomatch__needle">{filter}</span>
          <span className="nomatch__spacer" />
          <button type="button" onClick={() => setFilter("")}>
            Clear
          </button>
        </div>
      ) : (
        <ul className="repos">
          {matches.map((repo) => {
            const broken = repo.files.filter((file) => file.alert);
            return (
              <li
                key={repo.root}
                className="repo-row"
                data-broken={broken.length > 0}
              >
                <span className="repo-row__text">
                  <button
                    type="button"
                    className="repo-row__open"
                    onClick={() => onOpen(repo.root)}
                  >
                    {repo.name}
                  </button>
                  <span className="repo-row__path" title={repo.root}>
                    {repo.root}
                  </span>
                </span>

                <Ticks files={repo.files} />

                <span className="repo-row__actions">
                  {broken.length > 0 ? (
                    <>
                      <BrokenSeal
                        label={`Why ${repo.name} is marked`}
                        count={broken.length}
                      />
                      <button type="button" onClick={() => onSealRepo(repo)}>
                        <Icon name="lock" />
                        Seal
                      </button>
                    </>
                  ) : null}
                </span>

                <span className="repo-row__menu">
                  <Overflow label={`More actions for ${repo.name}`}>
                    {sealable(repo.files).length > 0 ? (
                      <button type="button" onClick={() => onSealAll(repo)}>
                        Seal every file
                      </button>
                    ) : null}
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
