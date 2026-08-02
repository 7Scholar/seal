import * as ipc from "./ipc";

export type Mode = "system" | "light" | "dark";
export type Theme = "light" | "dark";

export const MODES: Mode[] = ["system", "light", "dark"];

export const MODE_LABELS: Record<Mode, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function isMode(value: unknown): value is Mode {
  return value === "system" || value === "light" || value === "dark";
}

function query(): MediaQueryList | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return window.matchMedia("(prefers-color-scheme: light)");
}

export function systemTheme(): Theme {
  return query()?.matches ? "light" : "dark";
}

export function resolve(mode: Mode): Theme {
  return mode === "system" ? systemTheme() : mode;
}

export function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

export function watchSystem(listener: () => void): () => void {
  const media = query();
  if (!media) return () => {};
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

export async function load(): Promise<Mode> {
  try {
    const stored = await ipc.themeMode();
    return isMode(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export async function store(mode: Mode): Promise<void> {
  try {
    await ipc.setThemeMode(mode);
  } catch {
    return;
  }
}
