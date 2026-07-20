import { useState } from "react";
import type { Manifest } from "../ipc";
import { fileName } from "../format";

interface Props {
  manifest: Manifest | null;
  onBegin: () => Promise<void>;
  onRun: (current: string, replacement: string) => Promise<void>;
  onAbandon: () => Promise<void>;
  onClose: () => void;
}

const PHRASE = "CHANGE MY PASSWORD";

export function PasswordChange({
  manifest,
  onBegin,
  onRun,
  onAbandon,
  onClose,
}: Props) {
  const [current, setCurrent] = useState("");
  const [replacement, setReplacement] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [typed, setTyped] = useState("");
  const [working, setWorking] = useState(false);

  const converted = manifest?.entries.filter((e) => e.standing === "converted") ?? [];
  const outstanding = manifest?.entries.filter((e) => e.standing !== "converted") ?? [];
  const inFlight = manifest !== null && outstanding.length > 0;

  const ready =
    replacement.length > 0 &&
    replacement === confirmation &&
    current.length > 0 &&
    typed === PHRASE;

  async function run() {
    setWorking(true);
    try {
      if (!manifest) await onBegin();
      await onRun(current, replacement);
      setCurrent("");
      setReplacement("");
      setConfirmation("");
      setTyped("");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="rekey">
      <header>
        <h1>Change your master password</h1>
        <button type="button" onClick={onClose} disabled={working}>
          Close
        </button>
      </header>

      {inFlight ? (
        <div className="rekey__resume" role="alert">
          <h2>A password change was not finished</h2>
          <p>
            {converted.length} of {manifest.entries.length} files are on the new
            password. The remaining {outstanding.length} still need the old one.
            <strong> Keep both passwords until this finishes.</strong>
          </p>
          <ul>
            {outstanding.map((entry) => (
              <li key={entry.path}>
                <span className="rekey__path">{fileName(entry.path)}</span>
                {entry.reason ? (
                  <span className="rekey__reason">{entry.reason}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rekey__intro">
          Every managed file is re-encrypted under the new password, one at a
          time. Both passwords must be remembered until it finishes.{" "}
          <strong>
            If you forget the old one partway through, the files still on it
            cannot be recovered.
          </strong>
        </p>
      )}

      <div className="rekey__fields">
        <label htmlFor="current">
          {inFlight ? "Old password" : "Current password"}
        </label>
        <input
          id="current"
          type="password"
          value={current}
          autoComplete="off"
          spellCheck={false}
          disabled={working}
          onChange={(event) => setCurrent(event.target.value)}
        />

        <label htmlFor="replacement">New password</label>
        <input
          id="replacement"
          type="password"
          value={replacement}
          autoComplete="off"
          spellCheck={false}
          disabled={working}
          onChange={(event) => setReplacement(event.target.value)}
        />

        <label htmlFor="confirmation">New password again</label>
        <input
          id="confirmation"
          type="password"
          value={confirmation}
          autoComplete="off"
          spellCheck={false}
          disabled={working}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        {confirmation.length > 0 && confirmation !== replacement ? (
          <p role="alert" className="rekey__mismatch">
            The two new passwords do not match.
          </p>
        ) : null}

        <label htmlFor="phrase">
          Type <strong>{PHRASE}</strong> to continue
        </label>
        <input
          id="phrase"
          value={typed}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={working}
          onChange={(event) => setTyped(event.target.value)}
        />
      </div>

      <footer className="rekey__actions">
        <span role="status" aria-label="Password change progress">
          {working
            ? "Re-encrypting. Do not quit."
            : manifest
              ? `${converted.length} of ${manifest.entries.length} converted`
              : ""}
        </span>
        {inFlight ? (
          <button type="button" onClick={() => onAbandon()} disabled={working}>
            Forget this run
          </button>
        ) : null}
        <button type="button" disabled={!ready || working} onClick={run}>
          {inFlight ? "Retry the rest" : "Change the password"}
        </button>
      </footer>
    </section>
  );
}
