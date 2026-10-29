import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { BarChart, HBars } from "@/components/Charts";
import Icon from "@/components/Icon";
import { Badge, Card, EmptyState, LinkButton, PageHeader, SectionTitle, StatCard } from "@/components/ui";
import { endOfDay, formatDate, formatINR, formatINRShort, nowMs, startOfMonth, toDateInput, whatsAppLink } from "@/lib/format";
import { ACTIVE_PROJECT_STAGES, PROJECT_STAGE_LABEL, PROJECT_STAGE_TONE, STAGES, STAGE_LABEL } from "@/lib/labels";
import { lastMonths, monthKey } from "@/lib/finance";
import { netPayable } from "@/lib/quote";
import { rescheduleFollowUp } from "./customers/actions";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const session = await getSession();
  const settings = await getSettings();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const months = lastMonths(6);
  const chartFrom = months[0].start;

  const [stageCounts, newLeads, followUps, openQuotes, quotesSent, decided, chase, revenueRows, paymentsRows, projects, items, activeProjectsCount] = await Promise.all([
    prisma.customer.groupBy({ by: ["stage"], _count: true }),
    prisma.customer.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.customer.findMany({ where: { nextFollowUpAt: { lte: endOfDay(now) }, stage: { notIn: ["WON", "LOST"] } }, orderBy: { nextFollowUpAt: "asc" }, take: 8 }),
    prisma.quote.findMany({ where: { status: { in: ["DRAFT", "SENT"] } }, select: { totalAmount: true, subsidyCentral: true, subsidyState: true, status: true } }),
    prisma.quote.count({ where: { sentAt: { gte: monthStart } } }),
    prisma.quote.groupBy({ by: ["status"], where: { status: { in: ["ACCEPTED", "REJECTED"] }, decidedAt: { gte: new Date(now.getTime() - 90 * 86400000) } }, _count: true }),
    prisma.quote.findMany({ where: { status: "SENT", sentAt: { lte: new Date(now.getTime() - 4 * 86400000) } }, orderBy: { sentAt: "asc" }, take: 5, include: { customer: { select: { id: true, name: true, phone: true } } } }),
    prisma.invoice.findMany({ where: { status: { not: "CANCELLED" }, date: { gte: chartFrom } }, select: { date: true, subtotal: true } }),
    prisma.payment.findMany({ where: { date: { gte: chartFrom } }, select: { date: true, amount: true } }),
    prisma.project.findMany({ where: { stage: { not: "CANCELLED" } }, select: { id: true, code: true, name: true, stage: true, contractValue: true, targetDate: true, customer: { select: { name: true } }, payments: { select: { amount: true } } } }),
    prisma.item.findMany({ where: { active: true, reorderLevel: { gt: 0 } }, select: { id: true, name: true, quantity: true, reorderLevel: true, uom: true } }),
    prisma.project.count({ where: { stage: { in: ACTIVE_PROJECT_STAGES } } }),
  ]);

  const rev = new Map<string, number>();
  const col = new Map<string, number>();
  for (const i of revenueRows) rev.set(monthKey(i.date), (rev.get(monthKey(i.date)) ?? 0) + i.subtotal);
  for (const p of paymentsRows) col.set(monthKey(p.date), (col.get(monthKey(p.date)) ?? 0) + p.amount);
  const thisKey = monthKey(now);

  const openValue = openQuotes.reduce((s, q) => s + netPayable(q), 0);
  const won = decided.find((d) => d.status === "ACCEPTED")?._count ?? 0;
  const lost = decided.find((d) => d.status === "REJECTED")?._count ?? 0;
  const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;

  const withBalance = projects.map((p) => ({ ...p, paid: p.payments.reduce((s, x) => s + x.amount, 0) })).map((p) => ({ ...p, balance: Math.max(0, p.contractValue - p.paid) }));
  const toCollect = withBalance.reduce((s, p) => s + p.balance, 0);
  const active = withBalance.filter((p) => ACTIVE_PROJECT_STAGES.includes(p.stage)).slice(0, 6);
  const lowStock = items.filter((i) => i.quantity <= i.reorderLevel).sort((a, b) => a.quantity / a.reorderLevel - b.quantity / b.reorderLevel).slice(0, 6);

  const funnel = STAGES.filter((s) => s !== "LOST").map((s) => ({ label: STAGE_LABEL[s], value: stageCounts.find((c) => c.stage === s)?._count ?? 0 }));
  const dayPlus = (n: number) => toDateInput(new Date(nowMs() + n * 86400000));
  const todayStr = toDateInput(now);

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${session?.name.split(" ")[0] ?? ""}`}
        subtitle={`${settings.company.name} · ${formatDate(now)}`}
        actions={
          <>
            <LinkButton href="/customers/new">+ Lead</LinkButton>
            <LinkButton href="/calculator">Calculator</LinkButton>
            <LinkButton href="/quotes/new" variant="primary">+ Quotation</LinkButton>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="New leads this month" value={newLeads} sub={`${funnel.reduce((s, f) => s + f.value, 0) - (funnel.find((f) => f.label === "Won")?.value ?? 0)} open in pipeline`} href="/pipeline" tone="blue" />
        <StatCard label="Open quotations" value={formatINRShort(openValue)} sub={`${openQuotes.length} drafts & sent · ${quotesSent} sent this month${winRate !== null ? ` · ${winRate}% win rate` : ""}`} href="/quotes" tone="orange" />
        <StatCard label="Revenue this month" value={formatINRShort(rev.get(thisKey) ?? 0)} sub={`ex-GST · collected ${formatINRShort(col.get(thisKey) ?? 0)}`} href="/finance" tone="green" />
        <StatCard label="To collect" value={formatINRShort(toCollect)} sub={`across ${withBalance.filter((p) => p.balance > 1).length} project(s)`} href="/finance" tone={toCollect > 0 ? "orange" : "green"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card pad={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0">
              <SectionTitle action={<Link href="/customers" className="text-xs font-medium text-brand">All leads →</Link>}>Follow-ups due · {followUps.length}</SectionTitle>
            </div>
            {followUps.length === 0 ? (
              <EmptyState>All caught up — no follow-ups due today. 🎉</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {followUps.map((c) => {
                  const overdue = c.nextFollowUpAt && toDateInput(c.nextFollowUpAt) < todayStr;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                      <div className="min-w-0">
                        <Link href={`/customers/${c.id}`} className="font-medium hover:text-brand">{c.name}</Link>
                        <div className="text-xs text-muted">
                          <Badge tone={overdue ? "red" : "amber"}>{overdue ? `Overdue · ${formatDate(c.nextFollowUpAt)}` : "Today"}</Badge>{" "}
                          {STAGE_LABEL[c.stage]}{c.city ? ` · ${c.city}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a href={`tel:${c.phone}`} className="rounded-lg border border-line p-2 text-muted hover:bg-surface-2 hover:text-ink" title="Call"><Icon name="phone" className="h-4 w-4" /></a>
                        <a href={whatsAppLink(c.phone, `Hello ${c.name}, this is ${settings.company.name}. `)} target="_blank" rel="noreferrer" className="rounded-lg border border-line p-2 text-muted hover:bg-surface-2 hover:text-ink" title="WhatsApp"><Icon name="whatsapp" className="h-4 w-4" /></a>
                        {[[1, "+1d"], [3, "+3d"], [7, "+1w"]].map(([n, l]) => (
                          <form key={n} action={rescheduleFollowUp}>
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="date" value={dayPlus(n as number)} />
                            <button className="rounded-lg bg-surface-2 px-2 py-1.5 text-xs font-medium text-muted hover:text-ink" title={`Snooze ${l}`}>{l}</button>
                          </form>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <SectionTitle action={<Link href="/finance" className="text-xs font-medium text-brand">Cost & Profit →</Link>}>Revenue vs cash collected · 6 months</SectionTitle>
            <BarChart
              labels={months.map((m) => m.label)}
              series={[
                { name: "Revenue (ex-GST)", color: "var(--brand)", values: months.map((m) => rev.get(m.key) ?? 0) },
                { name: "Cash collected", color: "var(--info)", values: months.map((m) => col.get(m.key) ?? 0) },
              ]}
              height={200}
            />
          </Card>

          <Card pad={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0">
              <SectionTitle action={<Link href="/projects" className="text-xs font-medium text-brand">All projects →</Link>}>Active projects · {activeProjectsCount}</SectionTitle>
            </div>
            {active.length === 0 ? (
              <EmptyState>No active projects.</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {active.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2 sm:px-5">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.customer.name}</div>
                        <div className="text-xs text-muted">{p.code}{p.targetDate ? ` · due ${formatDate(p.targetDate)}` : ""}</div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <Badge tone={PROJECT_STAGE_TONE[p.stage]}>{PROJECT_STAGE_LABEL[p.stage]}</Badge>
                        <span className="w-24 text-sm tabular-nums">{p.balance > 1 ? `${formatINR(p.balance)} due` : "Paid"}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionTitle action={<Link href="/pipeline" className="text-xs font-medium text-brand">Board →</Link>}>Sales funnel</SectionTitle>
            <HBars rows={funnel} format={(n) => String(Math.round(n))} />
          </Card>

          <Card pad={false}>
            <div className="p-4 pb-0"><SectionTitle>Quotes to chase</SectionTitle></div>
            {chase.length === 0 ? (
              <EmptyState>No sent quotes waiting more than 4 days.</EmptyState>
            ) : (
              <ul className="divide-y divide-line px-4 pb-2 text-sm">
                {chase.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link href={`/quotes/${q.id}`} className="min-w-0">
                      <div className="truncate font-medium hover:text-brand">{q.customer.name}</div>
                      <div className="text-xs text-muted">{q.number} · sent {formatDate(q.sentAt)}</div>
                    </Link>
                    <span className="tabular-nums">{formatINRShort(netPayable(q))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card pad={false}>
            <div className="p-4 pb-0"><SectionTitle action={<Link href="/inventory?low=1" className="text-xs font-medium text-brand">Inventory →</Link>}>Low stock</SectionTitle></div>
            {lowStock.length === 0 ? (
              <EmptyState>Stock levels look healthy.</EmptyState>
            ) : (
              <ul className="divide-y divide-line px-4 pb-2 text-sm">
                {lowStock.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link href={`/inventory/${i.id}`} className="min-w-0 truncate hover:text-brand">{i.name}</Link>
                    <Badge tone={i.quantity <= 0 ? "red" : "orange"}>{i.quantity} / {i.reorderLevel} {i.uom}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
