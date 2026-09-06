import type { FileView } from "./ipc";

export type Condition = "broken" | "sealed" | "open" | "gone" | "unknown";

export const CONDITION_LABELS: Record<Condition, string> = {
  broken: "The seal broke",
  sealed: "Sealed",
  open: "Not sealed",
  gone: "Gone from disk",
  unknown: "Unknown",
};

export function conditionOf(file: FileView): Condition {
  if (file.alert) return "broken";
  if (file.state === "missing") return "gone";
  if (file.state === "sealed") return "sealed";
  if (file.state === "unknown") return "unknown";
  return "open";
}

export function unreadable(files: FileView[]): boolean {
  return files.length > 0 && files.every((file) => file.state === "unknown");
}

export function brokenFirst<T extends { files: FileView[] }>(repos: T[]): T[] {
  const broken = repos.filter((repo) => repo.files.some((file) => file.alert));
  const rest = repos.filter((repo) => !repo.files.some((file) => file.alert));
  return [...broken, ...rest];
}

export function sealable(files: FileView[]): string[] {
  return files
    .filter((file) => file.state !== "sealed" && file.state !== "missing")
    .map((file) => file.relativePath);
}

const TICK_CAP = 9;

export function ticksFor(files: FileView[]): {
  shown: Condition[];
  remainder: number;
} {
  const conditions = files.map(conditionOf);
  if (conditions.length <= TICK_CAP) {
    return { shown: conditions, remainder: 0 };
  }
  const broken = conditions.filter((c) => c === "broken");
  const rest = conditions.filter((c) => c !== "broken");
  const shown = [...broken, ...rest].slice(0, TICK_CAP);
  return { shown, remainder: conditions.length - TICK_CAP };
}

export function repoCondition(files: FileView[]): Condition {
  if (files.some((file) => file.alert)) return "broken";
  if (files.some((file) => file.state === "sealed")) return "sealed";
  if (unreadable(files)) return "unknown";
  return "open";
}
