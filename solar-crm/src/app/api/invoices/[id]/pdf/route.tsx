import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { amountInWords, formatDateDots } from "@/lib/format";
import { computeInvoice } from "@/lib/gst";
import { stateName } from "@/lib/states";
import InvoiceDocument, { type InvoicePdfData } from "@/lib/pdf/InvoiceDocument";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [inv, settings] = await Promise.all([
    prisma.invoice.findUnique({ where: { id }, include: { lines: { orderBy: { sort: "asc" } } } }),
    getSettings(),
  ]);
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const intra = inv.placeOfSupply === settings.company.stateCode;
  const totals = computeInvoice(
    inv.lines.map((l) => ({ description: l.description, hsn: l.hsn, qty: l.qty, unit: l.unit, rate: l.rate, gstRate: l.gstRate })),
    intra,
  );
  const data: InvoicePdfData = {
    number: inv.number,
    date: formatDateDots(inv.date),
    company: settings.company,
    bank: settings.bank,
    intra,
    placeOfSupplyName: stateName(inv.placeOfSupply),
    placeOfSupplyCode: inv.placeOfSupply,
    buyerOrderNo: inv.buyerOrderNo,
    buyerOrderDate: inv.buyerOrderDate,
    paymentTerms: inv.paymentTerms,
    terms: inv.terms,
    billName: inv.billName,
    billAddress: inv.billAddress,
    billGstin: inv.billGstin,
    shipName: inv.shipName,
    shipAddress: inv.shipAddress,
    shipGstin: inv.shipGstin,
    totals,
    totalInWords: amountInWords(totals.total),
    taxInWords: amountInWords(totals.totalTax).replace(/ Only$/, " only"),
    cancelled: inv.status === "CANCELLED",
  };
  const buffer = await renderToBuffer(<InvoiceDocument d={data} />);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Invoice-${inv.number.replace(/\//g, "-")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
