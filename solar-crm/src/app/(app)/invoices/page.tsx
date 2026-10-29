import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Card, EmptyState, LinkButton, PageHeader, TableWrap } from "@/components/ui";
import { financialYear, financialYearStart, formatDate, formatINR } from "@/lib/format";

export const metadata: Metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string }> }) {
  const { q, view = "fy" } = await searchParams;
  const where = {
    ...(view === "fy" ? { date: { gte: financialYearStart() } } : {}),
    ...(q?.trim() ? { OR: [{ number: { contains: q.trim(), mode: "insensitive" as const } }, { billName: { contains: q.trim(), mode: "insensitive" as const } }] } : {}),
  };
  const invoices = await prisma.invoice.findMany({ where, orderBy: { date: "desc" }, take: 300, include: { payments: { select: { amount: true } } } });
  const live = invoices.filter((i) => i.status !== "CANCELLED");
  const taxable = live.reduce((s, i) => s + i.subtotal, 0);
  const gst = live.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
  const billed = live.reduce((s, i) => s + i.total, 0);
  const paid = live.reduce((s, i) => s + i.payments.reduce((a, p) => a + p.amount, 0), 0);

  return (
    <div>
      <PageHeader
        title="Tax invoices"
        subtitle={`${view === "fy" ? `FY ${financialYear()}` : "All time"} · taxable ${formatINR(taxable)} · GST ${formatINR(gst)} · billed ${formatINR(billed)} · received against invoices ${formatINR(paid)}`}
        actions={<LinkButton href="/invoices/new" variant="primary">+ New invoice</LinkButton>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="min-w-56 flex-1">
          <input type="hidden" name="view" value={view} />
          <input name="q" defaultValue={q} placeholder="Search number or customer…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </form>
        {[["fy", `FY ${financialYear()}`], ["all", "All time"]].map(([k, l]) => (
          <Link key={k} href={`/invoices?view=${k}`} className={`rounded-full px-3 py-1 text-xs font-medium ${view === k ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-ink"}`}>{l}</Link>
        ))}
      </div>
      <Card pad={false}>
        {invoices.length === 0 ? (
          <EmptyState>No invoices yet.</EmptyState>
        ) : (
          <TableWrap>
            <table className="tbl">
              <thead>
                <tr><th>Number</th><th>Date</th><th>Bill to</th><th className="num">Taxable</th><th className="num">GST</th><th className="num">Total</th><th className="num">Paid</th><th>Status</th></tr>
              </thead>
              <tbody>
                {invoices.map((i) => {
                  const p = i.payments.reduce((a, x) => a + x.amount, 0);
                  const cancelled = i.status === "CANCELLED";
                  return (
                    <tr key={i.id} className={`row-link ${cancelled ? "opacity-60" : ""}`}>
                      <td><Link href={`/invoices/${i.id}`} className="font-medium hover:text-brand">{i.number}</Link></td>
                      <td className="whitespace-nowrap">{formatDate(i.date)}</td>
                      <td>{i.billName}</td>
                      <td className="num">{formatINR(i.subtotal)}</td>
                      <td className="num">{formatINR(i.cgst + i.sgst + i.igst)}</td>
                      <td className="num font-medium">{formatINR(i.total)}</td>
                      <td className="num">{p > 0 ? formatINR(p) : "—"}</td>
                      <td>{cancelled ? <Badge tone="red">Cancelled</Badge> : p >= i.total - 1 ? <Badge tone="green">Paid</Badge> : p > 0 ? <Badge tone="orange">Part paid</Badge> : <Badge tone="blue">Issued</Badge>}</td>
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
