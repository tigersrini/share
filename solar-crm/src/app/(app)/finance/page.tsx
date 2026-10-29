import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { BarChart, HBars } from "@/components/Charts";
import { Badge, Card, EmptyState, LinkButton, PageHeader, SectionTitle, StatCard, TableWrap } from "@/components/ui";
import { financialYear, financialYearStart, formatINR, formatINRShort, nowMs, round2, startOfMonth } from "@/lib/format";
import { computeInvoice } from "@/lib/gst";
import { EXPENSE_LABEL, ITEM_CATEGORY_LABEL, PROJECT_STAGE_LABEL, PROJECT_STAGE_TONE } from "@/lib/labels";
import { gstFactor } from "@/lib/quote";
import { lastMonths, monthKey, projectEconomics } from "@/lib/finance";

export const metadata: Metadata = { title: "Cost & Profit" };
export const dynamic = "force-dynamic";

function period(range: string): { from?: Date; to?: Date; label: string } {
  const now = new Date();
  if (range === "month") return { from: startOfMonth(now), label: "This month" };
  if (range === "q") return { from: new Date(now.getTime() - 90 * 86400000), label: "Last 90 days" };
  if (range === "lastfy") {
    const cur = financialYearStart(now);
    const prev = new Date(cur);
    prev.setFullYear(prev.getFullYear() - 1);
    const y = Number(financialYear(prev).slice(0, 2));
    return { from: prev, to: cur, label: `FY ${y}-${y + 1}` };
  }
  if (range === "all") return { label: "All time" };
  return { from: financialYearStart(now), label: `FY ${financialYear(now)}` };
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range = "fy" } = await searchParams;
  const per = period(range);
  const settings = await getSettings();
  const factor = gstFactor(settings.gst);
  const inRange = (field: "date" | "createdAt") => ({ ...(per.from || per.to ? { [field]: { ...(per.from ? { gte: per.from } : {}), ...(per.to ? { lt: per.to } : {}) } } : {}) });

  const months = lastMonths(12);
  const chartFrom = months[0].start;

  const [invoices, payments, expenses, issued, projects, openInvoices, items, chartInv, chartExp, chartMov, chartPay] = await Promise.all([
    prisma.invoice.findMany({ where: { status: { not: "CANCELLED" }, ...inRange("date") }, include: { lines: true } }),
    prisma.payment.findMany({ where: inRange("date"), select: { amount: true } }),
    prisma.expense.findMany({ where: inRange("date"), select: { amount: true, category: true, projectId: true } }),
    prisma.stockMovement.findMany({ where: { projectId: { not: null }, ...inRange("createdAt") }, select: { qty: true, unitCost: true, item: { select: { category: true } } } }),
    prisma.project.findMany({
      where: { stage: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take: 150,
      include: {
        customer: { select: { name: true } },
        payments: { select: { amount: true } },
        invoices: { select: { status: true, subtotal: true } },
        movements: { select: { qty: true, unitCost: true } },
        expenses: { select: { amount: true } },
      },
    }),
    prisma.invoice.findMany({ where: { status: { not: "CANCELLED" } }, include: { payments: { select: { amount: true } } } }),
    prisma.item.findMany({ where: { active: true }, select: { quantity: true, costPrice: true } }),
    prisma.invoice.findMany({ where: { status: { not: "CANCELLED" }, date: { gte: chartFrom } }, select: { date: true, subtotal: true } }),
    prisma.expense.findMany({ where: { date: { gte: chartFrom } }, select: { date: true, amount: true } }),
    prisma.stockMovement.findMany({ where: { projectId: { not: null }, createdAt: { gte: chartFrom } }, select: { createdAt: true, qty: true, unitCost: true } }),
    prisma.payment.findMany({ where: { date: { gte: chartFrom } }, select: { date: true, amount: true } }),
  ]);

  // ── Period P&L ──
  const revenue = round2(invoices.reduce((s, i) => s + i.subtotal, 0));
  const gstOut = round2(invoices.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0));
  const material = round2(-issued.reduce((s, m) => s + m.qty * m.unitCost, 0));
  const direct = round2(expenses.filter((e) => e.projectId).reduce((s, e) => s + e.amount, 0));
  const overhead = round2(expenses.filter((e) => !e.projectId).reduce((s, e) => s + e.amount, 0));
  const gross = round2(revenue - material - direct);
  const net = round2(gross - overhead);
  const collected = round2(payments.reduce((s, p) => s + p.amount, 0));
  const stockValue = items.reduce((s, i) => s + i.quantity * i.costPrice, 0);

  // ── Cost breakdown ──
  const costRows: { label: string; value: number }[] = [];
  const matByCat = new Map<string, number>();
  for (const m of issued) matByCat.set(m.item.category, (matByCat.get(m.item.category) ?? 0) - m.qty * m.unitCost);
  for (const [c, v] of matByCat) costRows.push({ label: `Materials · ${ITEM_CATEGORY_LABEL[c as keyof typeof ITEM_CATEGORY_LABEL]}`, value: v });
  const expByCat = new Map<string, number>();
  for (const e of expenses) expByCat.set(e.category, (expByCat.get(e.category) ?? 0) + e.amount);
  for (const [c, v] of expByCat) costRows.push({ label: EXPENSE_LABEL[c as keyof typeof EXPENSE_LABEL], value: v });
  costRows.sort((a, b) => b.value - a.value);

  // ── 12-month chart ──
  const rev = new Map<string, number>(), cost = new Map<string, number>(), col = new Map<string, number>();
  for (const i of chartInv) rev.set(monthKey(i.date), (rev.get(monthKey(i.date)) ?? 0) + i.subtotal);
  for (const e of chartExp) cost.set(monthKey(e.date), (cost.get(monthKey(e.date)) ?? 0) + e.amount);
  for (const m of chartMov) cost.set(monthKey(m.createdAt), (cost.get(monthKey(m.createdAt)) ?? 0) - m.qty * m.unitCost);
  for (const p of chartPay) col.set(monthKey(p.date), (col.get(monthKey(p.date)) ?? 0) + p.amount);

  // ── Receivables ──
  const projEcon = projects.map((p) => ({ p, e: projectEconomics({ contractValue: p.contractValue, gstFactor: factor, invoices: p.invoices, movements: p.movements, expenses: p.expenses, payments: p.payments }) }));
  const owing = projEcon.filter((x) => x.e.balance > 1).sort((a, b) => b.e.balance - a.e.balance);
  const totalOwed = owing.reduce((s, x) => s + x.e.balance, 0);

  const now = nowMs();
  const buckets = [
    { label: "0–30 days", min: 0, max: 30, total: 0 },
    { label: "31–60 days", min: 31, max: 60, total: 0 },
    { label: "61–90 days", min: 61, max: 90, total: 0 },
    { label: "90+ days", min: 91, max: 99999, total: 0 },
  ];
  for (const i of openInvoices) {
    const due = i.total - i.payments.reduce((s, p) => s + p.amount, 0);
    if (due <= 1) continue;
    const age = Math.floor((now - i.date.getTime()) / 86400000);
    const b = buckets.find((x) => age >= x.min && age <= x.max);
    if (b) b.total += due;
  }

  // ── GST by rate ──
  const gstByRate = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number }>();
  for (const i of invoices) {
    const t = computeInvoice(i.lines.map((l) => ({ description: l.description, hsn: l.hsn, qty: l.qty, unit: l.unit, rate: l.rate, gstRate: l.gstRate })), i.placeOfSupply === settings.company.stateCode);
    for (const r of t.rateRows) {
      const g = gstByRate.get(r.rate) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      g.taxable += r.taxable; g.cgst += r.cgst; g.sgst += r.sgst; g.igst += r.igst;
      gstByRate.set(r.rate, g);
    }
  }
  const ranges = [["fy", `FY ${financialYear()}`], ["month", "This month"], ["q", "Last 90 days"], ["lastfy", "Last FY"], ["all", "All time"]];

  return (
    <div>
      <PageHeader
        title="Cost & Profit"
        subtitle={`${per.label} · revenue = taxable value of tax invoices; cost = stock issued to projects + project & overhead expenses`}
        actions={
          <>
            <LinkButton href={`/api/export/invoices?range=${range === "month" || range === "fy" ? range : "all"}`}>GST sales register</LinkButton>
            <LinkButton href={`/api/export/payments?range=${range === "month" || range === "fy" ? range : "all"}`}>Payments CSV</LinkButton>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ranges.map(([k, l]) => (
          <Link key={k} href={`/finance?range=${k}`} className={`rounded-full px-3 py-1 text-xs font-medium ${range === k ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-ink"}`}>{l}</Link>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue (ex-GST)" value={formatINRShort(revenue)} sub={`${invoices.length} invoices · GST collected ${formatINRShort(gstOut)}`} tone="blue" />
        <StatCard label="Gross profit" value={formatINRShort(gross)} sub={revenue > 0 ? `${((gross / revenue) * 100).toFixed(0)}% of revenue` : "—"} tone={gross < 0 ? "red" : "green"} />
        <StatCard label="Net profit" value={formatINRShort(net)} sub={`after ${formatINRShort(overhead)} overheads`} tone={net < 0 ? "red" : "green"} />
        <StatCard label="Cash collected" value={formatINRShort(collected)} sub={`${formatINRShort(totalOwed)} still to collect`} tone="orange" />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Materials used" value={formatINRShort(material)} sub="issued to projects at cost" />
        <StatCard label="Direct project costs" value={formatINRShort(direct)} sub="labour, transport, permits…" />
        <StatCard label="Overheads" value={formatINRShort(overhead)} sub="rent, salaries, marketing…" />
        <StatCard label="Stock in hand" value={formatINRShort(stockValue)} sub="at average cost" href="/inventory" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle>Last 12 months</SectionTitle>
          <BarChart
            labels={months.map((m) => m.label)}
            series={[
              { name: "Revenue (ex-GST)", color: "var(--brand)", values: months.map((m) => rev.get(m.key) ?? 0) },
              { name: "Costs", color: "var(--sun)", values: months.map((m) => cost.get(m.key) ?? 0) },
              { name: "Cash collected", color: "var(--info)", values: months.map((m) => col.get(m.key) ?? 0) },
            ]}
          />
        </Card>
        <Card>
          <SectionTitle>Where the money goes</SectionTitle>
          <HBars rows={costRows.slice(0, 8)} color="var(--sun)" />
        </Card>

        <Card pad={false} className="lg:col-span-2">
          <div className="p-4 pb-0 sm:p-5 sm:pb-0"><SectionTitle>Project profitability (lifetime)</SectionTitle></div>
          {projEcon.length === 0 ? <EmptyState>No projects yet.</EmptyState> : (
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>Project</th><th>Stage</th><th className="num">Revenue</th><th className="num">Material</th><th className="num">Direct</th><th className="num">Margin</th></tr></thead>
                <tbody>
                  {projEcon.map(({ p, e }) => (
                    <tr key={p.id} className="row-link">
                      <td><Link href={`/projects/${p.id}`} className="font-medium hover:text-brand">{p.code}</Link><div className="text-xs text-muted">{p.customer.name} · {p.systemKw} kW</div></td>
                      <td><Badge tone={PROJECT_STAGE_TONE[p.stage]}>{PROJECT_STAGE_LABEL[p.stage]}</Badge></td>
                      <td className="num">{formatINR(e.revenueExGst)}{e.estimatedRevenue && <div className="text-xs text-muted">est.</div>}</td>
                      <td className="num">{formatINR(e.material)}</td>
                      <td className="num">{formatINR(e.direct)}</td>
                      <td className={`num font-medium ${e.margin < 0 ? "text-danger" : ""}`}>{formatINR(e.margin)}<div className="text-xs font-normal text-muted">{e.marginPct.toFixed(0)}%</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>

        <div className="space-y-4">
          <Card pad={false}>
            <div className="p-4 pb-0"><SectionTitle>To collect · {formatINR(totalOwed)}</SectionTitle></div>
            {owing.length === 0 ? <EmptyState>Nothing outstanding.</EmptyState> : (
              <ul className="divide-y divide-line px-4 pb-2 text-sm">
                {owing.slice(0, 8).map(({ p, e }) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <Link href={`/projects/${p.id}`} className="min-w-0"><div className="truncate font-medium hover:text-brand">{p.customer.name}</div><div className="text-xs text-muted">{p.code} · paid {formatINR(e.received)} of {formatINR(p.contractValue)}</div></Link>
                    <span className="font-medium tabular-nums">{formatINR(e.balance)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <SectionTitle>Unpaid invoices by age</SectionTitle>
            <ul className="space-y-1.5 text-sm">
              {buckets.map((b) => (<li key={b.label} className="flex justify-between"><span className="text-muted">{b.label}</span><span className={`tabular-nums ${b.total > 0 && b.min > 60 ? "font-medium text-danger" : ""}`}>{formatINR(b.total)}</span></li>))}
            </ul>
          </Card>
        </div>

        <Card pad={false} className="lg:col-span-3">
          <div className="p-4 pb-0 sm:p-5 sm:pb-0"><SectionTitle>GST collected on sales · {per.label}</SectionTitle></div>
          {gstByRate.size === 0 ? <EmptyState>No invoices in this period.</EmptyState> : (
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>GST rate</th><th className="num">Taxable value</th><th className="num">CGST</th><th className="num">SGST</th><th className="num">IGST</th><th className="num">Total tax</th></tr></thead>
                <tbody>
                  {[...gstByRate.entries()].sort((a, b) => a[0] - b[0]).map(([rate, g]) => (
                    <tr key={rate}><td>{rate}%</td><td className="num">{formatINR(g.taxable)}</td><td className="num">{formatINR(g.cgst)}</td><td className="num">{formatINR(g.sgst)}</td><td className="num">{formatINR(g.igst)}</td><td className="num font-medium">{formatINR(g.cgst + g.sgst + g.igst)}</td></tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
          <p className="border-t border-line px-4 py-3 text-xs text-muted sm:px-5">Output tax only — input tax credit on purchases is not tracked here. Use the GST sales register export for filing support, and confirm figures with your CA.</p>
        </Card>
      </div>
    </div>
  );
}
