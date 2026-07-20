import { useState } from "react";

interface Props {
  onUnlock: (passphrase: string) => Promise<void>;
}

export function Unlock({ onUnlock }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);

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
    } finally {
      setWorking(false);
    }
  }

  return (
    <form className="unlock" onSubmit={submit}>
      <h1>Seal is locked</h1>
      <label htmlFor="passphrase">Master password</label>
      <input
        id="passphrase"
        type="password"
        value={passphrase}
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={working}
        onChange={(event) => setPassphrase(event.target.value)}
      />

      <button type="submit" disabled={working || passphrase.length === 0}>
        {working ? "Unlocking…" : "Unlock"}
      </button>

      <p role="status" aria-label="Unlock status" className="unlock__status">
        {working ? "Working. Deriving the key takes a moment." : failed ? "That password did not open your files. Nothing was changed." : ""}
      </p>
    </form>
  );
}
