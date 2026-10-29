import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { buildDefaultForm } from "@/lib/quote";
import { defaultInput, type CalcInput } from "@/lib/solar";
import { todayInput } from "@/lib/format";
import { saveQuote } from "../actions";
import { loadBuilderOptions } from "../loaders";
import QuoteBuilder from "../QuoteBuilder";

export const metadata: Metadata = { title: "New quotation" };
export const dynamic = "force-dynamic";

function parseCalc(raw: string | undefined, base: CalcInput): CalcInput | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (typeof j !== "object" || j === null) return null;
    const out: Record<string, unknown> = { ...base };
    for (const k of Object.keys(base)) {
      const v = (j as Record<string, unknown>)[k];
      if (typeof v === typeof (base as unknown as Record<string, unknown>)[k] || (v === null && k.endsWith("Override"))) out[k] = v;
      else if (typeof v === "number" && (k === "kwOverride" || k === "grossCostOverride")) out[k] = v;
    }
    return out as unknown as CalcInput;
  } catch {
    return null;
  }
}

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ customerId?: string; kw?: string; calc?: string }> }) {
  const sp = await searchParams;
  const [settings, opts] = await Promise.all([getSettings(), loadBuilderOptions()]);
  const calc = parseCalc(sp.calc, defaultInput(settings));
  const customer = opts.customers.find((c) => c.id === sp.customerId);
  const kwParam = Number(sp.kw);
  const initial = buildDefaultForm(settings, {
    customerId: customer?.id,
    kw: kwParam > 0 ? kwParam : undefined,
    calc,
    today: todayInput(),
    residential: customer ? customer.residential : true,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New quotation" subtitle="Defaults come from your last proposal format — adjust anything before saving." />
      <QuoteBuilder
        initial={initial}
        customers={opts.customers}
        items={opts.items}
        settings={{ solar: settings.solar, subsidy: settings.subsidy, gst: settings.gst, quoteDefaults: settings.quoteDefaults }}
        action={saveQuote}
        isEdit={false}
      />
    </div>
  );
}
