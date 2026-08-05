import { useEffect, useMemo, useState } from "react";
import { Confirm } from "../components/Confirm";
import { SecretValue } from "../components/SecretValue";
import { decodeSecret } from "../format";
import type { EditOp, EnvView, SealedState } from "../ipc";

interface Props {
  file: EnvView;
  relativePath: string;
  state: SealedState;
  expired?: boolean;
  resumeEditing?: string | null;
  onReveal: (row: number, key: string) => Promise<Uint8Array>;
  onSave: (ops: EditOp[]) => Promise<void>;
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

interface Draft {
  id: number;
  key: string;
  originalKey: string;
  disabled: boolean;
  originalDisabled: boolean;
  value: string | null;
  removed: boolean;
  created: boolean;
  malformed: boolean;
  text: string;
  originalText: string;
}

function draftOf(file: EnvView): Draft[] {
  const rows: Draft[] = file.variables.map((variable) => ({
    id: variable.id,
    key: variable.key,
    originalKey: variable.key,
    disabled: variable.disabled,
    originalDisabled: variable.disabled,
    value: null,
    removed: false,
    created: false,
    malformed: false,
    text: "",
    originalText: "",
  }));

  for (const line of file.malformed) {
    rows.push({
      id: line.id,
      key: "",
      originalKey: "",
      disabled: false,
      originalDisabled: false,
      value: null,
      removed: false,
      created: false,
      malformed: true,
      text: line.text,
      originalText: line.text,
    });
  }

  return rows.sort((left, right) => left.id - right.id);
}

export function keyProblem(key: string): string | null {
  if (key.length === 0) return "A variable needs a name.";
  if (/\s/.test(key)) return "A variable name cannot contain spaces.";
  if (key.includes("#")) return "A variable name cannot contain #.";
  return null;
}

function newRowOrdinal(draft: Draft[], id: number): string {
  const unnamed = draft.filter((row) => row.created && row.key.length === 0);
  const index = unnamed.findIndex((row) => row.id === id);
  return unnamed.length > 1 ? `number ${index + 1}` : "not named yet";
}

function copyKey(source: string, taken: Set<string>): string {
  let candidate = `${source}_COPY`;
  let suffix = 2;
  while (taken.has(candidate)) {
    candidate = `${source}_COPY_${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function opsFor(draft: Draft[], original: EnvView): EditOp[] {
  const ops: EditOp[] = [];
  const drafted = new Map<number, Draft>();
  for (const row of draft) drafted.set(row.id, row);

  for (const variable of original.variables) {
    const row = drafted.get(variable.id);
    if (!row || row.removed) {
      ops.push({ kind: "remove", row: variable.id });
      continue;
    }
    if (row.key !== row.originalKey) {
      ops.push({ kind: "setKey", row: row.id, key: row.key });
    }
    if (row.value !== null) {
      ops.push({ kind: "setValue", row: row.id, value: row.value });
    }
    if (row.disabled !== row.originalDisabled) {
      ops.push({ kind: "setDisabled", row: row.id, disabled: row.disabled });
    }
  }

  for (const line of original.malformed) {
    const row = drafted.get(line.id);
    if (!row || row.removed) {
      ops.push({ kind: "remove", row: line.id });
      continue;
    }
    if (!row.malformed) {
      ops.push({ kind: "replaceMalformed", row: row.id, text: row.text });
    }
  }

  let anchor: number | null = null;
  let pending: EditOp[] = [];
  for (const row of draft) {
    if (row.removed) continue;
    if (row.created) {
      pending.push({
        kind: "insert",
        after: anchor,
        key: row.key,
        value: row.value ?? "",
        disabled: row.disabled,
      });
      continue;
    }
    ops.push(...pending.reverse());
    pending = [];
    anchor = row.id;
  }
  ops.push(...pending.reverse());

  return ops;
}

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
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [draft, setDraft] = useState<Draft[]>(() => draftOf(file));
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [correctFailed, setCorrectFailed] = useState<number | null>(null);
  const [nextId, setNextId] = useState(-1);

  const [hidNote, setHidNote] = useState(false);

  useEffect(() => {
    setDraft(draftOf(file));
    setEditingKey(null);
    setCorrectFailed(null);
  }, [file]);

  useEffect(() => {
    if (!expired) return;
    setRevealed((current) => {
      if (Object.keys(current).length === 0) return current;
      setHidNote(true);
      return {};
    });
  }, [expired]);

  const ops = useMemo(() => opsFor(draft, file), [draft, file]);
  const isDirty = ops.length > 0;

  const invalid = draft.some(
    (row) => !row.removed && !row.malformed && keyProblem(row.key) !== null,
  );

  useEffect(() => {
    if (!resumeEditing) return;
    const target = file.variables.find((variable) => variable.key === resumeEditing);
    if (!target) {
      onResumed?.();
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const bytes = await onReveal(target.id, target.key);
        if (cancelled) return;
        const value = decodeSecret(bytes);
        setDraft((current) =>
          current.map((row) => (row.id === target.id ? { ...row, value } : row)),
        );
        setRevealed((current) => ({ ...current, [target.id]: value }));
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

  async function reveal(row: Draft) {
    try {
      const bytes = await onReveal(row.id, row.key);
      setHidNote(false);
      setRevealed((current) => ({ ...current, [row.id]: decodeSecret(bytes) }));
    } catch {
      return;
    }
  }

  function conceal(id: number) {
    setRevealed((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function change(id: number, patch: Partial<Draft>) {
    setDraft((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  async function beginEdit(row: Draft) {
    if (row.value !== null) return;
    try {
      const current = revealed[row.id] ?? decodeSecret(await onReveal(row.id, row.key));
      change(row.id, { value: current });
      setRevealed((existing) => ({ ...existing, [row.id]: current }));
    } catch {
      return;
    }
  }

  function editValue(id: number, value: string) {
    change(id, { value });
    setRevealed((current) => ({ ...current, [id]: value }));
  }

  function addRow() {
    const id = nextId;
    setNextId(id - 1);
    setDraft((current) => [
      ...current,
      {
        id,
        key: "",
        originalKey: "",
        disabled: false,
        originalDisabled: false,
        value: "",
        removed: false,
        created: true,
        malformed: false,
        text: "",
        originalText: "",
      },
    ]);
    setEditingKey(id);
  }

  function duplicate(row: Draft) {
    const taken = new Set(draft.map((entry) => entry.key));
    const id = nextId;
    setNextId(id - 1);
    setDraft((current) => {
      const index = current.findIndex((entry) => entry.id === row.id);
      const copy: Draft = {
        id,
        key: copyKey(row.key, taken),
        originalKey: "",
        disabled: row.disabled,
        originalDisabled: false,
        value: revealed[row.id] ?? row.value ?? "",
        removed: false,
        created: true,
        malformed: false,
        text: "",
        originalText: "",
      };
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
  }

  function remove(row: Draft) {
    if (row.created) {
      setDraft((current) => current.filter((entry) => entry.id !== row.id));
      return;
    }
    change(row.id, { removed: true });
  }

  function correct(row: Draft) {
    const text = row.text.trim();
    const match = /^(?:export\s+)?([^\s#=]+)\s*=(.*)$/.exec(text);
    const key = match?.[1];
    if (!match || key === undefined || keyProblem(key) !== null) {
      setCorrectFailed(row.id);
      return;
    }
    setCorrectFailed(null);
    change(row.id, { malformed: false, key, value: (match[2] ?? "").trim() });
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(ops);
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }

  const visible = draft.filter((row) => !row.removed);
  const count =
    visible.length === 0
      ? null
      : visible.length === 1
        ? "1 variable"
        : `${visible.length} variables`;

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
      </div>

      <div className="env-editor__region">
        <ul className="env-editor__rows">
          {draft.map((row) => {
            if (row.malformed) {
              return (
                <li key={row.id} className="env-editor__row env-editor__row--malformed">
                  <input
                    aria-label="Malformed line"
                    className="env-editor__raw"
                    value={row.text}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => change(row.id, { text: event.target.value })}
                  />
                  <button type="button" onClick={() => correct(row)}>
                    Correct
                  </button>
                  <button
                    type="button"
                    aria-label="Delete this line"
                    onClick={() => remove(row)}
                  >
                    Delete
                  </button>
                  {correctFailed === row.id ? (
                    <p className="env-editor__problem" role="alert">
                      That is still not a variable. One reads NAME=value.
                    </p>
                  ) : null}
                </li>
              );
            }

            if (row.removed) {
              return (
                <li key={row.id} className="env-editor__row env-editor__row--removed">
                  <span className="env-editor__key">{row.key}</span>
                  <span className="env-editor__gone">Will be deleted when you save</span>
                  <button
                    type="button"
                    aria-label={`Keep ${row.key}`}
                    onClick={() => change(row.id, { removed: false })}
                  >
                    Undo
                  </button>
                </li>
              );
            }

            const problem = keyProblem(row.key);
            const naming = row.created || editingKey === row.id;

            return (
              <li
                key={row.id}
                className="env-editor__row"
                data-disabled={row.disabled ? "true" : undefined}
              >
                {naming ? (
                  <input
                    aria-label={
                      row.created
                        ? row.key.length > 0
                          ? `Name for the new variable, currently ${row.key}`
                          : `Name for the new variable, ${newRowOrdinal(draft, row.id)}`
                        : `Rename ${row.originalKey}`
                    }
                    className="env-editor__key-input"
                    value={row.key}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-invalid={problem !== null}
                    onChange={(event) => change(row.id, { key: event.target.value })}
                    onBlur={() => setEditingKey(null)}
                  />
                ) : (
                  <span className="env-editor__key">{row.key}</span>
                )}

                {row.value !== null ? (
                  <input
                    aria-label={
                      row.key.length > 0
                        ? `Value for ${row.key}`
                        : `Value for the new variable, ${newRowOrdinal(draft, row.id)}`
                    }
                    value={row.value}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    onChange={(event) => editValue(row.id, event.target.value)}
                  />
                ) : (
                  <SecretValue
                    variableName={row.key}
                    revealed={revealed[row.id] ?? null}
                    onReveal={() => reveal(row)}
                    onConceal={() => conceal(row.id)}
                  />
                )}

                {row.value === null ? (
                  <button
                    type="button"
                    aria-label={`Edit ${row.key}`}
                    onClick={() => void beginEdit(row)}
                  >
                    Edit
                  </button>
                ) : null}

                {!row.created && !naming ? (
                  <button
                    type="button"
                    aria-label={`Rename ${row.key}`}
                    onClick={() => setEditingKey(row.id)}
                  >
                    Rename
                  </button>
                ) : null}

                <button
                  type="button"
                  role="switch"
                  aria-checked={!row.disabled}
                  aria-label={`${row.key} is ${row.disabled ? "disabled" : "enabled"}`}
                  onClick={() => change(row.id, { disabled: !row.disabled })}
                >
                  {row.disabled ? "Disabled" : "Enabled"}
                </button>

                <button
                  type="button"
                  aria-label={`Duplicate ${row.key}`}
                  onClick={() => duplicate(row)}
                >
                  Duplicate
                </button>

                <button
                  type="button"
                  aria-label={`Delete ${row.key}`}
                  onClick={() => remove(row)}
                >
                  Delete
                </button>

                {problem ? (
                  <p className="env-editor__problem" role="alert">
                    {problem}
                  </p>
                ) : null}
              </li>
            );
          })}

          <li className="env-editor__add">
            <button type="button" onClick={addRow}>
              Add variable
            </button>
          </li>
        </ul>
      </div>

      <footer className="env-editor__actions">
        <span role="status" aria-label="Unsaved changes" className="env-editor__dirty">
          {isDirty
            ? `${ops.length} unsaved ${ops.length === 1 ? "change" : "changes"}`
            : "No unsaved changes"}
        </span>
        <button type="button" onClick={() => (isDirty ? setDiscarding(true) : onLeave())}>
          Cancel
        </button>
        <button
          type="button"
          className="button--primary"
          disabled={!isDirty || saving || invalid}
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
            {ops.length === 1
              ? "One change you made has not been saved."
              : `${ops.length} changes you made have not been saved.`}{" "}
            Leaving now loses {ops.length === 1 ? "it" : "them"}; the file itself
            is not changed.
          </p>
        </Confirm>
      ) : null}
    </section>
  );
}
