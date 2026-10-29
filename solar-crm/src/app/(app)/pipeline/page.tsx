import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, LinkButton, PageHeader } from "@/components/ui";
import { formatDate, formatINRShort, nowMs, startOfDay } from "@/lib/format";
import { STAGES, STAGE_LABEL, STAGE_TONE, type Stage } from "@/lib/labels";
import { moveStage } from "../customers/actions";

export const metadata: Metadata = { title: "Pipeline" };
export const dynamic = "force-dynamic";

const OPEN: Stage[] = ["NEW", "CONTACTED", "SITE_VISIT", "QUOTED", "NEGOTIATION"];

export default async function PipelinePage() {
  const today = startOfDay();
  const [customers, closedCounts] = await Promise.all([
    prisma.customer.findMany({
      where: { OR: [{ stage: { in: OPEN } }, { stage: { in: ["WON", "LOST"] }, updatedAt: { gte: new Date(nowMs() - 30 * 86400000) } }] },
      orderBy: [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      include: { quotes: { where: { status: { in: ["DRAFT", "SENT", "ACCEPTED"] } }, orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.customer.groupBy({ by: ["stage"], where: { stage: { in: ["WON", "LOST"] } }, _count: true }),
  ]);

  const byStage = (s: Stage) => customers.filter((c) => c.stage === s);
  const value = (s: Stage) =>
    byStage(s).reduce((sum, c) => {
      const q = c.quotes[0];
      return sum + (q ? q.totalAmount - q.subsidyCentral - q.subsidyState : 0);
    }, 0);

  return (
    <div>
      <PageHeader
        title="Sales pipeline"
        subtitle="Move leads along with the arrows. Won / Lost show the last 30 days."
        actions={<LinkButton href="/customers/new" variant="primary">+ New lead</LinkButton>}
      />
      <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6">
        <div className="flex min-w-max gap-3">
          {STAGES.map((s, idx) => {
            const list = byStage(s);
            const total = closedCounts.find((c) => c.stage === s)?._count;
            return (
              <section key={s} className="w-64 shrink-0 rounded-xl border border-line bg-surface-2/60 p-2.5">
                <header className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={STAGE_TONE[s]}>{STAGE_LABEL[s]}</Badge>
                    <span className="text-xs text-muted">{total ?? list.length}</span>
                  </div>
                  {value(s) > 0 && <span className="text-xs font-medium text-muted">{formatINRShort(value(s))}</span>}
                </header>
                <div className="space-y-2">
                  {list.map((c) => {
                    const overdue = c.nextFollowUpAt && c.nextFollowUpAt < today;
                    const q = c.quotes[0];
                    return (
                      <div key={c.id} className="rounded-lg border border-line bg-surface p-3 shadow-sm">
                        <Link href={`/customers/${c.id}`} className="block text-sm font-medium hover:text-brand">
                          {c.name}
                        </Link>
                        <div className="mt-0.5 text-xs text-muted">
                          {[c.city, c.monthlyUnits ? `${Math.round(c.monthlyUnits)} units` : null, c.expectedKw ? `${c.expectedKw} kW` : null].filter(Boolean).join(" · ") || c.phone}
                        </div>
                        {q && <div className="mt-1 text-xs text-muted">Quote {q.systemKw} kW · {formatINRShort(q.totalAmount - q.subsidyCentral - q.subsidyState)}</div>}
                        {c.nextFollowUpAt && (
                          <div className={`mt-1 text-xs ${overdue ? "font-medium text-danger" : "text-muted"}`}>
                            Follow-up {formatDate(c.nextFollowUpAt)}
                          </div>
                        )}
                        <div className="mt-2 flex justify-between">
                          <MoveButton id={c.id} stage={idx > 0 ? STAGES[idx - 1] : null} dir="←" />
                          <MoveButton id={c.id} stage={idx < STAGES.length - 1 ? STAGES[idx + 1] : null} dir="→" />
                        </div>
                      </div>
                    );
                  })}
                  {list.length === 0 && <div className="px-1 py-4 text-center text-xs text-muted">Empty</div>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MoveButton({ id, stage, dir }: { id: string; stage: Stage | null; dir: string }) {
  if (!stage) return <span />;
  return (
    <form action={moveStage}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="stage" value={stage} />
      <button title={`Move to ${STAGE_LABEL[stage]}`} className="rounded-md px-2 py-0.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-ink">
        {dir} {STAGE_LABEL[stage]}
      </button>
    </form>
  );
}
