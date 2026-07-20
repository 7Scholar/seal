import { useState } from "react";
import { MASK } from "../format";

interface Props {
  variableName: string;
  revealed: string | null;
  onReveal: () => void | Promise<void>;
  onConceal: () => void;
  onCopy?: (value: string) => void | Promise<void>;
}

export function SecretValue({
  variableName,
  revealed,
  onReveal,
  onConceal,
  onCopy,
}: Props) {
  const [busy, setBusy] = useState(false);
  const isRevealed = revealed !== null;

  async function toggle() {
    if (isRevealed) {
      onConceal();
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
    <div className="secret-value">
      <span className="secret-value__text" data-revealed={isRevealed}>
        {isRevealed ? revealed : MASK}
      </span>

      <button
        type="button"
        className="secret-value__toggle"
        aria-pressed={isRevealed}
        aria-label={`Reveal value for ${variableName}`}
        disabled={busy}
        onClick={toggle}
      >
        {isRevealed ? "Hide" : "Reveal"}
      </button>

      {isRevealed && onCopy ? (
        <button
          type="button"
          className="secret-value__copy"
          aria-label={`Copy value for ${variableName}`}
          onClick={() => onCopy(revealed)}
        >
          Copy
        </button>
      ) : null}

      <span className="visually-hidden" role="status">
        {isRevealed
          ? `Value for ${variableName} is shown`
          : `Value for ${variableName} is hidden`}
      </span>
    </div>
  );
}
