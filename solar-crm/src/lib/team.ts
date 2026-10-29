import { fromDateInput, toDateInput } from "./format";

/** yyyy-mm-dd keys between two dates inclusive (max 62 days), optionally skipping Sundays. */
export function expandDays(from: string, to: string, skipSundays: boolean): string[] {
  const start = fromDateInput(from);
  const end = fromDateInput(to || from);
  if (!start || !end || end < start) return [];
  const out: string[] = [];
  for (let t = start.getTime(); t <= end.getTime() && out.length < 62; t += 86400000) {
    const d = new Date(t);
    const key = toDateInput(d);
    const istDow = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Kolkata" }).format(d);
    if (skipSundays && istDow === "Sun") continue;
    out.push(key);
  }
  return out;
}

/** Stable hue per site so the same project is always the same colour in the calendar. */
export function siteHue(code: string): number {
  // Project codes end in a running number; spreading by the golden angle keeps neighbouring sites visibly different.
  const n = Number(code.match(/(\d+)$/)?.[1]);
  if (Number.isFinite(n)) return Math.round(n * 137.508) % 360;
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export const ASSIGNMENT_LABEL = { PLANNED: "Planned", DONE: "Worked", ABSENT: "Absent" } as const;
export const ASSIGNMENT_TONE = { PLANNED: "blue", DONE: "green", ABSENT: "red" } as const;

export const MEMBER_ROLES = ["Installer", "Electrician", "Supervisor", "Helper", "Site engineer", "Welder / fabricator", "Driver"];

/** Month grid (Mon-first) for "YYYY-MM": 5–6 weeks of yyyy-mm-dd keys plus the month bounds. */
export function monthGrid(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(Date.UTC(y, m - 1, 1 - offset));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const key = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const days: { key: string; inMonth: boolean }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    days.push({ key: key(d), inMonth: d.getUTCMonth() === m - 1 });
  }
  const prev = key(new Date(Date.UTC(y, m - 2, 1))).slice(0, 7);
  const next = key(new Date(Date.UTC(y, m, 1))).slice(0, 7);
  return { days, weeks, prev, next, label: new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(first) };
}

export function addDaysKey(key: string, n: number): string {
  return toDateInput(new Date(new Date(`${key}T12:00:00+05:30`).getTime() + n * 86400000));
}

export function dayLabel(key: string, opts?: { short?: boolean }): string {
  return new Intl.DateTimeFormat("en-IN", opts?.short ? { day: "numeric", month: "short" } : { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${key}T12:00:00+05:30`));
}
