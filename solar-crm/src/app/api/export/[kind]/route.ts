import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { csvResponse } from "@/lib/csv";
import { computeInvoice } from "@/lib/gst";
import { financialYearStart, formatDate, startOfMonth } from "@/lib/format";
import { EXPENSE_LABEL, ITEM_CATEGORY_LABEL, PAYMENT_MODE_LABEL } from "@/lib/labels";

export const runtime = "nodejs";

function rangeStart(range: string | null): Date | undefined {
  if (range === "month") return startOfMonth();
  if (range === "fy") return financialYearStart();
  return undefined;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const from = rangeStart(req.nextUrl.searchParams.get("range"));
  const stamp = new Date().toISOString().slice(0, 10);

  if (kind === "stock") {
    const items = await prisma.item.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
    return csvResponse(`stock-${stamp}.csv`, [
      ["SKU", "Name", "Category", "Make", "Spec", "Unit", "HSN", "GST %", "On hand", "Avg cost", "Sell price", "Stock value (cost)", "Reorder level", "Active"],
      ...items.map((i) => [i.sku, i.name, ITEM_CATEGORY_LABEL[i.category], i.make, i.spec, i.uom, i.hsn, i.gstRate, i.quantity, i.costPrice, i.sellPrice, Math.round(i.quantity * i.costPrice * 100) / 100, i.reorderLevel, i.active ? "Yes" : "No"]),
    ]);
  }

  if (kind === "expenses") {
    const rows = await prisma.expense.findMany({ where: from ? { date: { gte: from } } : {}, orderBy: { date: "desc" }, include: { project: { select: { code: true } } } });
    return csvResponse(`expenses-${stamp}.csv`, [
      ["Date", "Category", "Paid to", "Amount", "Mode", "Project", "Note"],
      ...rows.map((e) => [formatDate(e.date), EXPENSE_LABEL[e.category], e.vendor, e.amount, e.mode ? PAYMENT_MODE_LABEL[e.mode] : "", e.project?.code ?? "Overhead", e.note]),
    ]);
  }

  if (kind === "invoices") {
    const settings = await getSettings();
    const rows = await prisma.invoice.findMany({ where: from ? { date: { gte: from } } : {}, orderBy: { date: "asc" }, include: { lines: { orderBy: { sort: "asc" } } } });
    return csvResponse(`gst-sales-register-${stamp}.csv`, [
      ["Invoice no.", "Date", "Customer", "GSTIN", "Place of supply", "Status", "HSN/SAC", "Rate %", "Taxable value", "CGST", "SGST", "IGST", "Invoice total"],
      ...rows.flatMap((i) => {
        const t = computeInvoice(i.lines.map((l) => ({ description: l.description, hsn: l.hsn, qty: l.qty, unit: l.unit, rate: l.rate, gstRate: l.gstRate })), i.placeOfSupply === settings.company.stateCode);
        return t.hsnRows.map((h, idx) => [i.number, formatDate(i.date), i.billName, i.billGstin, i.placeOfSupply, i.status, h.hsn, h.rate, h.taxable, h.cgst, h.sgst, h.igst, idx === 0 ? i.total : ""]);
      }),
    ]);
  }

  if (kind === "payments") {
    const rows = await prisma.payment.findMany({ where: from ? { date: { gte: from } } : {}, orderBy: { date: "desc" }, include: { customer: { select: { name: true } }, project: { select: { code: true } }, invoice: { select: { number: true } } } });
    return csvResponse(`payments-${stamp}.csv`, [
      ["Date", "Customer", "Amount", "Mode", "Reference", "Project", "Invoice"],
      ...rows.map((p) => [formatDate(p.date), p.customer.name, p.amount, PAYMENT_MODE_LABEL[p.mode], p.reference, p.project?.code, p.invoice?.number]),
    ]);
  }

  return NextResponse.json({ error: "Unknown export" }, { status: 404 });
}
