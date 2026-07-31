import { useEffect, useRef, useState } from "react";
import { createSandShield, type SandShield } from "./sandShield";

interface Props {
  onUnlock: (passphrase: string) => Promise<void>;
}

export function Unlock({ onUnlock }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);
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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (passphrase.length === 0 || working) return;

    setWorking(true);
    setFailed(false);
    try {
      await onUnlock(passphrase);
      setPassphrase("");
    } catch {
      setFailed(true);
      setPassphrase("");
      shieldRef.current?.pulse();
    } finally {
      setWorking(false);
    }
  }

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
        <h1>Seal is locked</h1>
        <p className="unlock__hint">Type your master password, then press Enter.</p>
        <p
          role="status"
          aria-label="Unlock status"
          className="unlock__status"
          data-failed={failed ? "true" : undefined}
        >
          {working
            ? "Working. Deriving the key takes a moment."
            : failed
              ? "That password did not open your files. Nothing was changed. The attempt was cleared — type it again and press Enter."
              : ""}
        </p>
      </div>
    </form>
  );
}
