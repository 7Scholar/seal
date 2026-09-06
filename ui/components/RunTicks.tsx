import type { ManifestEntry } from "../ipc";

interface Props {
  entries: ManifestEntry[];
}

function summarise(entries: ManifestEntry[]): string {
  const converted = entries.filter((entry) => entry.standing === "converted").length;
  const failed = entries.filter((entry) => entry.standing === "failed").length;
  const total = entries.length;
  const head = `${converted} of ${total} ${total === 1 ? "file is" : "files are"} on the new password`;
  return failed === 0 ? head : `${head}, ${failed} failed`;
}

export function RunTicks({ entries }: Props) {
  return (
    <span className="run-ticks" role="img" aria-label={summarise(entries)}>
      {entries.map((entry) => (
        <span
          key={entry.path}
          className="run-ticks__tick"
          data-standing={entry.standing}
        />
      ))}
    </span>
  );
}
