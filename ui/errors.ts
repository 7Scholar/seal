import { isCommandError } from "./ipc";
import { fileName } from "./format";

const CAUSES: Record<string, string> = {
  locked: "The session is locked. Unlock Seal and try again.",
  wrongPassphrase:
    "That password does not open it. Nothing was changed — check which password this file uses.",
  notOpen:
    "The file is no longer open — its plaintext expired or it was sealed. Open it again to continue.",
  notManaged: "Seal does not manage this file, so it refused to touch it.",
  alreadySealed: "It is already sealed, so there was nothing to do.",
  notSealed: "It is not sealed, so there was nothing to open.",
  absent:
    "The file is missing from where Seal recorded it. It may have been moved or deleted — check the repository.",
  busy: "Another program is working on the file right now. Try again in a moment.",
  damaged:
    "The file could not be read as a sealed file. It may have been altered — a copy from your repository's history is the way back.",
  symlinkTarget:
    "The path is a symbolic link. Seal refuses to work through links so the real file cannot be missed.",
  unknownKey:
    "That variable is not in the file, so the edit was refused rather than silently adding a new one.",
  notAnEnvFile: "This is not an env file, so it has no editable variables.",
  notAcknowledged: "The two irreversible consequences have to be acknowledged first.",
  notEstablished: "No master password exists yet, so there is nothing to unlock.",
  alreadyEstablished: "A master password already exists, so a new one cannot be chosen here.",
  rekeyInFlight:
    "A password change is already underway. Finish it or forget it before starting another.",
  noRekey: "No password change is underway.",
  io: "The file could not be read or written. Check the disk and its permissions, then try again.",
  registry:
    "Seal's own records could not be updated. Nothing in your repositories was touched.",
};

export function reason(kind: string | null): string {
  if (kind === null) return "";
  return CAUSES[kind] ?? "Something unexpected went wrong.";
}

export function explain(doing: string, error: unknown): string {
  if (isCommandError(error)) {
    const where = error.path ? ` (${fileName(error.path)})` : "";
    const cause = CAUSES[error.kind] ?? "Something unexpected went wrong.";
    return `Could not ${doing}${where}. ${cause}`;
  }
  return `Could not ${doing}. Something unexpected went wrong — nothing further was changed. Trying again is safe.`;
}
