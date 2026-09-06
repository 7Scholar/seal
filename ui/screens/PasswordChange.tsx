import { useState } from "react";
import type { Manifest } from "../ipc";
import { explain } from "../errors";
import { fileName } from "../format";
import { Icon } from "../components/Icon";
import { RunTicks } from "../components/RunTicks";

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
  const [failure, setFailure] = useState<string | null>(null);

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
    setFailure(null);
    try {
      if (!manifest) await onBegin();
      await onRun(current, replacement);
      setCurrent("");
      setReplacement("");
      setConfirmation("");
      setTyped("");
    } catch (error) {
      setFailure(explain("change the password", error));
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="rekey">
      <header>
        <h1>Change the master password</h1>
      </header>

      {inFlight ? (
        <div className="rekey__resume" role="alert">
          <div className="rekey__resume-head">
            <RunTicks entries={manifest.entries} />
            <p className="rekey__resume-text">
              {converted.length === 1
                ? "One file is"
                : `${converted.length} files are`}{" "}
              on the new password.{" "}
              {outstanding.length === 1
                ? "One still needs"
                : `${outstanding.length} still need`}{" "}
              the old one. Keep both until this finishes.
            </p>
          </div>
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
          Every managed file is re-encrypted one at a time. Keep both passwords
          until it finishes — whatever is still on the old one cannot be opened
          without it.
        </p>
      )}

      {working && manifest ? (
        <div className="rekey__running" role="status">
          <RunTicks entries={manifest.entries} />
          <span className="rekey__running-path">
            {outstanding[0] ? fileName(outstanding[0].path) : ""}
          </span>
          <span className="rekey__running-warning">
            Do not quit until this finishes
          </span>
        </div>
      ) : null}

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

      {failure ? (
        <p role="alert" className="rekey__mismatch">
          {failure}
        </p>
      ) : null}

      <footer className="rekey__actions">
        <span
          role="status"
          aria-label="Password change progress"
          className="rekey__progress"
        >
          {working
            ? "Re-encrypting. Do not quit."
            : manifest
              ? `${converted.length} of ${manifest.entries.length} converted`
              : ""}
        </span>
        {inFlight ? (
          <button
            type="button"
            className="rekey__forget"
            onClick={() => onAbandon()}
            disabled={working}
          >
            Forget this run
          </button>
        ) : (
          <button type="button" onClick={onClose} disabled={working}>
            Cancel
          </button>
        )}
        <button
          type="button"
          className="button--primary"
          disabled={!ready || working}
          onClick={run}
        >
          <Icon name="lock" />
          {inFlight
            ? `Finish the remaining ${outstanding.length}`
            : "Re-encrypt every file"}
        </button>
      </footer>
    </section>
  );
}
