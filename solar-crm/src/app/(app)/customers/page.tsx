import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge, Card, EmptyState, LinkButton, PageHeader, TableWrap } from "@/components/ui";
import { formatDate, startOfDay } from "@/lib/format";
import { STAGES, STAGE_LABEL, STAGE_TONE, CUSTOMER_TYPE_LABEL, type Stage } from "@/lib/labels";

export const metadata: Metadata = { title: "Leads & Customers" };
export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string }> }) {
  const { q, stage } = await searchParams;
  const where: Prisma.CustomerWhereInput = {};
  if (stage && (STAGES as readonly string[]).includes(stage)) where.stage = stage as Stage;
  if (q?.trim()) {
    const t = q.trim();
    where.OR = [
      { name: { contains: t, mode: "insensitive" } },
      { phone: { contains: t.replace(/[^\d+]/g, "") || t } },
      { city: { contains: t, mode: "insensitive" } },
      { email: { contains: t, mode: "insensitive" } },
    ];
  }

  const [customers, counts] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { updatedAt: "desc" }, take: 200, include: { _count: { select: { quotes: true } } } }),
    prisma.customer.groupBy({ by: ["stage"], _count: true }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.stage === s)?._count ?? 0;
  const total = counts.reduce((s, c) => s + c._count, 0);
  const today = startOfDay();

  return (
    <div>
      <PageHeader
        title="Leads & Customers"
        subtitle={`${total} in total`}
        actions={<LinkButton href="/customers/new" variant="primary">+ New lead</LinkButton>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="flex-1 min-w-56">
          {stage && <input type="hidden" name="stage" value={stage} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, phone, city…"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </form>
        <div className="flex flex-wrap gap-1.5">
          <Link href={q ? `/customers?q=${encodeURIComponent(q)}` : "/customers"} className={`rounded-full px-3 py-1 text-xs font-medium ${!stage ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-ink"}`}>
            All
          </Link>
          {STAGES.map((s) => (
            <Link
              key={s}
              href={`/customers?stage=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${stage === s ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-ink"}`}
            >
              {STAGE_LABEL[s]} · {countOf(s)}
            </Link>
          ))}
        </div>
      </div>

      <Card pad={false}>
        {customers.length === 0 ? (
          <EmptyState>No matching leads. <Link href="/customers/new" className="font-medium text-brand underline">Add one</Link>.</EmptyState>
        ) : (
          <TableWrap>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Area</th>
                  <th>Stage</th>
                  <th>Usage</th>
                  <th>Next follow-up</th>
                  <th className="num">Quotes</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const overdue = c.nextFollowUpAt && c.nextFollowUpAt < today;
                  return (
                    <tr key={c.id} className="row-link">
                      <td>
                        <Link href={`/customers/${c.id}`} className="font-medium text-ink hover:text-brand">
                          {c.name}
                        </Link>
                        <div className="text-xs text-muted">{CUSTOMER_TYPE_LABEL[c.type]}{c.source ? ` · ${c.source}` : ""}</div>
                      </td>
                      <td className="whitespace-nowrap">{c.phone}</td>
                      <td>{c.city ?? "—"}</td>
                      <td>
                        <Badge tone={STAGE_TONE[c.stage]}>{STAGE_LABEL[c.stage]}</Badge>
                      </td>
                      <td className="whitespace-nowrap">{c.monthlyUnits ? `${Math.round(c.monthlyUnits)} units/mo` : "—"}</td>
                      <td className={`whitespace-nowrap ${overdue ? "font-medium text-danger" : ""}`}>
                        {c.nextFollowUpAt ? formatDate(c.nextFollowUpAt) : "—"}
                        {overdue && " (overdue)"}
                      </td>
                      <td className="num">{c._count.quotes}</td>
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
