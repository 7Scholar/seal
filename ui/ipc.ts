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

export interface Observation {
  repos: RepoView[];
  stillHeld: boolean;
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
  reason: string | null;
  preselected: boolean;
  alreadyManaged: boolean;
}

export interface DirectoryNode {
  kind: "directory";
  name: string;
  relativePath: string;
  walked: boolean;
  children: TreeNode[];
}

export interface FileNode {
  kind: "file";
  name: string;
  relativePath: string;
  confidence: "secret" | "ambiguous" | "template" | null;
  reason: string | null;
  preselected: boolean;
  alreadyManaged: boolean;
}

export type TreeNode = DirectoryNode | FileNode;

export interface ScanView {
  root: string;
  alreadyRegistered: boolean;
  candidates: CandidateView[];
  tree: TreeNode[];
}

export interface SealWarning {
  path: string;
  modifiedSecondsAgo: number;
}

export interface SealOutcome {
  path: string;
  ok: boolean;
  reason: ErrorKind | null;
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
export const reobserve = (open: string | null) =>
  invoke<Observation>("reobserve", { open });
export const openFile = (path: string) => invoke<OpenedFile>("open_file", { path });
export const closeFile = (path: string) => invoke<void>("close_file", { path });
export const openPaths = () => invoke<string[]>("open_paths");

export const save = (path: string, edits: [string, string][]) =>
  invoke<void>("save", { path, edits });
export const sealFile = (path: string) => invoke<void>("seal_file", { path });
export const sealFiles = (paths: string[]) =>
  invoke<SealOutcome[]>("seal_files", { paths });
export const unsealFile = (path: string) => invoke<void>("unseal_file", { path });
export const unsealFiles = (paths: string[]) =>
  invoke<SealOutcome[]>("unseal_files", { paths });
export const releaseRepo = (root: string, how: Release) =>
  invoke<SealOutcome[]>("release_repo", { root, how });

export const pickFolder = () => invoke<string | null>("pick_folder");
export const scanFolder = (root: string) => invoke<ScanView>("scan_folder", { root });
export const manageFiles = (root: string, selected: string[]) =>
  invoke<number>("manage", { root, selected });
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

export const themeMode = () => invoke<string>("theme_mode");
export const setThemeMode = (mode: string) => invoke<void>("set_theme_mode", { mode });
