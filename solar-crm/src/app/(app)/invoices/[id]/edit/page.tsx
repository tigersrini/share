import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import type { InvoiceForm } from "@/lib/invoice";
import { toDateInput } from "@/lib/format";
import { saveInvoice } from "../../actions";
import { loadInvoiceOptions } from "../../loaders";
import InvoiceBuilder from "../../InvoiceBuilder";

export const metadata: Metadata = { title: "Edit invoice" };
export const dynamic = "force-dynamic";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [inv, settings, opts] = await Promise.all([
    prisma.invoice.findUnique({ where: { id }, include: { lines: { orderBy: { sort: "asc" } } } }),
    getSettings(),
    loadInvoiceOptions(),
  ]);
  if (!inv) notFound();
  if (inv.status === "CANCELLED") redirect(`/invoices/${id}`);

  const initial: InvoiceForm = {
    id: inv.id,
    customerId: inv.customerId,
    projectId: inv.projectId ?? "",
    quoteId: inv.quoteId ?? "",
    date: toDateInput(inv.date),
    placeOfSupply: inv.placeOfSupply,
    billName: inv.billName,
    billAddress: inv.billAddress,
    billGstin: inv.billGstin ?? "",
    shipSame: !inv.shipName && !inv.shipAddress,
    shipName: inv.shipName ?? "",
    shipAddress: inv.shipAddress ?? "",
    shipGstin: inv.shipGstin ?? "",
    buyerOrderNo: inv.buyerOrderNo ?? "",
    buyerOrderDate: inv.buyerOrderDate ?? "",
    paymentTerms: inv.paymentTerms ?? "",
    terms: inv.terms ?? "",
    lines: inv.lines.map((l) => ({ description: l.description, hsn: l.hsn ?? "", qty: l.qty, unit: l.unit, rate: l.rate, gstRate: l.gstRate })),
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={`Edit invoice ${inv.number}`} subtitle="The number stays the same. Keep GST filings in mind before changing an invoice that was already shared." />
      <InvoiceBuilder initial={initial} customers={opts.customers} projects={opts.projects} homeStateCode={settings.company.stateCode} action={saveInvoice} isEdit />
    </div>
  );
}
