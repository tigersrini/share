import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import ActionForm from "@/components/ActionForm";
import { Card, EmptyState, Field, Input, LinkButton, PageHeader, SectionTitle, Textarea } from "@/components/ui";
import { financialYear } from "@/lib/format";
import { saveSettingsAction } from "./actions";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    return (
      <Card>
        <EmptyState>Settings can only be changed by an admin.</EmptyState>
      </Card>
    );
  }
  const s = await getSettings();
  const fy = financialYear();
  const [q, i] = await Promise.all([prisma.counter.findUnique({ where: { key: `quote:${fy}` } }), prisma.counter.findUnique({ where: { key: `invoice:${fy}` } })]);
  const n = (name: string, label: string, value: number, hint?: string, step = "any") => (
    <Field label={label} hint={hint}>
      <Input name={name} type="number" step={step} defaultValue={value} />
    </Field>
  );
  const t = (name: string, label: string, value: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <Input name={name} defaultValue={value} />
    </Field>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" subtitle="Company profile, tax, numbering and the defaults used on new quotations" actions={<LinkButton href="/settings/users">Staff accounts</LinkButton>} />
      <ActionForm action={saveSettingsAction} submitLabel="Save settings" pendingLabel="Saving…">
        <div className="space-y-4">
          <Card>
            <SectionTitle>Company (printed on quotations & invoices)</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {t("company.name", "Trading name", s.company.name)}
              {t("company.legalName", "Legal name (on invoices)", s.company.legalName)}
              {t("company.tagline", "Tagline", s.company.tagline)}
              {t("company.signatory", "Signatory (on proposal letter)", s.company.signatory)}
              <Field label="Address" className="sm:col-span-2"><Textarea name="company.address" rows={2} defaultValue={s.company.address} /></Field>
              {t("company.phone", "Phone", s.company.phone)}
              {t("company.email", "Email", s.company.email)}
              {t("company.website", "Website", s.company.website)}
              {t("company.gstin", "GSTIN", s.company.gstin)}
              {t("company.state", "State", s.company.state)}
              {t("company.stateCode", "State code", s.company.stateCode, "decides CGST+SGST vs IGST")}
            </div>
          </Card>

          <Card>
            <SectionTitle>Bank details</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {t("bank.name", "Bank", s.bank.name)}
              {t("bank.branch", "Branch", s.bank.branch)}
              {t("bank.ifsc", "IFSC", s.bank.ifsc)}
              {t("bank.accountNo", "Account number", s.bank.accountNo)}
              {t("bank.beneficiary", "Beneficiary", s.bank.beneficiary)}
            </div>
          </Card>

          <Card>
            <SectionTitle>Document numbering</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {t("numbering.quotePrefix", "Quotation prefix", s.numbering.quotePrefix, `→ ${s.numbering.quotePrefix}/${fy}/023`)}
              {n("numbering.nextQuote", `Next quotation number (FY ${fy})`, (q?.value ?? 0) + 1, undefined, "1")}
              {t("numbering.invoicePrefix", "Invoice prefix", s.numbering.invoicePrefix, `→ ${s.numbering.invoicePrefix}/${fy}/014`)}
              {n("numbering.nextInvoice", `Next invoice number (FY ${fy})`, (i?.value ?? 0) + 1, undefined, "1")}
            </div>
            <p className="mt-2 text-xs text-muted">Numbers restart from 1 each April (financial year). Change the “next number” only to continue from existing paper records.</p>
          </Card>

          <Card>
            <SectionTitle>Solar calculator defaults</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-4">
              {n("solar.tariff", "Avg tariff ₹/unit", s.solar.tariff)}
              {n("solar.yieldPerKwDay", "Yield kWh/kW/day", s.solar.yieldPerKwDay)}
              {n("solar.panelWp", "Panel Wp", s.solar.panelWp)}
              {n("solar.areaPerKwSqft", "Roof sq ft per kW", s.solar.areaPerKwSqft)}
              {n("solar.costPerKw", "Price per kW ₹", s.solar.costPerKw)}
              {n("solar.tariffEscalationPct", "Tariff rise %/yr", s.solar.tariffEscalationPct)}
              {n("solar.degradationPct", "Degradation %/yr", s.solar.degradationPct)}
              {n("solar.co2PerUnit", "kg CO₂ per unit", s.solar.co2PerUnit)}
            </div>
          </Card>

          <Card>
            <SectionTitle>Subsidy rules</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              {n("subsidy.centralFirst2PerKw", "Central ₹/kW (first 2 kW)", s.subsidy.centralFirst2PerKw)}
              {n("subsidy.central3rdKw", "Central ₹ for 3rd kW", s.subsidy.central3rdKw)}
              {n("subsidy.centralCap", "Central cap ₹", s.subsidy.centralCap)}
              {n("subsidy.stateAmount", "State top-up ₹ (flat)", s.subsidy.stateAmount)}
              {n("subsidy.stateMinKw", "State top-up from (kW)", s.subsidy.stateMinKw)}
            </div>
            <p className="mt-2 text-xs text-muted">Defaults follow PM Surya Ghar (₹30,000/kW up to 2 kW + ₹18,000 for the 3rd kW, max ₹78,000) and the ₹22,000 state amount on your last proposal. Verify against current scheme rules.</p>
          </Card>

          <Card>
            <SectionTitle>GST on solar packages</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-5">
              {n("gst.supplySharePct", "Supply share %", s.gst.supplySharePct)}
              {n("gst.supplyGstPct", "Supply GST %", s.gst.supplyGstPct)}
              {n("gst.serviceGstPct", "Service GST %", s.gst.serviceGstPct)}
              {t("gst.supplyHsn", "Supply HSN", s.gst.supplyHsn)}
              {t("gst.serviceHsn", "Service HSN/SAC", s.gst.serviceHsn)}
            </div>
            <p className="mt-2 text-xs text-muted">Used to split a GST-inclusive package price into goods and services when creating an invoice from a quotation, and to estimate ex-GST revenue/margin.</p>
          </Card>

          <Card>
            <SectionTitle>New-quotation defaults</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {n("quote.validityDays", "Validity (days)", s.quoteDefaults.validityDays, undefined, "1")}
              <Field label="System type"><Input name="quote.systemType" defaultValue={s.quoteDefaults.systemType} list="systypes" /><datalist id="systypes"><option value="On-Grid" /><option value="Hybrid" /><option value="Off-Grid" /></datalist></Field>
              <Field label="Warranty"><Textarea name="quote.warranty" rows={3} defaultValue={s.quoteDefaults.warranty} /></Field>
              <Field label="Performance ratio"><Textarea name="quote.performanceRatio" rows={3} defaultValue={s.quoteDefaults.performanceRatio} /></Field>
              <Field label="Project timeline"><Textarea name="quote.timeline" rows={3} defaultValue={s.quoteDefaults.timeline} /></Field>
              <Field label="Other activities / exclusions"><Textarea name="quote.otherTerms" rows={3} defaultValue={s.quoteDefaults.otherTerms} /></Field>
              <Field label="Payment milestones" hint="percent | description"><Textarea name="quote.paymentTerms" rows={4} defaultValue={s.quoteDefaults.paymentTerms.map((p) => `${p.percent} | ${p.label}`).join("\n")} /></Field>
              <Field label="Makes of items" hint="item | makes"><Textarea name="quote.makes" rows={4} defaultValue={s.quoteDefaults.makes.map((m) => `${m.item} | ${m.makes}`).join("\n")} /></Field>
              <Field label="Subsidy documents (one per line)" className="sm:col-span-2"><Textarea name="quote.subsidyDocs" rows={4} defaultValue={s.quoteDefaults.subsidyDocs.join("\n")} /></Field>
            </div>
          </Card>

          <Card>
            <SectionTitle>New-invoice defaults</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Payment terms"><Textarea name="invoice.paymentTerms" rows={4} defaultValue={s.invoiceDefaults.paymentTerms} /></Field>
              <Field label="Terms & conditions"><Textarea name="invoice.terms" rows={4} defaultValue={s.invoiceDefaults.terms} /></Field>
            </div>
          </Card>
        </div>
      </ActionForm>
      <p className="mt-6 text-xs text-muted">
        Looking for your own password? <Link href="/account" className="text-brand">My account</Link>
      </p>
    </div>
  );
}
