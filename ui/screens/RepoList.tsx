import { ExposureAlert } from "../components/ExposureAlert";
import type { RepoView, SealedState } from "../ipc";

interface Props {
  repos: RepoView[];
  onImport: () => void;
  onOpen: (path: string) => void;
  onSeal: (path: string) => void | Promise<void>;
  onRelease: (path: string) => void;
  onLock: () => void;
}

const LABELS: Record<SealedState, string> = {
  sealed: "Sealed",
  plaintext: "Readable",
  missing: "Not found",
  unknown: "Unknown",
};

export function RepoList({
  repos,
  onImport,
  onOpen,
  onSeal,
  onRelease,
  onLock,
}: Props) {
  const exposures = repos.flatMap((repo) =>
    repo.files
      .filter((file) => file.alert)
      .map((file) => ({
        path: `${repo.root}/${file.relativePath}`,
        relativePath: file.relativePath,
        repoName: repo.name,
      })),
  );

  if (repos.length === 0) {
    return (
      <section className="repos repos--empty">
        <h1>Seal manages nothing yet</h1>
        <p>
          Point Seal at a repository and it will look for secret files you may
          want to protect. Nothing is encrypted until you choose to seal it.
        </p>
        <button type="button" onClick={onImport}>
          Import a folder
        </button>
      </section>
    );
  }

  return (
    <section className="repos">
      <header className="repos__header">
        <h1>Your repositories</h1>
        <button type="button" onClick={onImport}>
          Import a folder
        </button>
        <button type="button" onClick={onLock}>
          Lock Seal
        </button>
      </header>

      <ExposureAlert exposures={exposures} onSeal={onSeal} />

      {repos.map((repo) => (
        <article key={repo.root} className="repo">
          <h2>{repo.name}</h2>
          <p className="repo__root">{repo.root}</p>
          <ul>
            {repo.files.map((file) => {
              const path = `${repo.root}/${file.relativePath}`;
              return (
                <li key={path} className="repo__file" data-alert={file.alert}>
                  <span className="repo__path">{file.relativePath}</span>
                  <span className="repo__state" data-state={file.state}>
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
                  {file.state !== "sealed" && file.state !== "missing" ? (
                    <button
                      type="button"
                      aria-label={`Seal ${file.relativePath}`}
                      onClick={() => onSeal(path)}
                    >
                      Seal
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Stop managing ${file.relativePath}`}
                    onClick={() => onRelease(path)}
                  >
                    Stop managing
                  </button>
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </section>
  );
}
