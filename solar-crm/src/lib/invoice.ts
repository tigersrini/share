import { z } from "zod";
import type { LineInput } from "./gst";
import { splitInclusivePackage } from "./gst";
import type { Settings } from "./settings";
import { round2 } from "./format";

export interface InvoiceFormLine {
  description: string;
  hsn: string;
  qty: number;
  unit: string;
  rate: number;
  gstRate: number;
}

export interface InvoiceForm {
  id?: string;
  customerId: string;
  projectId: string;
  quoteId: string;
  /** yyyy-mm-dd */
  date: string;
  placeOfSupply: string;
  billName: string;
  billAddress: string;
  billGstin: string;
  shipSame: boolean;
  shipName: string;
  shipAddress: string;
  shipGstin: string;
  buyerOrderNo: string;
  buyerOrderDate: string;
  paymentTerms: string;
  terms: string;
  lines: InvoiceFormLine[];
}

export const invoiceFormSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1, "Choose a customer."),
  projectId: z.string().default(""),
  quoteId: z.string().default(""),
  date: z.string().min(8),
  placeOfSupply: z.string().min(1),
  billName: z.string().trim().min(1, "Bill-to name is required."),
  billAddress: z.string().trim().min(1, "Bill-to address is required."),
  billGstin: z.string().trim().default(""),
  shipSame: z.boolean().default(true),
  shipName: z.string().default(""),
  shipAddress: z.string().default(""),
  shipGstin: z.string().default(""),
  buyerOrderNo: z.string().default(""),
  buyerOrderDate: z.string().default(""),
  paymentTerms: z.string().default(""),
  terms: z.string().default(""),
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Every line needs a description."),
        hsn: z.string().trim().default(""),
        qty: z.coerce.number().positive("Quantity must be more than zero."),
        unit: z.string().trim().default("Nos"),
        rate: z.coerce.number().min(0),
        gstRate: z.coerce.number().min(0).max(40),
      }),
    )
    .min(1, "Add at least one line."),
});

export function toLineInputs(lines: InvoiceFormLine[]): LineInput[] {
  return lines.map((l) => ({ description: l.description, hsn: l.hsn || null, qty: l.qty, unit: l.unit, rate: l.rate, gstRate: l.gstRate }));
}

/** Two-line (supply + services) invoice from a GST-inclusive package price, as billed on existing Sanacara invoices. */
export function linesFromPackage(opts: {
  inclusiveAmount: number;
  kw: number;
  systemType: string;
  bom: { description: string; qty: string; uom: string }[];
  gst: Settings["gst"];
}): InvoiceFormLine[] {
  const { supply, service } = splitInclusivePackage(opts.inclusiveAmount, opts.gst);
  const kw = opts.kw > 0 ? opts.kw : 1;
  const bomText = opts.bom
    .map((b) => `${b.description.split("\n")[0].replace(/^Supply and Installation of /i, "").trim()} – ${b.qty} ${b.uom}`)
    .join("\n");
  return [
    {
      description: `Supply of Materials (${opts.systemType} Solar Power Plant)\nFor ${kw}kW Solar Plant\n${bomText}`,
      hsn: opts.gst.supplyHsn,
      qty: kw,
      unit: "KW",
      rate: round2(supply / kw),
      gstRate: opts.gst.supplyGstPct,
    },
    {
      description: `Installation, civil works & commissioning services\nFor ${kw}kW Solar Plant`,
      hsn: opts.gst.serviceHsn,
      qty: 1,
      unit: "SET",
      rate: service,
      gstRate: opts.gst.serviceGstPct,
    },
  ];
}
