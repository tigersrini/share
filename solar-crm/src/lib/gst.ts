import { round2 } from "./format";
import type { Settings } from "./settings";

export interface LineInput {
  description: string;
  hsn?: string | null;
  qty: number;
  unit: string;
  rate: number;
  gstRate: number;
}

export interface TaxRow {
  hsn: string;
  taxable: number;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
}

export interface InvoiceTotals {
  lines: (LineInput & { amount: number })[];
  /** taxable value */
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  roundOff: number;
  total: number;
  /** one row per HSN + rate, for the tax summary table */
  hsnRows: TaxRow[];
  /** one row per rate, for the "Output CGST @9%" lines */
  rateRows: { rate: number; taxable: number; cgst: number; sgst: number; igst: number }[];
}

/** All invoice maths happens here, server-side, from the raw lines. Never trust client totals. */
export function computeInvoice(input: LineInput[], intraState: boolean): InvoiceTotals {
  const lines = input.map((l) => ({ ...l, amount: round2(l.qty * l.rate) }));

  const hsnMap = new Map<string, TaxRow>();
  const rateMap = new Map<number, { rate: number; taxable: number; cgst: number; sgst: number; igst: number }>();
  for (const l of lines) {
    // Intra-state: CGST and SGST are each computed on the taxable value at half the rate, so they are always equal.
    const half = round2((l.amount * (l.gstRate / 2)) / 100);
    const cgst = intraState ? half : 0;
    const sgst = intraState ? half : 0;
    const igst = intraState ? 0 : round2((l.amount * l.gstRate) / 100);
    const tax = round2(cgst + sgst + igst);

    const hk = `${l.hsn ?? ""}|${l.gstRate}`;
    const h = hsnMap.get(hk) ?? { hsn: l.hsn ?? "", taxable: 0, rate: l.gstRate, cgst: 0, sgst: 0, igst: 0, tax: 0 };
    h.taxable = round2(h.taxable + l.amount);
    h.cgst = round2(h.cgst + cgst);
    h.sgst = round2(h.sgst + sgst);
    h.igst = round2(h.igst + igst);
    h.tax = round2(h.tax + tax);
    hsnMap.set(hk, h);

    const r = rateMap.get(l.gstRate) ?? { rate: l.gstRate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    r.taxable = round2(r.taxable + l.amount);
    r.cgst = round2(r.cgst + cgst);
    r.sgst = round2(r.sgst + sgst);
    r.igst = round2(r.igst + igst);
    rateMap.set(l.gstRate, r);
  }

  const rateRows = [...rateMap.values()].filter((r) => r.rate > 0).sort((a, b) => a.rate - b.rate);
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  const cgst = round2(rateRows.reduce((s, r) => s + r.cgst, 0));
  const sgst = round2(rateRows.reduce((s, r) => s + r.sgst, 0));
  const igst = round2(rateRows.reduce((s, r) => s + r.igst, 0));
  const totalTax = round2(cgst + sgst + igst);
  const raw = round2(subtotal + totalTax);
  const total = Math.round(raw);
  return {
    lines,
    subtotal,
    cgst,
    sgst,
    igst,
    totalTax,
    roundOff: round2(total - raw),
    total,
    hsnRows: [...hsnMap.values()].sort((a, b) => a.hsn.localeCompare(b.hsn)),
    rateRows,
  };
}

/**
 * Splits a GST-inclusive solar package price into the two lines the tax rules expect:
 * supply of goods (default 70% @ 5%) and installation services (30% @ 18%).
 * Returns pre-tax amounts for each line.
 */
export function splitInclusivePackage(inclusiveTotal: number, g: Settings["gst"]) {
  const share = g.supplySharePct / 100;
  const factor = share * (1 + g.supplyGstPct / 100) + (1 - share) * (1 + g.serviceGstPct / 100);
  const taxable = inclusiveTotal / factor;
  const supply = round2(taxable * share);
  const service = round2(taxable - supply);
  return { supply, service };
}

export const GST_RATES = [0, 5, 12, 18, 28] as const;
