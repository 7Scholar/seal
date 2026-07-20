import { useState } from "react";
import type { CandidateView, ScanView } from "../ipc";

interface Props {
  scan: ScanView;
  onConfirm: (selected: string[]) => void | Promise<void>;
  onCancel: () => void;
}

const GROUPS = [
  {
    confidence: "secret" as const,
    heading: "Secret files",
    blurb: "These look like real secrets. They are selected for you.",
  },
  {
    confidence: "ambiguous" as const,
    heading: "Possibly secret",
    blurb: "These might hold secrets. Choose deliberately.",
  },
  {
    confidence: "template" as const,
    heading: "Templates and examples",
    blurb:
      "These are meant to be committed and readable. Managing them is rarely what you want.",
  },
];

export function ImportFlow({ scan, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        scan.candidates
          .filter((candidate) => candidate.preselected && !candidate.alreadyManaged)
          .map((candidate) => candidate.relativePath),
      ),
  );

  function toggle(path: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function setGroup(members: CandidateView[], on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const member of members) {
        if (member.alreadyManaged) continue;
        if (on) next.add(member.relativePath);
        else next.delete(member.relativePath);
      }
      return next;
    });
  }

  const groups = GROUPS.map((group) => ({
    ...group,
    members: scan.candidates.filter(
      (candidate) => candidate.confidence === group.confidence,
    ),
  })).filter((group) => group.members.length > 0);

  const nothingFound = scan.candidates.length === 0;

  return (
    <section className="import">
      <header>
        <h1>Import {scan.root}</h1>
        {scan.alreadyRegistered ? (
          <p role="note">
            This folder is already managed. Confirming adds the files you pick to
            it; nothing already managed is changed.
          </p>
        ) : null}
      </header>

      {nothingFound ? (
        <p className="import__empty">
          No candidate secret files were found in this folder. You can still add
          files later, or pick a different folder.
        </p>
      ) : null}

      {groups.map((group) => (
        <fieldset key={group.confidence} className="import__group">
          <legend>
            {group.heading} ({group.members.length})
          </legend>
          <p className="import__blurb">{group.blurb}</p>
          <div className="import__bulk">
            <button
              type="button"
              onClick={() => setGroup(group.members, true)}
              aria-label={`Select all in ${group.heading}`}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setGroup(group.members, false)}
              aria-label={`Select none in ${group.heading}`}
            >
              Select none
            </button>
          </div>
          <ul>
            {group.members.map((candidate) => (
              <li key={candidate.relativePath}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.has(candidate.relativePath)}
                    disabled={candidate.alreadyManaged}
                    onChange={() => toggle(candidate.relativePath)}
                  />
                  <span className="import__path">{candidate.relativePath}</span>
                  <span className="import__reason">{candidate.reason}</span>
                  {candidate.alreadyManaged ? (
                    <span className="import__managed">already managed</span>
                  ) : null}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}

      <footer className="import__actions">
        <p className="import__assurance">
          Importing records which files Seal manages. It does not encrypt
          anything — sealing stays a separate, deliberate action.
        </p>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={() => onConfirm([...selected])}
        >
          {selected.size === 1
            ? "Manage 1 file"
            : `Manage ${selected.size} files`}
        </button>
      </footer>
    </section>
  );
}
