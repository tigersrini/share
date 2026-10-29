import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { Badge, Card, EmptyState, PageHeader, ProgressBar, TableWrap } from "@/components/ui";
import { formatDate, formatINR } from "@/lib/format";
import { ACTIVE_PROJECT_STAGES, PROJECT_STAGE_LABEL, PROJECT_STAGE_TONE, SUBSIDY_LABEL } from "@/lib/labels";
import { gstFactor } from "@/lib/quote";
import { projectEconomics } from "@/lib/finance";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "active" } = await searchParams;
  const settings = await getSettings();
  const where = view === "active" ? { stage: { in: ACTIVE_PROJECT_STAGES } } : view === "done" ? { stage: "COMPLETED" as const } : {};
  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      customer: { select: { name: true } },
      tasks: { select: { done: true } },
      payments: { select: { amount: true } },
      invoices: { select: { status: true, subtotal: true } },
      movements: { select: { qty: true, unitCost: true } },
      expenses: { select: { amount: true } },
    },
  });
  const factor = gstFactor(settings.gst);
  const tabs = [
    ["active", "In progress"],
    ["done", "Completed"],
    ["all", "All"],
  ];

  return (
    <div>
      <PageHeader title="Projects" subtitle="Accepted quotations become projects — track delivery, money and margin." />
      <div className="mb-4 flex gap-1.5">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/projects?view=${k}`} className={`rounded-full px-3 py-1 text-xs font-medium ${view === k ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-ink"}`}>
            {label}
          </Link>
        ))}
      </div>
      <Card pad={false}>
        {projects.length === 0 ? (
          <EmptyState>No projects here. Open an accepted quotation and choose “start project”.</EmptyState>
        ) : (
          <TableWrap>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Stage</th>
                  <th>Checklist</th>
                  <th>Payments</th>
                  <th className="num">Balance</th>
                  <th className="num">Margin</th>
                  <th>Subsidy</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const e = projectEconomics({ contractValue: p.contractValue, gstFactor: factor, invoices: p.invoices, movements: p.movements, expenses: p.expenses, payments: p.payments });
                  const done = p.tasks.filter((t) => t.done).length;
                  const pct = p.tasks.length ? (done / p.tasks.length) * 100 : 0;
                  const paidPct = p.contractValue > 0 ? (e.received / p.contractValue) * 100 : 0;
                  return (
                    <tr key={p.id} className="row-link">
                      <td>
                        <Link href={`/projects/${p.id}`} className="font-medium hover:text-brand">{p.code}</Link>
                        <div className="text-xs text-muted">{p.customer.name} · {p.systemKw} kW{p.targetDate ? ` · due ${formatDate(p.targetDate)}` : ""}</div>
                      </td>
                      <td><Badge tone={PROJECT_STAGE_TONE[p.stage]}>{PROJECT_STAGE_LABEL[p.stage]}</Badge></td>
                      <td className="min-w-28">
                        <ProgressBar value={pct} />
                        <div className="mt-1 text-xs text-muted">{done}/{p.tasks.length} done</div>
                      </td>
                      <td className="min-w-32">
                        <ProgressBar value={paidPct} tone="orange" />
                        <div className="mt-1 text-xs text-muted">{formatINR(e.received)} of {formatINR(p.contractValue)}</div>
                      </td>
                      <td className={`num ${e.balance > 0 ? "font-medium" : "text-muted"}`}>{formatINR(e.balance)}</td>
                      <td className={`num ${e.margin < 0 ? "text-danger" : ""}`}>
                        {formatINR(e.margin)}
                        <div className="text-xs text-muted">{e.marginPct.toFixed(0)}%{e.estimatedRevenue ? " est." : ""}</div>
                      </td>
                      <td className="whitespace-nowrap text-xs">{SUBSIDY_LABEL[p.subsidyStatus]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
