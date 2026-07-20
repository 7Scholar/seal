import { useId, useState } from "react";

interface Props {
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  typeToConfirm?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  children: React.ReactNode;
}

export function Confirm({
  title,
  confirmLabel,
  cancelLabel,
  typeToConfirm,
  onConfirm,
  onCancel,
  children,
}: Props) {
  const [typed, setTyped] = useState("");
  const headingId = useId();
  const inputId = useId();

  const satisfied = typeToConfirm === undefined || typed === typeToConfirm;

  return (
    <div
      className="confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <h2 id={headingId}>{title}</h2>
      <div className="confirm__body">{children}</div>

      {typeToConfirm !== undefined ? (
        <div className="confirm__gate">
          <label htmlFor={inputId}>
            Type <strong>{typeToConfirm}</strong> to continue
          </label>
          <input
            id={inputId}
            value={typed}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
      ) : null}

      <div className="confirm__actions">
        <button type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className="confirm__danger"
          disabled={!satisfied}
          onClick={() => onConfirm()}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
