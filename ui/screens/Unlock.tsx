import { useEffect, useRef, useState } from "react";
import { createSandShield, type SandShield } from "./sandShield";

interface Props {
  mode: "verify" | "create";
  notice?: string;
  onSubmit: (passphrase: string) => Promise<void>;
}

type Notice = "" | "confirm" | "mismatch" | "wrong" | "failed";

export function Unlock({ mode, notice: outsideNotice, onSubmit }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<Notice>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shieldRef = useRef<SandShield | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const shield = createSandShield(canvas);
    shieldRef.current = shield;
    return () => {
      shieldRef.current = null;
      shield.destroy();
    };
  }, []);

  useEffect(() => {
    shieldRef.current?.setChurn(working);
  }, [working]);

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (passphrase.length === 0 || working) return;

    if (mode === "create" && chosen === null) {
      setChosen(passphrase);
      setPassphrase("");
      setNotice("confirm");
      return;
    }

    if (mode === "create" && chosen !== null && passphrase !== chosen) {
      setChosen(null);
      setPassphrase("");
      setNotice("mismatch");
      shieldRef.current?.pulse();
      return;
    }

    setWorking(true);
    setNotice("");
    try {
      await onSubmit(passphrase);
      setPassphrase("");
      setChosen(null);
    } catch {
      setNotice(mode === "verify" ? "wrong" : "failed");
      setPassphrase("");
      setChosen(null);
      shieldRef.current?.pulse();
    } finally {
      setWorking(false);
    }
  }

  const heading = mode === "verify" ? "Seal is locked" : "Choose your master password";
  const hint =
    mode === "verify"
      ? "Type your master password, then press Enter."
      : "You are choosing a password now, not entering one. It can never be recovered: lose it and everything sealed with it is lost. Type it, then press Enter.";

  const status = working
    ? "Working. Deriving the key takes a moment."
    : notice === "confirm"
      ? "Nothing is set yet. Type the same password once more to confirm, then press Enter."
      : notice === "mismatch"
        ? "The two entries did not match. Nothing was set — choose the password again from the start."
        : notice === "wrong"
          ? "That password did not open your files. Nothing was changed. The attempt was cleared — type it again and press Enter."
          : notice === "failed"
            ? "The password could not be set. Nothing was changed — type it again and press Enter."
            : passphrase.length === 0 && chosen === null
              ? (outsideNotice ?? "")
              : "";

  const alarmed = notice === "mismatch" || notice === "wrong" || notice === "failed";

  return (
    <form
      className="unlock"
      onSubmit={submit}
      onPointerMove={(event) => shieldRef.current?.pointerTo(event.clientX, event.clientY)}
      onPointerLeave={() => shieldRef.current?.pointerGone()}
      onPointerDown={() => inputRef.current?.focus()}
    >
      <canvas ref={canvasRef} className="unlock__sand" />

      <label htmlFor="passphrase" className="visually-hidden">
        Master password
      </label>
      <input
        id="passphrase"
        ref={inputRef}
        className="visually-hidden"
        type="password"
        value={passphrase}
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        readOnly={working}
        onKeyDown={(event) => {
          if (event.key === "Enter") void submit(event);
        }}
        onChange={(event) => {
          const next = event.target.value;
          if (next.length > passphrase.length) shieldRef.current?.spark();
          setPassphrase(next);
        }}
        onBlur={() => {
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      />

      <div className="unlock__overlay">
        <h1>{heading}</h1>
        <p className="unlock__hint">{hint}</p>
        <p
          role="status"
          aria-label="Unlock status"
          className="unlock__status"
          data-failed={alarmed ? "true" : undefined}
        >
          {status}
        </p>
      </div>
    </form>
  );
}
