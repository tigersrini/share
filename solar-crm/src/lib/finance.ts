import { round2 } from "./format";
import { materialCost } from "./stock";

export interface ProjectEconomicsInput {
  contractValue: number;
  /** GST factor of the supply/service split, to back out GST from the contract value */
  gstFactor: number;
  invoices: { status: string; subtotal: number }[];
  movements: { qty: number; unitCost: number }[];
  expenses: { amount: number }[];
  payments: { amount: number }[];
}

/**
 * Revenue is the taxable value actually invoiced; before any invoice exists it is estimated
 * from the contract value. Cost = stock issued to the project at its average cost + direct expenses.
 */
export function projectEconomics(p: ProjectEconomicsInput) {
  const invoiced = round2(p.invoices.filter((i) => i.status !== "CANCELLED").reduce((s, i) => s + i.subtotal, 0));
  const revenueExGst = invoiced > 0 ? invoiced : round2(p.contractValue / p.gstFactor);
  const material = materialCost(p.movements);
  const direct = round2(p.expenses.reduce((s, e) => s + e.amount, 0));
  const cost = round2(material + direct);
  const margin = round2(revenueExGst - cost);
  const received = round2(p.payments.reduce((s, x) => s + x.amount, 0));
  return {
    revenueExGst,
    estimatedRevenue: invoiced === 0,
    material,
    direct,
    cost,
    margin,
    marginPct: revenueExGst > 0 ? (margin / revenueExGst) * 100 : 0,
    received,
    balance: round2(p.contractValue - received),
  };
}

/** Last N calendar months (IST) as { key: "2026-10", label: "Oct", start, end }. */
export function lastMonths(n: number, now: Date = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const out: { key: string; label: string; start: Date; end: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const ny = m === 11 ? y + 1 : y;
    const nm = m === 11 ? 0 : m + 1;
    const pad = (x: number) => String(x + 1).padStart(2, "0");
    out.push({
      key: `${y}-${pad(m)}`,
      label: new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(d),
      start: new Date(`${y}-${pad(m)}-01T00:00:00+05:30`),
      end: new Date(`${ny}-${pad(nm)}-01T00:00:00+05:30`),
    });
  }
  return out;
}

/** Month key (IST) for a date, matching lastMonths().key. */
export function monthKey(date: Date): string {
  const ist = new Date(date.getTime() + 5.5 * 3600 * 1000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}
