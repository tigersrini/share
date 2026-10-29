import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Card, EmptyState, LinkButton, PageHeader, TableWrap } from "@/components/ui";
import { formatDate, formatINR, formatINRShort, nowMs } from "@/lib/format";
import { QUOTE_LABEL, QUOTE_STATUSES, QUOTE_TONE, type QuoteStatusKey } from "@/lib/labels";
import { netPayable } from "@/lib/quote";

export const metadata: Metadata = { title: "Quotations" };
export const dynamic = "force-dynamic";

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const valid = (QUOTE_STATUSES as readonly string[]).includes(status ?? "");
  const [quotes, counts] = await Promise.all([
    prisma.quote.findMany({
      where: {
        ...(valid ? { status: status as QuoteStatusKey } : {}),
        ...(q?.trim() ? { OR: [{ number: { contains: q.trim(), mode: "insensitive" } }, { customer: { name: { contains: q.trim(), mode: "insensitive" } } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { customer: { select: { name: true } }, projects: { select: { id: true } } },
    }),
    prisma.quote.groupBy({ by: ["status"], _count: true, _sum: { totalAmount: true, subsidyCentral: true, subsidyState: true } }),
  ]);
  const cnt = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const openValue = counts
    .filter((c) => c.status === "SENT" || c.status === "DRAFT")
    .reduce((s, c) => s + (c._sum.totalAmount ?? 0) - (c._sum.subsidyCentral ?? 0) - (c._sum.subsidyState ?? 0), 0);
  const now = nowMs();

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle={`Open (draft + sent) value ${formatINRShort(openValue)}`}
        actions={
          <>
            <LinkButton href="/calculator">Solar calculator</LinkButton>
            <LinkButton href="/quotes/new" variant="primary">+ New quotation</LinkButton>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="min-w-56 flex-1">
          {valid && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search number or customer…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </form>
        <div className="flex flex-wrap gap-1.5">
          <Link href="/quotes" className={`rounded-full px-3 py-1 text-xs font-medium ${!valid ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-ink"}`}>All</Link>
          {QUOTE_STATUSES.map((s) => (
            <Link key={s} href={`/quotes?status=${s}`} className={`rounded-full px-3 py-1 text-xs font-medium ${status === s ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-ink"}`}>
              {QUOTE_LABEL[s]} · {cnt(s)}
            </Link>
          ))}
        </div>
      </div>
      <Card pad={false}>
        {quotes.length === 0 ? (
          <EmptyState>No quotations yet.</EmptyState>
        ) : (
          <TableWrap>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th className="num">Total</th>
                  <th className="num">Net payable</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((x) => {
                  const expired = x.status === "SENT" && x.date.getTime() + x.validityDays * 86400000 < now;
                  return (
                    <tr key={x.id} className="row-link">
                      <td>
                        <Link href={`/quotes/${x.id}`} className="font-medium hover:text-brand">{x.number}</Link>
                      </td>
                      <td>{x.customer.name}</td>
                      <td className="whitespace-nowrap">{formatDate(x.date)}</td>
                      <td className="whitespace-nowrap">{x.systemKw} kW {x.systemType}</td>
                      <td>
                        <Badge tone={QUOTE_TONE[x.status]}>{QUOTE_LABEL[x.status]}</Badge>
                        {expired && <span className="ml-1.5 text-xs text-amber">validity over</span>}
                        {x.projects.length > 0 && <span className="ml-1.5 text-xs text-muted">· project</span>}
                      </td>
                      <td className="num">{formatINR(x.totalAmount)}</td>
                      <td className="num">{formatINR(netPayable(x))}</td>
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
