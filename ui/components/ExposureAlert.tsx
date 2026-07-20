interface Exposure {
  path: string;
  relativePath: string;
  repoName: string;
}

interface Props {
  exposures: Exposure[];
  onSeal: (path: string) => void | Promise<void>;
}

export function ExposureAlert({ exposures, onSeal }: Props) {
  if (exposures.length === 0) {
    return null;
  }

  const count = exposures.length;

  return (
    <div className="exposure-alert" role="alert">
      <h2 className="exposure-alert__heading">
        {count === 1
          ? "1 file Seal recorded as sealed is readable on disk"
          : `${count} files Seal recorded as sealed are readable on disk`}
      </h2>
      <p className="exposure-alert__body">
        Their contents are in the clear right now. This usually means an editor
        had the file open when it was sealed and later saved over it. Sealing
        again fixes it. Rotate any credential that was exposed — sealing cannot
        undo an exposure that already happened.
      </p>
      <ul className="exposure-alert__list">
        {exposures.map((exposure) => (
          <li key={exposure.path} className="exposure-alert__item">
            <span className="exposure-alert__path">
              {exposure.repoName} / {exposure.relativePath}
            </span>
            <button type="button" onClick={() => onSeal(exposure.path)}>
              Seal now
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
