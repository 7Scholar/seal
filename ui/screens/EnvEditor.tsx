import { useEffect, useState } from "react";
import { SecretValue } from "../components/SecretValue";
import { decodeSecret } from "../format";
import type { EnvView, SealedState } from "../ipc";

interface Props {
  file: EnvView;
  relativePath: string;
  state: SealedState;
  expired?: boolean;
  onReveal: (key: string) => Promise<Uint8Array>;
  onSave: (edits: [string, string][]) => Promise<void>;
  onSeal: () => void | Promise<void>;
}

const STATE_LABELS: Record<SealedState, string> = {
  sealed: "Sealed",
  plaintext: "Readable",
  missing: "Not found",
  unknown: "Unknown",
};

export function EnvEditor({
  file,
  relativePath,
  state,
  expired = false,
  onReveal,
  onSave,
  onSeal,
}: Props) {
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [hidNote, setHidNote] = useState(false);

  useEffect(() => {
    if (!expired) return;
    setRevealed((current) => {
      if (Object.keys(current).length === 0) return current;
      setHidNote(true);
      return {};
    });
  }, [expired]);

  const dirtyKeys = Object.keys(edits);
  const isDirty = dirtyKeys.length > 0;

  async function reveal(key: string) {
    try {
      const bytes = await onReveal(key);
      setHidNote(false);
      setRevealed((current) => ({ ...current, [key]: decodeSecret(bytes) }));
    } catch {
      return;
    }
  }

  function conceal(key: string) {
    setRevealed((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function edit(key: string, value: string) {
    setEdits((current) => ({ ...current, [key]: value }));
    setRevealed((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(dirtyKeys.map((key) => [key, edits[key] ?? ""]));
      setEdits({});
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="env-editor">
      <header className="file-head">
        <div className="file-head__text">
          <p className="file-head__path">{relativePath}</p>
        </div>
        <span className="file-head__state" data-state={state}>
          {STATE_LABELS[state]}
        </span>
      </header>

      {hidNote ? (
        <p className="env-editor__notice" role="status">
          Seal stopped holding this file after a spell of inactivity, so the
          value you had revealed was hidden again. Reveal it to look once more.
        </p>
      ) : null}

      {file.duplicateKeys.length > 0 ? (
        <p className="env-editor__notice" role="note">
          This file defines {file.duplicateKeys.join(", ")} more than once. Both
          lines are kept exactly as they are, because tools disagree about which
          one wins.
        </p>
      ) : null}

      {file.unparseableLines > 0 ? (
        <p className="env-editor__notice" role="note">
          {file.unparseableLines === 1
            ? "1 line is not a variable assignment. It is preserved untouched."
            : `${file.unparseableLines} lines are not variable assignments. They are preserved untouched.`}
        </p>
      ) : null}

      <ul className="env-editor__rows">
        {file.variables.map((variable, index) => {
          const key = variable.key;
          const rowId = `${key}-${index}`;
          const isEditing = key in edits;
          return (
            <li key={rowId} className="env-editor__row">
              <span className="env-editor__key">{key}</span>

              {isEditing ? (
                <input
                  aria-label={`Value for ${key}`}
                  value={edits[key] ?? ""}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  onChange={(event) => edit(key, event.target.value)}
                />
              ) : (
                <SecretValue
                  variableName={key}
                  revealed={revealed[key] ?? null}
                  onReveal={() => reveal(key)}
                  onConceal={() => conceal(key)}
                />
              )}

              {!isEditing ? (
                <button
                  type="button"
                  aria-label={`Edit ${key}`}
                  onClick={async () => {
                    try {
                      const current = revealed[key] ?? decodeSecret(await onReveal(key));
                      edit(key, current);
                    } catch {
                      return;
                    }
                  }}
                >
                  Edit
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <footer className="env-editor__actions">
        <span role="status" aria-label="Unsaved changes" className="env-editor__dirty">
          {isDirty
            ? `${dirtyKeys.length} unsaved ${dirtyKeys.length === 1 ? "change" : "changes"}`
            : "No unsaved changes"}
        </span>
        <button type="button" disabled={!isDirty || saving} onClick={save}>
          Save
        </button>
        <button type="button" onClick={() => onSeal()}>
          Seal and close
        </button>
      </footer>
    </section>
  );
}
