export const MASK = "••••••••";

export function fileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

export function decodeSecret(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
