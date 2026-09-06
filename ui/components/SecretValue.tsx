import { useState } from "react";
import { MASK } from "../format";
import { Icon } from "./Icon";

interface Props {
  variableName: string;
  revealed: string | null;
  onReveal: () => void | Promise<void>;
  onConceal: () => void;
  onEdit: () => void | Promise<void>;
}

export function SecretValue({
  variableName,
  revealed,
  onReveal,
  onConceal,
  onEdit,
}: Props) {
  const [busy, setBusy] = useState(false);
  const isRevealed = revealed !== null;

  async function press() {
    if (busy) return;
    if (isRevealed) {
      await onEdit();
      return;
    }
    setBusy(true);
    try {
      await onReveal();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="secret-value">
      <button
        type="button"
        className="secret-value__button"
        data-revealed={isRevealed}
        aria-pressed={isRevealed}
        aria-label={
          isRevealed ? `Edit ${variableName}` : `Reveal value for ${variableName}`
        }
        aria-busy={busy || undefined}
        onClick={press}
        onKeyDown={(event) => {
          if (event.key === "Escape" && isRevealed) {
            event.stopPropagation();
            onConceal();
          }
        }}
      >
        <span className="secret-value__text">{isRevealed ? revealed : MASK}</span>
        {isRevealed ? null : <Icon name="eye" className="secret-value__eye" />}
      </button>

      <span className="visually-hidden" role="status">
        {isRevealed
          ? `Value for ${variableName} is shown`
          : `Value for ${variableName} is hidden`}
      </span>
    </span>
  );
}
