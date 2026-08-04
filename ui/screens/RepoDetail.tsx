import { useEffect, useState } from "react";
import { ExposureAlert } from "../components/ExposureAlert";
import { Toggletip } from "../components/Toggletip";
import { Overflow } from "../components/Overflow";
import type { RepoView, SealedState, SealOutcome } from "../ipc";
import type { Load } from "./Repositories";
import { reason } from "../errors";
import { fileName } from "../format";

interface Props {
  repo: RepoView;
  load: Load;
  onRetry: () => void;
  onOpen: (path: string) => void;
  onSeal: (path: string) => void | Promise<void>;
  onSealMany: (paths: string[]) => void | Promise<void>;
  onRelease: (path: string) => void;
  onReleaseRepo: () => void;
  onRescan: () => void;
  outcomes: SealOutcome[] | null;
  onDismissOutcomes: () => void;
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

const LABELS: Record<SealedState, string> = {
  sealed: "Sealed",
  plaintext: "Readable",
  missing: "Not found",
  unknown: "Unknown",
};

export function filePath(repo: RepoView, relativePath: string) {
  return `${repo.root}/${relativePath}`;
}

function directoryOf(relativePath: string) {
  const cut = relativePath.lastIndexOf("/");
  return cut === -1 ? "" : relativePath.slice(0, cut);
}

export function RepoDetail({
  repo,
  load,
  onRetry,
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

  const files = [...repo.files].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath),
  );

  const sealable = files.filter(
    (file) => file.state !== "sealed" && file.state !== "missing",
  );
  const sealablePaths = sealable.map((file) => filePath(repo, file.relativePath));
  const chosen = sealablePaths.filter((path) => picked.has(path));

  const exposures = files
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

  const count =
    files.length === 0
      ? null
      : files.length === 1
        ? "1 managed file"
        : `${files.length} managed files`;

  return (
    <section className="surface">
      <header className="repo-head">
        <div className="repo-head__text">
          <p className="repo-head__path">{repo.root}</p>
        </div>

        {count ? <span className="surface__count">{count}</span> : null}

        <Toggletip label="What Seal does with these files">
          Seal <strong>watches</strong> every file listed here, and{" "}
          <strong>protects</strong> the ones you have sealed. Watching only means
          Seal knows about the file — its contents are still readable by anything
          on this machine. Sealing is what makes it unreadable.
        </Toggletip>

        <Overflow label={`More actions for ${repo.name}`}>
          <button type="button" onClick={onRescan}>
            Scan for more files
          </button>
          <button type="button" className="overflow__danger" onClick={onReleaseRepo}>
            Stop managing this repository
          </button>
        </Overflow>
      </header>

      {load === "failed" ? <StaleNotice onRetry={onRetry} /> : null}

      <ExposureAlert exposures={exposures} onSeal={onSeal} />

      {outcomes ? (
        <div className="outcomes" role="status">
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
            <ul className="outcomes__failures">
              {failures.map((failure) => (
                <li key={failure.path}>
                  <span className="outcomes__path">{fileName(failure.path)}</span>
                  <span className="outcomes__reason">{reason(failure.reason)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <button type="button" onClick={onDismissOutcomes}>
            Done
          </button>
        </div>
      ) : null}

      {sealable.length > 0 ? (
        <div className="batch">
          <span className="batch__count">
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

      <ul className="rows">
        {files.map((file) => {
          const path = filePath(repo, file.relativePath);
          const canSeal = file.state !== "sealed" && file.state !== "missing";
          const directory = directoryOf(file.relativePath);

          const missing = file.state === "missing";
          const whyId = missing ? `why-${path}` : undefined;

          return (
            <li key={path} className="row" data-alert={file.alert}>
              {canSeal ? (
                <input
                  type="checkbox"
                  className="row__check"
                  checked={picked.has(path)}
                  aria-label={`Select ${file.relativePath}`}
                  onChange={() => toggle(path)}
                />
              ) : null}

              <button
                type="button"
                className="row__open"
                aria-label={`Open ${file.relativePath}`}
                disabled={missing}
                aria-describedby={whyId}
                onClick={() => onOpen(path)}
              >
                <span className="row__name">{fileName(file.relativePath)}</span>
                {directory ? (
                  <span className="row__path">{directory}/</span>
                ) : null}
                {missing ? (
                  <span className="row__why" id={whyId}>
                    Seal cannot open it — it is no longer at this path.
                  </span>
                ) : null}
              </button>

              <span className="row__state" data-state={file.state}>
                {file.alert ? "Readable — should be sealed" : LABELS[file.state]}
              </span>

              <span className="row__actions">
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
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
