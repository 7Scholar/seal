import { useEffect, useState } from "react";
import { Confirm } from "../components/Confirm";
import { SecretValue } from "../components/SecretValue";
import { decodeSecret } from "../format";
import type { EnvView, SealedState } from "../ipc";

interface Props {
  file: EnvView;
  relativePath: string;
  state: SealedState;
  expired?: boolean;
  resumeEditing?: string | null;
  onReveal: (key: string) => Promise<Uint8Array>;
  onSave: (edits: [string, string][]) => Promise<void>;
  onSeal: () => void | Promise<void>;
  onUnseal: () => void | Promise<void>;
  onLeave: () => void;
  onResumed?: () => void;
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
  resumeEditing = null,
  onReveal,
  onSave,
  onSeal,
  onUnseal,
  onLeave,
  onResumed,
}: Props) {
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);

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

  useEffect(() => {
    if (!resumeEditing) return;
    if (!file.variables.some((variable) => variable.key === resumeEditing)) {
      onResumed?.();
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const bytes = await onReveal(resumeEditing);
        if (cancelled) return;
        const value = decodeSecret(bytes);
        setEdits((current) => ({ ...current, [resumeEditing]: value }));
        setRevealed((current) => ({ ...current, [resumeEditing]: value }));
      } catch {
        return;
      } finally {
        if (!cancelled) onResumed?.();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resumeEditing, file.path]);

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

  const count =
    file.variables.length === 0
      ? null
      : file.variables.length === 1
        ? "1 variable"
        : `${file.variables.length} variables`;

  return (
    <section className="env-editor">
      <header className="file-head">
        <div className="file-head__text">
          <p className="file-head__path">{relativePath}</p>
        </div>
        {count ? <span className="surface__count">{count}</span> : null}
        <span className="file-head__state" data-state={state}>
          {STATE_LABELS[state]}
        </span>
        {state === "sealed" ? (
          <button type="button" onClick={() => onUnseal()}>
            Unseal
          </button>
        ) : (
          <button type="button" onClick={() => onSeal()}>
            Seal
          </button>
        )}
      </header>

      <div className="env-editor__notices">
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
      </div>

      <div className="env-editor__region">
        <ul className="env-editor__rows">
          {file.variables.length === 0 ? (
            <li className="env-editor__none">
              This file defines no variables.
            </li>
          ) : null}
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
      </div>

      <footer className="env-editor__actions">
        <span role="status" aria-label="Unsaved changes" className="env-editor__dirty">
          {isDirty
            ? `${dirtyKeys.length} unsaved ${dirtyKeys.length === 1 ? "change" : "changes"}`
            : "No unsaved changes"}
        </span>
        <button type="button" onClick={() => (isDirty ? setDiscarding(true) : onLeave())}>
          Cancel
        </button>
        <button
          type="button"
          className="button--primary"
          disabled={!isDirty || saving}
          onClick={save}
        >
          {state === "sealed" ? "Save and seal" : "Save"}
        </button>
      </footer>

      {discarding ? (
        <Confirm
          title="Discard your changes?"
          confirmLabel="Discard them"
          cancelLabel="Keep editing"
          onCancel={() => setDiscarding(false)}
          onConfirm={() => {
            setDiscarding(false);
            onLeave();
          }}
        >
          <p>
            {dirtyKeys.length === 1
              ? "One value you changed has not been saved."
              : `${dirtyKeys.length} values you changed have not been saved.`}{" "}
            Leaving now loses {dirtyKeys.length === 1 ? "it" : "them"}; the file
            itself is not changed.
          </p>
        </Confirm>
      ) : null}
    </section>
  );
}
