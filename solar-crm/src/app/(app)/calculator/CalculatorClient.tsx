"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LineChart } from "@/components/Charts";
import { Button, Card, Field, Input, ProgressBar, SectionTitle } from "@/components/ui";
import { calculateSolar, defaultInput, unitsFromBill, type CalcInput } from "@/lib/solar";
import { formatINR, formatINRShort, formatNum, whatsAppLink } from "@/lib/format";
import type { Settings } from "@/lib/settings";

interface Props {
  settings: { solar: Settings["solar"]; subsidy: Settings["subsidy"]; company: { name: string; phone: string } };
  customer: { id: string; name: string; phone: string; monthlyUnits: number | null; monthlyBill: number | null; expectedKw: number | null; residential: boolean } | null;
}

export default function CalculatorClient({ settings, customer }: Props) {
  const base = useMemo(() => defaultInput({ solar: settings.solar } as Settings), [settings.solar]);
  const startUnits = customer?.monthlyUnits ?? (customer?.monthlyBill ? unitsFromBill(customer.monthlyBill, settings.solar.tariff) : 0);

  const [mode, setMode] = useState<"units" | "bill">("units");
  const [units, setUnits] = useState<string>(startUnits ? String(Math.round(startUnits)) : "");
  const [bill, setBill] = useState<string>(customer?.monthlyBill ? String(Math.round(customer.monthlyBill)) : "");
  const [tariff, setTariff] = useState(String(base.tariff));
  const [offset, setOffset] = useState(String(base.offsetPct));
  const [kw, setKw] = useState<string>(customer?.expectedKw ? String(customer.expectedKw) : "");
  const [subsidyOn, setSubsidyOn] = useState(customer ? customer.residential : true);
  const [panelWp, setPanelWp] = useState(String(base.panelWp));
  const [costPerKw, setCostPerKw] = useState(String(base.costPerKw));
  const [costOverride, setCostOverride] = useState("");
  const [yieldDay, setYieldDay] = useState(String(base.yieldPerKwDay));
  const [esc, setEsc] = useState(String(base.escalationPct));
  const [deg, setDeg] = useState(String(base.degradationPct));
  const [area, setArea] = useState(String(base.areaPerKwSqft));
  const [copied, setCopied] = useState(false);

  const tariffN = Number(tariff) || 0;
  const monthlyUnits = mode === "units" ? Number(units) || 0 : unitsFromBill(Number(bill) || 0, tariffN);

  const input: CalcInput = {
    ...base,
    monthlyUnits,
    tariff: tariffN,
    offsetPct: Number(offset) || 100,
    yieldPerKwDay: Number(yieldDay) || base.yieldPerKwDay,
    panelWp: Number(panelWp) || base.panelWp,
    areaPerKwSqft: Number(area) || base.areaPerKwSqft,
    costPerKw: Number(costPerKw) || base.costPerKw,
    escalationPct: Number(esc) || 0,
    degradationPct: Number(deg) || 0,
    subsidyEligible: subsidyOn,
    kwOverride: Number(kw) > 0 ? Number(kw) : null,
    grossCostOverride: Number(costOverride) > 0 ? Number(costOverride) : null,
  };
  const r = calculateSolar(input, settings.subsidy);
  const ready = monthlyUnits > 0;

  const quoteQuery = new URLSearchParams({ kw: String(r.systemKw), calc: JSON.stringify(input) });
  if (customer) quoteQuery.set("customerId", customer.id);

  const summary = [
    `*Solar proposal estimate${customer ? ` – ${customer.name}` : ""}*`,
    `System: ${r.systemKw} kW (${r.panels} × ${input.panelWp} Wp panels, ~${Math.round(r.areaSqft)} sq ft)`,
    `Generation: ~${formatNum(Math.round(r.monthlyGeneration))} units/month`,
    `Cost: ${formatINR(r.grossCost)}${r.subsidyCentral + r.subsidyState > 0 ? ` – subsidy ${formatINR(r.subsidyCentral + r.subsidyState)} = *${formatINR(r.netCost)}*` : ""}`,
    `Bill: ${formatINR(r.billBeforeMonthly)} → ${formatINR(r.billAfterMonthly)} per month`,
    `Saving ≈ ${formatINR(r.savingsYear1)} in year 1 · Payback ≈ ${r.paybackYears !== null ? r.paybackYears.toFixed(1) : ">25"} years`,
    `– ${settings.company.name}, ${settings.company.phone}`,
  ].join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <SectionTitle>Customer usage</SectionTitle>
          <div className="mb-3 inline-flex rounded-lg bg-surface-2 p-0.5 text-xs font-medium">
            {(["units", "bill"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-md px-3 py-1.5 ${mode === m ? "bg-surface shadow-sm" : "text-muted"}`}>
                {m === "units" ? "I have units (kWh)" : "I have the bill (₹)"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {mode === "units" ? (
              <Field label="Monthly units (kWh)" className="col-span-2">
                <Input type="number" inputMode="decimal" min="0" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="e.g. 600" autoFocus />
              </Field>
            ) : (
              <Field label="Monthly bill (₹)" hint={`≈ ${monthlyUnits} units`} className="col-span-2">
                <Input type="number" inputMode="decimal" min="0" value={bill} onChange={(e) => setBill(e.target.value)} placeholder="e.g. 4500" autoFocus />
              </Field>
            )}
            <Field label="Avg. tariff (₹/unit)">
              <Input type="number" inputMode="decimal" step="0.1" min="0" value={tariff} onChange={(e) => setTariff(e.target.value)} />
            </Field>
            <Field label="Offset target (%)" hint="of usage">
              <Input type="number" inputMode="decimal" min="10" max="150" value={offset} onChange={(e) => setOffset(e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle>System & price</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="System size (kW)" hint={ready ? `suggested ${r.systemKw}` : "auto"}>
              <Input type="number" inputMode="decimal" step="0.5" min="0" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="auto" />
            </Field>
            <Field label="Panel (Wp)">
              <Input type="number" inputMode="numeric" value={panelWp} onChange={(e) => setPanelWp(e.target.value)} />
            </Field>
            <Field label="Price per kW (₹)">
              <Input type="number" inputMode="numeric" value={costPerKw} onChange={(e) => setCostPerKw(e.target.value)} />
            </Field>
            <Field label="Or total price (₹)" hint="override">
              <Input type="number" inputMode="numeric" value={costOverride} onChange={(e) => setCostOverride(e.target.value)} placeholder="optional" />
            </Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={subsidyOn} onChange={(e) => setSubsidyOn(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
            Residential — eligible for PM Surya Ghar + state subsidy
          </label>
          <details className="mt-3 border-t border-line pt-3">
            <summary className="cursor-pointer text-xs font-medium text-brand">Assumptions</summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Yield (kWh/kW/day)">
                <Input type="number" step="0.1" value={yieldDay} onChange={(e) => setYieldDay(e.target.value)} />
              </Field>
              <Field label="Roof sq ft per kW">
                <Input type="number" value={area} onChange={(e) => setArea(e.target.value)} />
              </Field>
              <Field label="Tariff increase / yr (%)">
                <Input type="number" step="0.1" value={esc} onChange={(e) => setEsc(e.target.value)} />
              </Field>
              <Field label="Panel degradation / yr (%)">
                <Input type="number" step="0.1" value={deg} onChange={(e) => setDeg(e.target.value)} />
              </Field>
            </div>
            <p className="mt-2 text-xs text-muted">Defaults live in Settings → Solar & subsidy.</p>
          </details>
        </Card>
      </div>

      <div className="space-y-4 lg:col-span-3">
        {!ready ? (
          <Card>
            <div className="py-10 text-center text-sm text-muted">Enter the customer’s monthly units or bill to see the recommended system.</div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Recommended" value={`${r.systemKw} kW`} sub={`${r.panels} panels · ${r.dcKw.toFixed(2)} kWp`} tone="green" />
              <Tile label="Roof needed" value={`${Math.round(r.areaSqft)} sq ft`} sub={`${(r.areaSqft / 10.764).toFixed(0)} m²`} />
              <Tile label="Generation" value={`${formatNum(Math.round(r.monthlyGeneration))}`} sub="units / month" />
              <Tile label="Covers" value={`${Math.round(r.coveragePct)}%`} sub="of annual usage" />
            </div>
            {r.generationExceedsUse && (
              <p className="rounded-lg bg-amber-soft px-3 py-2 text-xs text-amber">
                This size generates more than the customer uses. Extra units are not counted in the savings (net-metering export is credited at a lower rate).
              </p>
            )}

            <Card>
              <SectionTitle>Investment</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-4">
                <Row label="System cost" value={formatINR(r.grossCost)} />
                <Row label="Central subsidy" value={r.subsidyCentral ? `− ${formatINR(r.subsidyCentral)}` : "—"} />
                <Row label="State subsidy" value={r.subsidyState ? `− ${formatINR(r.subsidyState)}` : "—"} />
                <Row label="Net payable" value={formatINR(r.netCost)} strong />
              </div>
            </Card>

            <Card>
              <SectionTitle>Savings</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-4">
                <Row label="Bill now" value={`${formatINR(r.billBeforeMonthly)}/mo`} />
                <Row label="Bill after solar" value={`${formatINR(r.billAfterMonthly)}/mo`} />
                <Row label="Year-1 saving" value={formatINR(r.savingsYear1)} strong />
                <Row label="Payback" value={r.paybackYears === null ? "> 25 yrs" : `${r.paybackYears.toFixed(1)} yrs`} strong />
              </div>
              <div className="mt-4">
                <LineChart
                  labels={r.years.map((y) => `Yr ${y.year}`)}
                  series={[{ name: "Cumulative savings", color: "var(--brand)", values: r.years.map((y) => y.cumulative) }]}
                  hline={{ value: r.netCost, label: `Net cost ${formatINRShort(r.netCost)}` }}
                />
              </div>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <Row label="25-year savings" value={formatINRShort(r.totalSavings25)} />
                <Row label="Net gain after cost" value={formatINRShort(r.netGain25)} />
                <Row label="Return on investment" value={`${r.roiPct.toFixed(1)}% / yr`} />
              </div>
              <div className="mt-4 rounded-lg bg-brand-soft p-3 text-sm text-brand-strong">
                Avoids ~{r.co2TonnesPerYear.toFixed(1)} t CO₂ a year — like planting {formatNum(r.treesEquivalent)} trees.
              </div>
              {r.paybackYearsNoSubsidy !== null && r.subsidyCentral + r.subsidyState > 0 && (
                <div className="mt-3 text-xs text-muted">Without subsidy the payback would be {r.paybackYearsNoSubsidy.toFixed(1)} years.</div>
              )}
              <div className="mt-3">
                <ProgressBar value={r.coveragePct} />
              </div>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Link href={`/quotes/new?${quoteQuery.toString()}`} className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong">
                Create quotation from this →
              </Link>
              {customer && (
                <a href={whatsAppLink(customer.phone, summary)} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-2">
                  Send on WhatsApp
                </a>
              )}
              <Button type="button" variant="secondary" onClick={copy}>
                {copied ? "Copied ✓" : "Copy summary"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => window.print()}>
                Print
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "green" }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3.5 shadow-sm">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-0.5 text-xl font-semibold tabular-nums ${tone === "green" ? "text-brand-strong" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`tabular-nums ${strong ? "text-lg font-semibold" : "text-base font-medium"}`}>{value}</div>
    </div>
  );
}
