import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, PageTitle } from "@/components/ui";
import { formatINR } from "@/lib/format";
import ReportsRangePicker from "./ReportsRangePicker";

export const dynamic = "force-dynamic";

const VALID_RANGES = [7, 30, 90] as const;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = VALID_RANGES.includes(Number(daysParam) as (typeof VALID_RANGES)[number])
    ? Number(daysParam)
    : 30;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const [bills, jobCardParts, allParts] = await Promise.all([
    prisma.bill.findMany({
      where: { createdAt: { gte: since } },
      select: { grandTotal: true, createdAt: true },
    }),
    prisma.jobCardPart.findMany({
      where: { createdAt: { gte: since } },
      select: { sparePartId: true, quantity: true, priceAtSale: true, sparePart: { select: { name: true } } },
    }),
    prisma.sparePart.findMany({ orderBy: { quantity: "asc" } }),
  ]);

  const revenueByDay = new Map<string, number>();
  for (const bill of bills) {
    const key = bill.createdAt.toISOString().slice(0, 10);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + bill.grandTotal);
  }
  const dailyRevenue = [...revenueByDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const totalRevenue = bills.reduce((sum, b) => sum + b.grandTotal, 0);

  const bestSellerMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const jcp of jobCardParts) {
    const existing = bestSellerMap.get(jcp.sparePartId) ?? { name: jcp.sparePart.name, qty: 0, revenue: 0 };
    existing.qty += jcp.quantity;
    existing.revenue += jcp.quantity * jcp.priceAtSale;
    bestSellerMap.set(jcp.sparePartId, existing);
  }
  const bestSellers = [...bestSellerMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

  const lowStock = allParts.filter((p) => p.quantity <= p.lowStockAt);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <PageTitle subtitle="Revenue, best-selling parts, and stock that needs reordering.">Reports</PageTitle>
        <ReportsRangePicker days={days} options={VALID_RANGES} />
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-sm font-semibold">Revenue (last {days} days)</h2>
          <p className="mb-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatINR(totalRevenue)}</p>
          <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
            {dailyRevenue.map(([date, total]) => (
              <li key={date} className="flex justify-between border-b border-zinc-100 py-1 last:border-0 dark:border-zinc-900">
                <span className="text-zinc-500">
                  {new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <span className="font-medium">{formatINR(total)}</span>
              </li>
            ))}
            {dailyRevenue.length === 0 && <li className="py-4 text-center text-zinc-500">No bills in this range.</li>}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Best-selling parts (last {days} days)</h2>
          <ul className="space-y-2 text-sm">
            {bestSellers.map((s, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>{s.name}</span>
                <span className="flex items-center gap-3">
                  <span className="text-zinc-500">×{s.qty}</span>
                  <span className="font-medium">{formatINR(s.revenue)}</span>
                </span>
              </li>
            ))}
            {bestSellers.length === 0 && <li className="py-4 text-center text-zinc-500">No parts sold in this range.</li>}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Low stock ({lowStock.length})</h2>
          <a href="/api/reports/low-stock/export">
            <Button variant="secondary">Export CSV</Button>
          </a>
        </div>
        <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
          {lowStock.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <Link href={`/inventory/${p.id}`} className="hover:underline">
                {p.name}
              </Link>
              <span className="flex items-center gap-2">
                <span className="text-zinc-500">{p.quantity} in stock</span>
                <Badge tone="red">low</Badge>
              </span>
            </li>
          ))}
          {lowStock.length === 0 && <li className="py-4 text-center text-zinc-500">Nothing low on stock.</li>}
        </ul>
      </Card>
    </div>
  );
}
