import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Card, PageTitle } from "@/components/ui";
import { formatDate, formatINR } from "@/lib/format";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/jobStatus";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [partCount, lowStockParts, openJobCards, recentBills, customerCount] = await Promise.all([
    prisma.sparePart.count(),
    prisma.sparePart.findMany({ where: {}, orderBy: { quantity: "asc" }, take: 200 }).then((parts) =>
      parts.filter((p) => p.quantity <= p.lowStockAt)
    ),
    prisma.jobCard.findMany({
      where: { status: { not: "BILLED" } },
      include: { customer: true, vehicle: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.bill.findMany({
      include: { jobCard: { include: { customer: true, vehicle: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.customer.count(),
  ]);

  const stats = [
    { label: "Spare parts", value: partCount, href: "/inventory" },
    { label: "Low stock alerts", value: lowStockParts.length, href: "/inventory" },
    { label: "Vehicles in garage", value: openJobCards.length, href: "/jobcards" },
    { label: "Customers", value: customerCount, href: "/customers" },
  ];

  return (
    <div>
      <PageTitle subtitle="Sparks Racing and Garage — inventory, job cards and billing at a glance.">
        Dashboard
      </PageTitle>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:border-orange-400">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{s.value}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Vehicles currently in garage</h2>
            <Link href="/jobcards" className="text-xs font-medium text-orange-600 hover:underline">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {openJobCards.map((jc) => (
              <li key={jc.id}>
                <Link href={`/jobcards/${jc.id}`} className="flex items-center justify-between py-2 hover:underline">
                  <span>
                    {jc.vehicle.make} {jc.vehicle.model} · {jc.vehicle.regNumber}
                  </span>
                  <Badge>{JOB_STATUS_LABELS[jc.status as JobStatus]}</Badge>
                </Link>
              </li>
            ))}
            {openJobCards.length === 0 && <li className="py-4 text-center text-zinc-500">Garage is empty.</li>}
          </ul>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent bills</h2>
          </div>
          <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {recentBills.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2">
                <span>
                  {b.jobCard.customer.name}
                  <span className="text-zinc-500"> · {b.jobCard.vehicle.regNumber}</span>
                </span>
                <span className="text-right">
                  <div className="font-medium">{formatINR(b.grandTotal)}</div>
                  <div className="text-xs text-zinc-500">{formatDate(b.createdAt)}</div>
                </span>
              </li>
            ))}
            {recentBills.length === 0 && <li className="py-4 text-center text-zinc-500">No bills generated yet.</li>}
          </ul>
        </Card>
      </div>

      {lowStockParts.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-3 text-sm font-semibold text-red-600 dark:text-red-400">Low stock parts</h2>
          <ul className="flex flex-wrap gap-2">
            {lowStockParts.map((p) => (
              <li key={p.id}>
                <Link href={`/inventory/${p.id}`}>
                  <Badge tone="red">
                    {p.name} ({p.quantity})
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
