/** Small helpers for reading <form> submissions inside Server Actions. */

export type ActionState = { error?: string; ok?: string } | undefined;

export function fail(error: string): ActionState {
  return { error };
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

export function num(fd: FormData, key: string, fallback = 0): number {
  const v = str(fd, key).replace(/,/g, "");
  if (v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function optNum(fd: FormData, key: string): number | null {
  const v = str(fd, key).replace(/,/g, "");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
