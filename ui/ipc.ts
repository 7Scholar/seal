import { invoke } from "@tauri-apps/api/core";

export type SealedState = "sealed" | "plaintext" | "missing" | "unknown";

export interface FileView {
  relativePath: string;
  state: SealedState;
  alert: boolean;
}

export interface RepoView {
  root: string;
  name: string;
  files: FileView[];
}

export interface VariableView {
  key: string;
  masked: string;
  empty: boolean;
}

export interface EnvView {
  path: string;
  variables: VariableView[];
  duplicateKeys: string[];
  unparseableLines: number;
}

export type OpenedFile =
  | ({ kind: "env" } & EnvView)
  | { kind: "opaque"; path: string; bytes: number };

export interface CandidateView {
  relativePath: string;
  confidence: "secret" | "ambiguous" | "template";
  reason: string;
  preselected: boolean;
  alreadyManaged: boolean;
}

export interface ScanView {
  root: string;
  alreadyRegistered: boolean;
  candidates: CandidateView[];
}

export interface SealWarning {
  path: string;
  modifiedSecondsAgo: number;
}

export type Release = "restorePlaintext" | "leaveSealed";

export type Standing = "pending" | "converted" | "failed";

export interface ManifestEntry {
  path: string;
  standing: Standing;
  reason?: string;
}

export interface Manifest {
  workFactor: number;
  entries: ManifestEntry[];
}

export type ErrorKind =
  | "locked"
  | "wrongPassphrase"
  | "notOpen"
  | "notManaged"
  | "alreadySealed"
  | "notSealed"
  | "absent"
  | "busy"
  | "damaged"
  | "symlinkTarget"
  | "unknownKey"
  | "notAnEnvFile"
  | "notAcknowledged"
  | "notEstablished"
  | "alreadyEstablished"
  | "rekeyInFlight"
  | "noRekey"
  | "io"
  | "registry";

export interface CommandError {
  kind: ErrorKind;
  path: string | null;
}

export function isCommandError(value: unknown): value is CommandError {
  return typeof value === "object" && value !== null && "kind" in value;
}

export const unlock = (passphrase: string) => invoke<void>("unlock", { passphrase });
export const lock = () => invoke<void>("lock");
export const isUnlocked = () => invoke<boolean>("is_unlocked");
export const isEstablished = () => invoke<boolean>("is_established");
export const establish = (passphrase: string) =>
  invoke<void>("establish", { passphrase });

export const overview = () => invoke<RepoView[]>("overview");
export const openFile = (path: string) => invoke<OpenedFile>("open_file", { path });
export const closeFile = (path: string) => invoke<void>("close_file", { path });
export const openPaths = () => invoke<string[]>("open_paths");

export const save = (path: string, edits: [string, string][]) =>
  invoke<void>("save", { path, edits });
export const sealFile = (path: string) => invoke<void>("seal_file", { path });

export const pickFolder = () => invoke<string | null>("pick_folder");
export const scanFolder = (root: string) => invoke<ScanView>("scan_folder", { root });
export const importRepo = (root: string, selected: string[]) =>
  invoke<number>("import", { root, selected });
export const release = (path: string, how: Release) =>
  invoke<void>("release", { path, how });

export const sealWarning = (path: string) =>
  invoke<SealWarning | null>("seal_warning", { path });
export const hasAcknowledged = () => invoke<boolean>("has_acknowledged");
export const acknowledge = () => invoke<void>("acknowledge");

export const rekeyStatus = () => invoke<Manifest | null>("rekey_status");
export const rekeyBegin = () => invoke<Manifest>("rekey_begin");
export const rekeyRun = (current: string, replacement: string) =>
  invoke<Manifest>("rekey_run", { current, replacement });
export const rekeyAbandon = () => invoke<void>("rekey_abandon");

export async function reveal(path: string, key: string): Promise<Uint8Array> {
  const bytes = await invoke<ArrayBuffer>("reveal", { path, key });
  return new Uint8Array(bytes);
}
