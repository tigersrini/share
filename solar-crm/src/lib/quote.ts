import { z } from "zod";
import type { CalcInput } from "./solar";
import { calculateSolar, subsidyFor } from "./solar";
import type { MakeRow, PaymentTermRow, Settings } from "./settings";

export interface QuoteFormLine {
  description: string;
  uom: string;
  /** free text because proposals sometimes say "9/10" */
  qty: string;
  itemId: string | null;
  /** internal cost per unit, never printed */
  unitCost: number;
}

export interface QuoteForm {
  id?: string;
  customerId: string;
  /** yyyy-mm-dd */
  date: string;
  validityDays: number;
  title: string;
  systemKw: number;
  systemType: string;
  lines: QuoteFormLine[];
  makes: MakeRow[];
  scopeText: string;
  totalAmount: number;
  subsidyCentral: number;
  subsidyState: number;
  paymentTerms: PaymentTermRow[];
  subsidyDocs: string[];
  warranty: string;
  performanceRatio: string;
  timeline: string;
  otherTerms: string;
  notes: string;
  includeSavings: boolean;
  calc: CalcInput | null;
}

export const quoteFormSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1, "Choose a customer."),
  date: z.string().min(8),
  validityDays: z.coerce.number().int().min(1).max(365),
  title: z.string().trim().min(1, "Title is required."),
  systemKw: z.coerce.number().positive("System size (kW) is required."),
  systemType: z.string().trim().min(1),
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Every BOM line needs a description."),
        uom: z.string().trim().default("Nos"),
        qty: z.string().trim().min(1, "Every BOM line needs a quantity."),
        itemId: z.string().nullable().default(null),
        unitCost: z.coerce.number().min(0).default(0),
      }),
    )
    .min(1, "Add at least one BOM line."),
  makes: z.array(z.object({ item: z.string().trim(), makes: z.string().trim() })).default([]),
  scopeText: z.string().trim().min(1, "Describe the scope for the commercial table."),
  totalAmount: z.coerce.number().positive("Enter the total amount."),
  subsidyCentral: z.coerce.number().min(0).default(0),
  subsidyState: z.coerce.number().min(0).default(0),
  paymentTerms: z.array(z.object({ label: z.string().trim().min(1), percent: z.coerce.number().min(0).max(100) })).default([]),
  subsidyDocs: z.array(z.string().trim()).default([]),
  warranty: z.string().default(""),
  performanceRatio: z.string().default(""),
  timeline: z.string().default(""),
  otherTerms: z.string().default(""),
  notes: z.string().default(""),
  includeSavings: z.boolean().default(false),
  calc: z.any().nullable().default(null),
});

export function quoteTitle(kw: number, systemType: string): string {
  return `PROPOSAL- DESIGN, SUPPLY & INSTALLATION OF ${kw}KW ${systemType} SOLAR PV POWER PROJECT`;
}

export function quoteScope(kw: number): string {
  return `Design, Engineering, Supply of Solar DCR Bifacial Mono/TOPCon, (540–600 Wp) ${kw} kW, Single Phase, MPPT. High-raised, hot-dip galvanized MS structure, AC box, DC box, DC, AC & PV structure, inverter & equipment earthing, Earthing Cables, Copper Bonded Earth Rods, Lightning Arrester & Other Accessories`;
}

/** A starting bill of materials in the same shape as the existing proposals. */
export function defaultBom(kw: number, panelWp: number): QuoteFormLine[] {
  const panels = Math.max(1, Math.ceil((kw * 1000) / panelWp - 1e-9));
  const dc = ((panels * panelWp) / 1000).toFixed(2);
  const phase = kw >= 10 ? "3Ph" : "1Ph";
  const rows: [string, string, string][] = [
    [`Supply and Installation of ${dc}KW DC Solar Power Plant\nSolar Panel DCR Bifacial Mono/TOPCon, (540–600 Wp )\nEMMVEE/ Premier/ Equivalent`, "Nos", String(panels)],
    [`${kw}KW ${phase} Make: Deye / Feston /Equivalent`, "Nos", "1"],
    [`Solar Mounting Structure Sheet Al– ${kw}KW`, "Set", String(Math.max(1, Math.round(kw * 0.6)))],
    [`ACDB with SPD – ${kw}kw & DCDB with SPD – ${kw}kw`, "Set", "1"],
    ["MC4 Connectors, PVC Pipes and clamps", "Set", "1"],
    ["Earthing Kits, Lighting Arrester", "Set", "1"],
  ];
  return rows.map(([description, uom, qty]) => ({ description, uom, qty, itemId: null, unitCost: 0 }));
}

export function buildDefaultForm(
  settings: Settings,
  opts: { customerId?: string; kw?: number; calc?: CalcInput | null; today: string; residential?: boolean },
): QuoteForm {
  const kw = opts.kw && opts.kw > 0 ? opts.kw : 3;
  const qd = settings.quoteDefaults;
  const calc = opts.calc ?? null;
  const gross = calc ? calculateSolar(calc, settings.subsidy).grossCost : Math.round(kw * settings.solar.costPerKw);
  const sub = opts.residential === false ? { central: 0, state: 0 } : subsidyFor(kw, settings.subsidy);
  return {
    customerId: opts.customerId ?? "",
    date: opts.today,
    validityDays: qd.validityDays,
    title: quoteTitle(kw, qd.systemType),
    systemKw: kw,
    systemType: qd.systemType,
    lines: defaultBom(kw, settings.solar.panelWp),
    makes: qd.makes,
    scopeText: quoteScope(kw),
    totalAmount: gross,
    subsidyCentral: sub.central,
    subsidyState: sub.state,
    paymentTerms: qd.paymentTerms,
    subsidyDocs: qd.subsidyDocs,
    warranty: qd.warranty,
    performanceRatio: qd.performanceRatio,
    timeline: qd.timeline,
    otherTerms: qd.otherTerms,
    notes: "",
    includeSavings: !!calc,
    calc,
  };
}

export function netPayable(q: { totalAmount: number; subsidyCentral: number; subsidyState: number }): number {
  return Math.max(0, q.totalAmount - q.subsidyCentral - q.subsidyState);
}

/** What the quote costs us (ex-GST), from the internal unit costs on the BOM. */
export function bomCost(lines: { qty: string; unitCost: number; qtyNum?: number }[]): number {
  return lines.reduce((s, l) => s + (l.qtyNum ?? parseQty(l.qty)) * l.unitCost, 0);
}

/** "9/10" → 9 (conservative); "3" → 3. */
export function parseQty(q: string): number {
  const m = q.match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

/** Inclusive GST factor for the supply/service split, e.g. 1.089 for 70% @5% + 30% @18%. */
export function gstFactor(g: Settings["gst"]): number {
  const share = g.supplySharePct / 100;
  return share * (1 + g.supplyGstPct / 100) + (1 - share) * (1 + g.serviceGstPct / 100);
}
