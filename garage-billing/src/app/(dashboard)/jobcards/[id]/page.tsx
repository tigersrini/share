import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, PageTitle } from "@/components/ui";
import { formatDate, formatINR } from "@/lib/format";
import AddPartForm from "./AddPartForm";
import AddLaborForm from "./AddLaborForm";
import StatusControl from "./StatusControl";
import RemovePartButton from "./RemovePartButton";
import RemoveLaborButton from "./RemoveLaborButton";
import VehiclePhotos from "./VehiclePhotos";
import { JOB_STATUS_LABELS, JOB_STATUS_TONE, type JobStatus } from "@/lib/jobStatus";

export const dynamic = "force-dynamic";

export default async function JobCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobCard = await prisma.jobCard.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      parts: { include: { sparePart: true }, orderBy: { createdAt: "asc" } },
      labors: { orderBy: { createdAt: "asc" } },
      images: { orderBy: { createdAt: "desc" } },
      bill: true,
    },
  });
  if (!jobCard) notFound();

  const partsTotal = jobCard.parts.reduce((s, p) => s + p.priceAtSale * p.quantity, 0);
  const laborTotal = jobCard.labors.reduce((s, l) => s + l.amount, 0);
  const runningTotal = partsTotal + laborTotal;
  const locked = jobCard.status === "BILLED";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageTitle
          subtitle={
            <>
              <Link href={`/customers/${jobCard.customer.id}`} className="hover:underline">
                {jobCard.customer.name} · {jobCard.customer.phone}
              </Link>
            </>
          }
        >
          {jobCard.vehicle.make} {jobCard.vehicle.model} · {jobCard.vehicle.regNumber}
        </PageTitle>
        <div className="flex items-center gap-2">
          <Badge tone={JOB_STATUS_TONE[jobCard.status as JobStatus]}>
            {JOB_STATUS_LABELS[jobCard.status as JobStatus]}
          </Badge>
          {!locked && <StatusControl jobCardId={jobCard.id} currentStatus={jobCard.status} />}
        </div>
      </div>

      <Card className="mb-4">
        <h2 className="mb-1 text-sm font-semibold">Complaint</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{jobCard.complaints}</p>
        {jobCard.notes && (
          <>
            <h2 className="mb-1 mt-3 text-sm font-semibold">Notes</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{jobCard.notes}</p>
          </>
        )}
        <div className="mt-2 text-xs text-zinc-500">
          Opened {formatDate(jobCard.createdAt)}
          {jobCard.odometer ? ` · Odometer: ${jobCard.odometer} km` : ""}
          {jobCard.estimatedAmount != null ? ` · Estimated: ${formatINR(jobCard.estimatedAmount)}` : ""}
        </div>
        <a
          href={`/api/jobcards/${jobCard.id}/acknowledgement/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs font-medium text-orange-600 hover:underline"
        >
          View acknowledgement PDF
        </a>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-semibold">Vehicle photos</h2>
        <VehiclePhotos jobCardId={jobCard.id} photos={jobCard.images} locked={locked} />
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-semibold">Parts used</h2>
        {!locked && <AddPartForm jobCardId={jobCard.id} />}
        <ul className="mt-3 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
          {jobCard.parts.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span>
                {p.sparePart.name} <span className="text-zinc-500">× {p.quantity}</span>
              </span>
              <span className="flex items-center gap-3">
                <span>{formatINR(p.priceAtSale * p.quantity)}</span>
                {!locked && <RemovePartButton jobCardId={jobCard.id} jobCardPartId={p.id} />}
              </span>
            </li>
          ))}
          {jobCard.parts.length === 0 && (
            <li className="py-3 text-center text-zinc-500">No parts scanned yet.</li>
          )}
        </ul>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-semibold">Labor / service charges</h2>
        {!locked && <AddLaborForm jobCardId={jobCard.id} />}
        <ul className="mt-3 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
          {jobCard.labors.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-2">
              <span>{l.description}</span>
              <span className="flex items-center gap-3">
                <span>{formatINR(l.amount)}</span>
                {!locked && <RemoveLaborButton jobCardId={jobCard.id} laborId={l.id} />}
              </span>
            </li>
          ))}
          {jobCard.labors.length === 0 && (
            <li className="py-3 text-center text-zinc-500">No labor charges added yet.</li>
          )}
        </ul>
      </Card>

      <Card>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Parts total</span>
          <span>{formatINR(partsTotal)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-zinc-500">Labor total</span>
          <span>{formatINR(laborTotal)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-zinc-200 pt-2 text-base font-semibold dark:border-zinc-800">
          <span>Running total</span>
          <span>{formatINR(runningTotal)}</span>
        </div>

        <div className="mt-4">
          {jobCard.bill ? (
            <Link href={`/jobcards/${jobCard.id}/bill`}>
              <Button variant="secondary">View final bill →</Button>
            </Link>
          ) : (
            <Link href={`/jobcards/${jobCard.id}/bill`}>
              <Button>Generate final bill →</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
