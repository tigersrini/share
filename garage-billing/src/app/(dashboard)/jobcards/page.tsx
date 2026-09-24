import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Card, PageTitle } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { JOB_STATUS_LABELS, JOB_STATUS_TONE } from "@/lib/jobStatus";

export const dynamic = "force-dynamic";

export default async function JobCardsPage() {
  const jobCards = await prisma.jobCard.findMany({
    where: { status: { not: "BILLED" } },
    include: { customer: true, vehicle: true, parts: true, labors: true },
    orderBy: { createdAt: "desc" },
  });

  const columns: { status: "OPEN" | "IN_PROGRESS" | "COMPLETED"; label: string }[] = [
    { status: "OPEN", label: JOB_STATUS_LABELS.OPEN },
    { status: "IN_PROGRESS", label: JOB_STATUS_LABELS.IN_PROGRESS },
    { status: "COMPLETED", label: `${JOB_STATUS_LABELS.COMPLETED} — ready to bill` },
  ];

  return (
    <div>
      <PageTitle subtitle="The garage floor — every vehicle currently in for service.">Job Cards</PageTitle>

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((col) => {
          const items = jobCards.filter((jc) => jc.status === col.status);
          return (
            <div key={col.status}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {col.label} <Badge>{items.length}</Badge>
              </h2>
              <div className="space-y-3">
                {items.map((jc) => (
                  <Link key={jc.id} href={`/jobcards/${jc.id}`}>
                    <Card className="hover:border-orange-400">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-medium">
                          {jc.vehicle.make} {jc.vehicle.model}
                        </span>
                        <Badge tone={JOB_STATUS_TONE[jc.status as keyof typeof JOB_STATUS_TONE]}>{jc.vehicle.regNumber}</Badge>
                      </div>
                      <div className="text-xs text-zinc-500">{jc.customer.name} · {jc.customer.phone}</div>
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{jc.complaints}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                        <span>{jc.parts.length} part(s) · {jc.labors.length} labor item(s)</span>
                        <span>{formatDate(jc.createdAt)}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
                {items.length === 0 && (
                  <p className="text-sm text-zinc-400">Nothing here.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
