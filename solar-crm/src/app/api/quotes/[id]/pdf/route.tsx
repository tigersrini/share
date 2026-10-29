import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSettings, type MakeRow, type PaymentTermRow } from "@/lib/settings";
import { formatDateDots } from "@/lib/format";
import { calculateSolar, defaultInput, type CalcInput } from "@/lib/solar";
import { netPayable } from "@/lib/quote";
import QuoteDocument, { type QuotePdfData } from "@/lib/pdf/QuoteDocument";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [q, settings] = await Promise.all([
    prisma.quote.findUnique({ where: { id }, include: { customer: true, lines: { orderBy: { sort: "asc" } } } }),
    getSettings(),
  ]);
  if (!q) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

  let savings: QuotePdfData["savings"] = null;
  if (q.includeSavings && q.calc) {
    const input = { ...defaultInput(settings), ...(q.calc as unknown as CalcInput), kwOverride: q.systemKw, grossCostOverride: q.totalAmount };
    savings = { ...calculateSolar(input, settings.subsidy), tariff: input.tariff, monthlyUnits: input.monthlyUnits };
    // The quote's own (possibly hand-edited) subsidy and price win over the calculator's.
    const net = netPayable(q);
    savings.grossCost = q.totalAmount;
    savings.subsidyCentral = q.subsidyCentral;
    savings.subsidyState = q.subsidyState;
    savings.netCost = net;
    const re = calculateSolar({ ...input, subsidyEligible: false, grossCostOverride: Math.max(1, net) }, settings.subsidy);
    savings.paybackYears = re.paybackYears;
  }

  const c = q.customer;
  const data: QuotePdfData = {
    number: q.number,
    date: formatDateDots(q.date),
    customerName: c.name,
    customerAddress: [c.address, [c.city, c.pincode].filter(Boolean).join(" ")].filter(Boolean).join("\n"),
    title: q.title,
    systemKw: q.systemKw,
    systemType: q.systemType,
    company: settings.company,
    bank: settings.bank,
    lines: q.lines.map((l) => ({ description: l.description, uom: l.uom, qty: l.qty })),
    makes: q.makes as unknown as MakeRow[],
    scopeText: q.scopeText,
    total: q.totalAmount,
    subsidyCentral: q.subsidyCentral,
    subsidyState: q.subsidyState,
    net: netPayable(q),
    paymentTerms: q.paymentTerms as unknown as PaymentTermRow[],
    warranty: q.warranty,
    performanceRatio: q.performanceRatio,
    timeline: q.timeline,
    otherTerms: q.otherTerms,
    validityDays: q.validityDays,
    subsidyDocs: q.subsidyDocs as unknown as string[],
    savings,
  };

  const buffer = await renderToBuffer(<QuoteDocument d={data} />);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${q.number.replace(/\//g, "-")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
