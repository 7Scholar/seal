interface OpeningProps {
  relativePath: string;
}

export function FileOpening({ relativePath }: OpeningProps) {
  return (
    <section className="env-editor env-editor--bare" aria-busy="true">
      <header className="file-head">
        <div className="file-head__text">
          <p className="file-head__path">{relativePath}</p>
        </div>
        <span className="file-head__state">Opening…</span>
      </header>

      <div className="env-editor__region">
        <ul className="env-editor__rows" aria-label={`Opening ${relativePath}`}>
          {[0, 1, 2, 3, 4].map((slot) => (
            <li key={slot} className="env-editor__row" aria-hidden="true">
              <span className="skeleton skeleton--key" />
              <span className="skeleton skeleton--value" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

interface FailedProps {
  relativePath: string;
  why: string;
  onRetry: () => void;
  onBack: () => void;
}

export function FileFailed({ relativePath, why, onRetry, onBack }: FailedProps) {
  return (
    <section className="env-editor env-editor--bare">
      <header className="file-head">
        <div className="file-head__text">
          <p className="file-head__path">{relativePath}</p>
        </div>
      </header>

      <div className="env-editor__region">
        <div className="file-failed" role="alert">
          <p className="file-failed__title">Seal could not open this file</p>
          <p className="file-failed__why">{why}</p>
          <div className="file-failed__actions">
            <button type="button" className="button--primary" onClick={onRetry}>
              Try again
            </button>
            <button type="button" onClick={onBack}>
              Back to the repository
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
