"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, Card, Field, Input, Label, SectionTitle, Select, Textarea } from "@/components/ui";
import { computeInvoice, GST_RATES } from "@/lib/gst";
import { toLineInputs, type InvoiceForm } from "@/lib/invoice";
import { amountInWords, formatINR2 } from "@/lib/format";
import { STATES } from "@/lib/states";
import type { ActionState } from "@/lib/form";
import { UOMS } from "@/lib/labels";

interface CustomerOpt {
  id: string;
  name: string;
  phone: string;
  address: string;
  gstin: string;
}
interface ProjectOpt {
  id: string;
  code: string;
  name: string;
  customerId: string;
}

export default function InvoiceBuilder({
  initial,
  customers,
  projects,
  homeStateCode,
  action,
  isEdit,
  quoteBasis,
}: {
  initial: InvoiceForm;
  customers: CustomerOpt[];
  projects: ProjectOpt[];
  homeStateCode: string;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  isEdit: boolean;
  quoteBasis?: React.ReactNode;
}) {
  const [f, setF] = useState<InvoiceForm>(initial);
  const [filter, setFilter] = useState("");
  const [state, formAction, pending] = useActionState(action, undefined);
  const set = <K extends keyof InvoiceForm>(k: K, v: InvoiceForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const setLine = (i: number, patch: Partial<InvoiceForm["lines"][number]>) => set("lines", f.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const intra = f.placeOfSupply === homeStateCode;
  const totals = useMemo(
    () => computeInvoice(toLineInputs(f.lines.map((l) => ({ ...l, qty: Number(l.qty) || 0, rate: Number(l.rate) || 0 }))), intra),
    [f.lines, intra],
  );

  const visible = useMemo(() => {
    const t = filter.trim().toLowerCase();
    const list = t ? customers.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(t)) : customers;
    const sel = customers.find((c) => c.id === f.customerId);
    return sel && !list.includes(sel) ? [sel, ...list.slice(0, 60)] : list.slice(0, 60);
  }, [customers, filter, f.customerId]);
  const custProjects = projects.filter((p) => p.customerId === f.customerId);

  function pickCustomer(id: string) {
    const c = customers.find((x) => x.id === id);
    setF((x) => ({
      ...x,
      customerId: id,
      projectId: projects.find((p) => p.id === x.projectId && p.customerId === id)?.id ?? "",
      billName: c ? c.name : x.billName,
      billAddress: c ? c.address : x.billAddress,
      billGstin: c ? c.gstin : x.billGstin,
    }));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="payload" value={JSON.stringify(f)} />
      {quoteBasis}

      <Card>
        <SectionTitle>Invoice details</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <Label>Customer *</Label>
            <Input placeholder="Search name / phone…" value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-1.5" />
            <Select value={f.customerId} onChange={(e) => pickCustomer(e.target.value)} required disabled={isEdit}>
              <option value="">— choose customer —</option>
              {visible.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone}
                </option>
              ))}
            </Select>
          </div>
          <Field label="Invoice date" className="sm:col-span-1">
            <Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} required />
          </Field>
          <Field label="Project" className="sm:col-span-2">
            <Select value={f.projectId} onChange={(e) => set("projectId", e.target.value)}>
              <option value="">— none —</option>
              {custProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Place of supply" className="sm:col-span-3">
            <Select value={f.placeOfSupply} onChange={(e) => set("placeOfSupply", e.target.value)}>
              {STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end text-xs text-muted sm:col-span-3">{intra ? "Same state → CGST + SGST" : "Other state → IGST"}</div>
          <Field label="Buyer’s order no." className="sm:col-span-3">
            <Input value={f.buyerOrderNo} onChange={(e) => set("buyerOrderNo", e.target.value)} />
          </Field>
          <Field label="Buyer’s order date" className="sm:col-span-3">
            <Input value={f.buyerOrderDate} onChange={(e) => set("buyerOrderDate", e.target.value)} placeholder="e.g. 14-July-26" />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionTitle>Bill to / Ship to</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-3">
            <Field label="Bill-to name *"><Input value={f.billName} onChange={(e) => set("billName", e.target.value)} required /></Field>
            <Field label="Address *"><Textarea rows={3} value={f.billAddress} onChange={(e) => set("billAddress", e.target.value)} required /></Field>
            <Field label="GSTIN" hint="if registered"><Input value={f.billGstin} onChange={(e) => set("billGstin", e.target.value.toUpperCase())} /></Field>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.shipSame} onChange={(e) => set("shipSame", e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" /> Ship-to is the same as bill-to
            </label>
            {!f.shipSame && (
              <>
                <Field label="Ship-to name"><Input value={f.shipName} onChange={(e) => set("shipName", e.target.value)} /></Field>
                <Field label="Address"><Textarea rows={3} value={f.shipAddress} onChange={(e) => set("shipAddress", e.target.value)} /></Field>
                <Field label="GSTIN"><Input value={f.shipGstin} onChange={(e) => set("shipGstin", e.target.value.toUpperCase())} /></Field>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle
          action={
            <Button type="button" variant="ghost" onClick={() => set("lines", [...f.lines, { description: "", hsn: "", qty: 1, unit: "Nos", rate: 0, gstRate: 18 }])}>
              + Add line
            </Button>
          }
        >
          Items
        </SectionTitle>
        <div className="space-y-3">
          {f.lines.map((l, i) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <Textarea rows={3} placeholder="Description of goods / services" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-12">
                <Field label="HSN/SAC" className="sm:col-span-2"><Input value={l.hsn} onChange={(e) => setLine(i, { hsn: e.target.value })} /></Field>
                <Field label="Qty" className="sm:col-span-2"><Input type="number" step="any" min="0" value={l.qty || ""} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} /></Field>
                <Field label="Unit" className="sm:col-span-2">
                  <Input list="uoms" value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} />
                </Field>
                <Field label="Rate (₹, ex-GST)" className="sm:col-span-3"><Input type="number" step="any" min="0" value={l.rate || ""} onChange={(e) => setLine(i, { rate: Number(e.target.value) })} /></Field>
                <Field label="GST %" className="sm:col-span-2">
                  <Select value={String(l.gstRate)} onChange={(e) => setLine(i, { gstRate: Number(e.target.value) })}>
                    {GST_RATES.map((r) => (<option key={r} value={r}>{r}%</option>))}
                  </Select>
                </Field>
                <div className="flex items-end justify-between sm:col-span-1">
                  <button type="button" onClick={() => set("lines", f.lines.filter((_, j) => j !== i))} className="px-1 py-2 text-xs text-danger" title="Remove line">✕</button>
                </div>
              </div>
              <div className="mt-1 text-right text-sm tabular-nums text-muted">Line amount {formatINR2((Number(l.qty) || 0) * (Number(l.rate) || 0))}</div>
            </div>
          ))}
        </div>
        <datalist id="uoms">{UOMS.map((u) => <option key={u} value={u} />)}</datalist>

        <div className="mt-4 ml-auto max-w-sm space-y-1 text-sm">
          <TotalRow label="Taxable value" value={formatINR2(totals.subtotal)} />
          {totals.rateRows.map((r) =>
            intra ? (
              <div key={r.rate}>
                <TotalRow label={`CGST @ ${r.rate / 2}%`} value={formatINR2(r.cgst)} muted />
                <TotalRow label={`SGST @ ${r.rate / 2}%`} value={formatINR2(r.sgst)} muted />
              </div>
            ) : (
              <TotalRow key={r.rate} label={`IGST @ ${r.rate}%`} value={formatINR2(r.igst)} muted />
            ),
          )}
          {totals.roundOff !== 0 && <TotalRow label="Round off" value={formatINR2(totals.roundOff)} muted />}
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatINR2(totals.total)}</span>
          </div>
          <div className="text-xs text-muted">{amountInWords(totals.total)}</div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Terms</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Payment terms"><Textarea rows={4} value={f.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} /></Field>
          <Field label="Terms & conditions"><Textarea rows={4} value={f.terms} onChange={(e) => set("terms", e.target.value)} /></Field>
        </div>
      </Card>

      {state?.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : isEdit ? "Save changes" : "Create invoice"}</Button>
        <span className="text-xs text-muted">All tax amounts are recalculated on the server when saved.</span>
      </div>
    </form>
  );
}

function TotalRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
