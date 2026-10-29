import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { linesFromPackage, type InvoiceForm } from "@/lib/invoice";
import { formatINR, todayInput } from "@/lib/format";
import { netPayable } from "@/lib/quote";
import { saveInvoice } from "../actions";
import { loadInvoiceOptions } from "../loaders";
import InvoiceBuilder from "../InvoiceBuilder";

export const metadata: Metadata = { title: "New invoice" };
export const dynamic = "force-dynamic";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ quoteId?: string; projectId?: string; customerId?: string; basis?: string }> }) {
  const sp = await searchParams;
  const [settings, opts] = await Promise.all([getSettings(), loadInvoiceOptions()]);

  const project = sp.projectId ? await prisma.project.findUnique({ where: { id: sp.projectId }, include: { quote: { include: { lines: { orderBy: { sort: "asc" } } } } } }) : null;
  const quoteId = sp.quoteId ?? project?.quoteId ?? undefined;
  const quote = quoteId
    ? (project?.quote && project.quote.id === quoteId ? project.quote : await prisma.quote.findUnique({ where: { id: quoteId }, include: { lines: { orderBy: { sort: "asc" } } } }))
    : null;
  const linkedProject = project ?? (quote ? await prisma.project.findFirst({ where: { quoteId: quote.id }, orderBy: { createdAt: "desc" } }) : null);

  const customerId = project?.customerId ?? quote?.customerId ?? sp.customerId ?? "";
  const c = opts.customers.find((x) => x.id === customerId);
  const basisTotal = sp.basis === "total";
  const amount = quote ? (basisTotal ? quote.totalAmount : netPayable(quote)) : 0;

  const initial: InvoiceForm = {
    customerId,
    projectId: linkedProject?.id ?? "",
    quoteId: quote?.id ?? "",
    date: todayInput(),
    placeOfSupply: settings.company.stateCode,
    billName: c?.name ?? "",
    billAddress: c?.address ?? "",
    billGstin: c?.gstin ?? "",
    shipSame: true,
    shipName: "",
    shipAddress: "",
    shipGstin: "",
    buyerOrderNo: "",
    buyerOrderDate: "",
    paymentTerms: settings.invoiceDefaults.paymentTerms,
    terms: settings.invoiceDefaults.terms,
    lines: quote
      ? linesFromPackage({ inclusiveAmount: amount, kw: quote.systemKw, systemType: quote.systemType, bom: quote.lines, gst: settings.gst })
      : [{ description: "", hsn: settings.gst.supplyHsn, qty: 1, unit: "Nos", rate: 0, gstRate: settings.gst.supplyGstPct }],
  };

  const basis = quote ? (
    <div className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
      Pre-filled from quotation <b>{quote.number}</b>, treating{" "}
      <b>{formatINR(amount)}</b> ({basisTotal ? "total plant cost" : "net payable after subsidy"}) as GST-inclusive and splitting it{" "}
      {settings.gst.supplySharePct}% supply @ {settings.gst.supplyGstPct}% / {100 - settings.gst.supplySharePct}% services @ {settings.gst.serviceGstPct}%.{" "}
      <Link href={`/invoices/new?quoteId=${quote.id}&basis=${basisTotal ? "net" : "total"}`} className="font-medium text-brand">
        Use {basisTotal ? `net payable (${formatINR(netPayable(quote))})` : `total cost (${formatINR(quote.totalAmount)})`} instead
      </Link>
      . Edit any line below.
    </div>
  ) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New tax invoice" subtitle="The invoice number is assigned from your series when you save." />
      <InvoiceBuilder key={`${quote?.id}-${basisTotal}`} initial={initial} customers={opts.customers} projects={opts.projects} homeStateCode={settings.company.stateCode} action={saveInvoice} isEdit={false} quoteBasis={basis} />
    </div>
  );
}
