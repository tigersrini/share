export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plain = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** ₹3,71,500 — whole rupees. */
export function formatINR(amount: number): string {
  return inr.format(Math.round(amount));
}

/** ₹3,71,500.00 — for invoices / ledgers. */
export function formatINR2(amount: number): string {
  return inr2.format(amount);
}

/** 3,71,500 (no currency symbol), keeps up to 2 decimals. */
export function formatNum(n: number): string {
  return plain.format(n);
}

/** ₹3.7 L / ₹1.2 Cr / ₹45 K — compact for KPI tiles. */
export function formatINRShort(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const a = Math.abs(amount);
  if (a >= 1e7) return `${sign}₹${trim(a / 1e7)} Cr`;
  if (a >= 1e5) return `${sign}₹${trim(a / 1e5)} L`;
  if (a >= 1e3) return `${sign}₹${trim(a / 1e3)} K`;
  return `${sign}₹${Math.round(a)}`;
}
function trim(n: number): string {
  return n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2).replace(/\.?0+$/, "");
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(date));
}

/** dd.mm.yyyy — the style used on the existing proposals and invoices. */
export function formatDateDots(date: string | Date): string {
  const p = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata" }).formatToParts(new Date(date));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("day")}.${g("month")}.${g("year")}`;
}

/** yyyy-mm-dd for <input type="date"> (IST). */
export function toDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const p = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(date));
  return p;
}

/** Parses an <input type="date"> value as midday IST so it never slips a day. */
export function fromDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function todayInput(): string {
  return toDateInput(new Date());
}

/** Indian financial year label for a date, e.g. 2026-10-07 → "26-27". */
export function financialYear(date: Date = new Date()): string {
  const ist = new Date(date.getTime() + 5.5 * 3600 * 1000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

/** Start (inclusive) of the financial year containing `date`, in IST midnight. */
export function financialYearStart(date: Date = new Date()): Date {
  const ist = new Date(date.getTime() + 5.5 * 3600 * 1000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1;
  return new Date(`${start}-04-01T00:00:00+05:30`);
}

export function startOfMonth(date: Date = new Date()): Date {
  const ist = new Date(date.getTime() + 5.5 * 3600 * 1000);
  return new Date(`${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-01T00:00:00+05:30`);
}

export function startOfDay(date: Date = new Date()): Date {
  return new Date(`${toDateInput(date)}T00:00:00+05:30`);
}

export function endOfDay(date: Date = new Date()): Date {
  return new Date(`${toDateInput(date)}T23:59:59.999+05:30`);
}

/** Keeps digits and a leading + only. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "").trim();
}

/** wa.me deep link; assumes India (+91) when a bare 10-digit number is given. */
export function whatsAppLink(phone: string, message: string): string {
  let digits = normalizePhone(phone).replace(/^\+/, "");
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? (h ? "and " : "") + twoDigits(r) : ""].filter(Boolean).join(" ");
}

/** 410088 → "Four Lacs Ten Thousand and Eighty-Eight" (Indian numbering, as on existing invoices). */
export function numberToWordsIN(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 1e7);
  const lac = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  const parts: string[] = [];
  if (crore) parts.push(`${numberToWordsIN(crore)} Crore${crore > 1 ? "s" : ""}`);
  if (lac) parts.push(`${twoDigits(lac)} Lac${lac > 1 ? "s" : ""}`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) {
    const t = threeDigits(rest);
    parts.push(parts.length && rest < 100 ? `and ${t}` : t);
  }
  return parts.join(" ");
}

/** "INR Four Lacs Ten Thousand and Eighty-Eight Only" / "… and Fifty Paise Only". */
export function amountInWords(amount: number): string {
  const rupees = Math.floor(round2(Math.abs(amount)));
  const paise = Math.round((round2(Math.abs(amount)) - rupees) * 100);
  let s = `INR ${numberToWordsIN(rupees)}`;
  if (paise) s += ` and ${twoDigits(paise)} Paise`;
  return `${s} Only`;
}

/** Current time in ms. Server pages call this instead of Date.now() directly (React's purity lint flags the latter). */
export function nowMs(): number {
  return Date.now();
}

/** "5 min ago", "3 h ago", "2 days ago" — for activity feeds. */
export function timeAgo(date: Date | string, from: number = nowMs()): string {
  const s = Math.max(0, Math.round((from - new Date(date).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : d < 30 ? `${d} days ago` : formatDate(date);
}
