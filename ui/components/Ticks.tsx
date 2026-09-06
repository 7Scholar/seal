import type { FileView } from "../ipc";
import { conditionOf, ticksFor } from "../state";

interface Props {
  files: FileView[];
}

function summarise(files: FileView[]): string {
  const counts = { broken: 0, sealed: 0, open: 0, gone: 0, unknown: 0 };
  for (const file of files) counts[conditionOf(file)] += 1;
  const parts: string[] = [];
  if (counts.broken > 0) parts.push(`${counts.broken} with a broken seal`);
  if (counts.sealed > 0) parts.push(`${counts.sealed} sealed`);
  if (counts.open > 0) parts.push(`${counts.open} not sealed`);
  if (counts.gone > 0) parts.push(`${counts.gone} gone from disk`);
  if (counts.unknown > 0) parts.push(`${counts.unknown} unknown`);
  const total = files.length === 1 ? "1 managed file" : `${files.length} managed files`;
  return parts.length === 0 ? total : `${total}: ${parts.join(", ")}`;
}

export function Ticks({ files }: Props) {
  const { shown, remainder } = ticksFor(files);

  return (
    <span className="ticks" role="img" aria-label={summarise(files)}>
      {shown.map((condition, index) => (
        <span key={index} className="ticks__tick" data-condition={condition} />
      ))}
      {remainder > 0 ? <span className="ticks__more">+{remainder}</span> : null}
    </span>
  );
}
