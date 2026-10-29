"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, Card, Field, Input, Label, Select, SectionTitle, Textarea } from "@/components/ui";
import { bomCost, gstFactor, netPayable, quoteScope, quoteTitle, defaultBom, type QuoteForm, type QuoteFormLine } from "@/lib/quote";
import { calculateSolar, subsidyFor } from "@/lib/solar";
import { formatINR, formatNum } from "@/lib/format";
import type { Settings } from "@/lib/settings";
import type { ActionState } from "@/lib/form";
import { UOMS } from "@/lib/labels";

interface CustomerOpt {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  residential: boolean;
}
interface ItemOpt {
  id: string;
  sku: string;
  name: string;
  uom: string;
  costPrice: number;
  make: string | null;
}

type SettingsLite = Pick<Settings, "solar" | "subsidy" | "gst" | "quoteDefaults">;

export default function QuoteBuilder({
  initial,
  customers,
  items,
  settings,
  action,
  isEdit,
}: {
  initial: QuoteForm;
  customers: CustomerOpt[];
  items: ItemOpt[];
  settings: SettingsLite;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  isEdit: boolean;
}) {
  const [form, setForm] = useState<QuoteForm>(initial);
  const [filter, setFilter] = useState("");
  const [state, formAction, pending] = useActionState(action, undefined);

  const set = <K extends keyof QuoteForm>(k: K, v: QuoteForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setLine = (i: number, patch: Partial<QuoteFormLine>) => set("lines", form.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const customer = customers.find((c) => c.id === form.customerId);
  const visible = useMemo(() => {
    const t = filter.trim().toLowerCase();
    const list = t ? customers.filter((c) => `${c.name} ${c.phone} ${c.city ?? ""}`.toLowerCase().includes(t)) : customers;
    const sel = customers.find((c) => c.id === form.customerId);
    return sel && !list.includes(sel) ? [sel, ...list.slice(0, 60)] : list.slice(0, 60);
  }, [customers, filter, form.customerId]);

  const net = netPayable(form);
  const cost = bomCost(form.lines.map((l) => ({ qty: l.qty, unitCost: l.unitCost })));
  const revenueExGst = net / gstFactor(settings.gst);
  const margin = revenueExGst - cost;
  const termsTotal = form.paymentTerms.reduce((s, t) => s + (Number(t.percent) || 0), 0);

  function applySize(kw: number) {
    const sub = customer && !customer.residential ? { central: 0, state: 0 } : subsidyFor(kw, settings.subsidy);
    const gross = form.calc ? calculateSolar({ ...form.calc, kwOverride: kw }, settings.subsidy).grossCost : Math.round(kw * settings.solar.costPerKw);
    setForm((f) => ({
      ...f,
      systemKw: kw,
      title: quoteTitle(kw, f.systemType),
      scopeText: quoteScope(kw),
      lines: defaultBom(kw, settings.solar.panelWp),
      totalAmount: gross,
      subsidyCentral: sub.central,
      subsidyState: sub.state,
    }));
  }

  function recalcSubsidy() {
    const sub = customer && !customer.residential ? { central: 0, state: 0 } : subsidyFor(form.systemKw, settings.subsidy);
    setForm((f) => ({ ...f, subsidyCentral: sub.central, subsidyState: sub.state }));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="payload" value={JSON.stringify(form)} />

      <Card>
        <SectionTitle>Customer & system</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <Label>Customer *</Label>
            <Input placeholder="Search name / phone…" value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-1.5" />
            <Select value={form.customerId} onChange={(e) => set("customerId", e.target.value)} required>
              <option value="">— choose customer —</option>
              {visible.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone}
                  {c.city ? ` · ${c.city}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <Field label="Date" className="sm:col-span-1">
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
          </Field>
          <Field label="Valid for (days)" className="sm:col-span-1">
            <Input type="number" min="1" value={form.validityDays} onChange={(e) => set("validityDays", Number(e.target.value))} />
          </Field>
          <Field label="Type" className="sm:col-span-1">
            <Select
              value={form.systemType}
              onChange={(e) => setForm((f) => ({ ...f, systemType: e.target.value, title: quoteTitle(f.systemKw, e.target.value) }))}
            >
              {["On-Grid", "Hybrid", "Off-Grid"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="System size (kW) *" className="sm:col-span-2">
            <Input type="number" step="0.5" min="0.5" value={form.systemKw || ""} onChange={(e) => set("systemKw", Number(e.target.value))} required />
          </Field>
          <div className="flex items-end sm:col-span-4">
            <Button type="button" variant="secondary" onClick={() => applySize(form.systemKw)} disabled={!(form.systemKw > 0)}>
              Reset BOM, scope & price for {form.systemKw || "—"} kW
            </Button>
          </div>
          <Field label="Proposal title" className="sm:col-span-6">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionTitle
          action={
            <Button type="button" variant="ghost" onClick={() => set("lines", [...form.lines, { description: "", uom: "Nos", qty: "1", itemId: null, unitCost: 0 }])}>
              + Add line
            </Button>
          }
        >
          Bill of materials
        </SectionTitle>
        <div className="space-y-3">
          {form.lines.map((l, i) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <div className="grid gap-2 sm:grid-cols-12">
                <div className="sm:col-span-1 flex items-center text-sm font-medium text-muted">#{i + 1}</div>
                <Textarea className="sm:col-span-7" rows={2} placeholder="Particulars" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                <Select className="sm:col-span-2" value={l.uom} onChange={(e) => setLine(i, { uom: e.target.value })}>
                  {UOMS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </Select>
                <Input className="sm:col-span-2" placeholder="Qty" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-12">
                <div className="sm:col-span-7 sm:col-start-2">
                  <Select
                    value={l.itemId ?? ""}
                    onChange={(e) => {
                      const it = items.find((x) => x.id === e.target.value);
                      setLine(i, it ? { itemId: it.id, unitCost: it.costPrice, uom: l.uom || it.uom } : { itemId: null });
                    }}
                  >
                    <option value="">Link inventory item (optional, for costing)…</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name}
                        {it.make ? ` · ${it.make}` : ""} ({it.sku})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="sm:col-span-3">
                  <Input type="number" min="0" step="any" placeholder="Our cost / unit ₹" value={l.unitCost || ""} onChange={(e) => setLine(i, { unitCost: Number(e.target.value) })} />
                </div>
                <div className="sm:col-span-1 text-right">
                  <button type="button" onClick={() => set("lines", form.lines.filter((_, j) => j !== i))} className="rounded-md px-2 py-2 text-xs text-danger hover:bg-danger-soft">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Cost per unit is internal — it never appears on the customer’s PDF. Linking an item pulls its current average cost.</p>
      </Card>

      <Card>
        <SectionTitle action={<Button type="button" variant="ghost" onClick={() => set("makes", [...form.makes, { item: "", makes: "" }])}>+ Add row</Button>}>Makes of items</SectionTitle>
        <div className="space-y-2">
          {form.makes.map((m, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input className="col-span-4" placeholder="Item" value={m.item} onChange={(e) => set("makes", form.makes.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)))} />
              <Input className="col-span-7" placeholder="Makes" value={m.makes} onChange={(e) => set("makes", form.makes.map((x, j) => (j === i ? { ...x, makes: e.target.value } : x)))} />
              <button type="button" onClick={() => set("makes", form.makes.filter((_, j) => j !== i))} className="col-span-1 text-xs text-danger">
                ✕
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Commercial proposal</SectionTitle>
        <Field label="Particulars (as shown in the commercial table)">
          <Textarea rows={4} value={form.scopeText} onChange={(e) => set("scopeText", e.target.value)} />
        </Field>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <Field label="Total amount (₹) *">
            <Input type="number" min="0" step="any" value={form.totalAmount || ""} onChange={(e) => set("totalAmount", Number(e.target.value))} required />
          </Field>
          <Field label="Central subsidy (₹)">
            <Input type="number" min="0" value={form.subsidyCentral || ""} onChange={(e) => set("subsidyCentral", Number(e.target.value))} />
          </Field>
          <Field label="State subsidy (₹)">
            <Input type="number" min="0" value={form.subsidyState || ""} onChange={(e) => set("subsidyState", Number(e.target.value))} />
          </Field>
          <div className="flex items-end">
            <Button type="button" variant="secondary" onClick={recalcSubsidy}>
              Auto subsidy
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 rounded-lg bg-surface-2 p-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted">Net payable by customer</div>
            <div className="text-lg font-semibold tabular-nums text-brand-strong">{formatINR(net)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Our BOM cost (ex-GST)</div>
            <div className="text-lg font-semibold tabular-nums">{cost > 0 ? formatINR(cost) : "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Est. margin on net payable</div>
            <div className={`text-lg font-semibold tabular-nums ${margin < 0 ? "text-danger" : ""}`}>
              {cost > 0 ? `${formatINR(margin)} (${((margin / Math.max(1, revenueExGst)) * 100).toFixed(0)}%)` : "—"}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Terms & conditions</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label hint={`${formatNum(termsTotal)}%`}>Payment terms</Label>
            <div className="space-y-2">
              {form.paymentTerms.map((t, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input className="col-span-3 sm:col-span-2" type="number" min="0" max="100" value={t.percent} onChange={(e) => set("paymentTerms", form.paymentTerms.map((x, j) => (j === i ? { ...x, percent: Number(e.target.value) } : x)))} />
                  <Input className="col-span-8 sm:col-span-9" value={t.label} onChange={(e) => set("paymentTerms", form.paymentTerms.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <button type="button" className="col-span-1 text-xs text-danger" onClick={() => set("paymentTerms", form.paymentTerms.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="mt-2 text-xs font-medium text-brand" onClick={() => set("paymentTerms", [...form.paymentTerms, { label: "", percent: 0 }])}>
              + Add milestone
            </button>
            {termsTotal !== 100 && form.paymentTerms.length > 0 && <p className="mt-1 text-xs text-sun">Milestones add up to {formatNum(termsTotal)}%, not 100%.</p>}
          </div>
          <Field label="Warranty">
            <Textarea rows={3} value={form.warranty} onChange={(e) => set("warranty", e.target.value)} />
          </Field>
          <Field label="Performance ratio">
            <Textarea rows={3} value={form.performanceRatio} onChange={(e) => set("performanceRatio", e.target.value)} />
          </Field>
          <Field label="Project timeline">
            <Textarea rows={3} value={form.timeline} onChange={(e) => set("timeline", e.target.value)} />
          </Field>
          <Field label="Other activities / exclusions">
            <Textarea rows={3} value={form.otherTerms} onChange={(e) => set("otherTerms", e.target.value)} />
          </Field>
          <Field label="Documents required for subsidy (one per line)" className="sm:col-span-2">
            <Textarea rows={4} value={form.subsidyDocs.join("\n")} onChange={(e) => set("subsidyDocs", e.target.value.split("\n"))} />
          </Field>
          <Field label="Internal notes (not printed)" className="sm:col-span-2">
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        {form.calc && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.includeSavings} onChange={(e) => set("includeSavings", e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
            Include the “Your savings” page from the calculator (generation, payback, 25-year savings)
          </label>
        )}
      </Card>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create quotation"}
        </Button>
        <span className="text-xs text-muted">{isEdit ? "The quotation number stays the same." : "The next number in the series is assigned automatically."}</span>
      </div>
    </form>
  );
}
