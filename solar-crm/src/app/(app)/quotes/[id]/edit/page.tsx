import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings, type MakeRow, type PaymentTermRow } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import type { QuoteForm } from "@/lib/quote";
import type { CalcInput } from "@/lib/solar";
import { toDateInput } from "@/lib/format";
import { saveQuote } from "../../actions";
import { loadBuilderOptions } from "../../loaders";
import QuoteBuilder from "../../QuoteBuilder";

export const metadata: Metadata = { title: "Edit quotation" };
export const dynamic = "force-dynamic";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [q, settings, opts] = await Promise.all([
    prisma.quote.findUnique({ where: { id }, include: { lines: { orderBy: { sort: "asc" } } } }),
    getSettings(),
    loadBuilderOptions(),
  ]);
  if (!q) notFound();

  const initial: QuoteForm = {
    id: q.id,
    customerId: q.customerId,
    date: toDateInput(q.date),
    validityDays: q.validityDays,
    title: q.title,
    systemKw: q.systemKw,
    systemType: q.systemType,
    lines: q.lines.map((l) => ({ description: l.description, uom: l.uom, qty: l.qty, itemId: l.itemId, unitCost: l.unitCost })),
    makes: q.makes as unknown as MakeRow[],
    scopeText: q.scopeText,
    totalAmount: q.totalAmount,
    subsidyCentral: q.subsidyCentral,
    subsidyState: q.subsidyState,
    paymentTerms: q.paymentTerms as unknown as PaymentTermRow[],
    subsidyDocs: q.subsidyDocs as unknown as string[],
    warranty: q.warranty,
    performanceRatio: q.performanceRatio,
    timeline: q.timeline,
    otherTerms: q.otherTerms,
    notes: q.notes ?? "",
    includeSavings: q.includeSavings,
    calc: (q.calc as unknown as CalcInput | null) ?? null,
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={`Edit ${q.number}`} subtitle={q.status === "DRAFT" ? "Draft" : "This quotation was already sent — consider making a new revision instead."} />
      <QuoteBuilder
        initial={initial}
        customers={opts.customers}
        items={opts.items}
        settings={{ solar: settings.solar, subsidy: settings.subsidy, gst: settings.gst, quoteDefaults: settings.quoteDefaults }}
        action={saveQuote}
        isEdit
      />
    </div>
  );
}
