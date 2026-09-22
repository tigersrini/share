import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, PageTitle } from "@/components/ui";
import { formatDate, formatINR } from "@/lib/format";
import AddVehicleForm from "./AddVehicleForm";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "zinc" | "orange" | "green" | "blue"> = {
  OPEN: "blue",
  IN_PROGRESS: "orange",
  COMPLETED: "green",
  BILLED: "zinc",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      vehicles: true,
      jobCards: {
        orderBy: { createdAt: "desc" },
        include: { vehicle: true, bill: true },
      },
    },
  });
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <PageTitle subtitle={customer.phone}>{customer.name}</PageTitle>
        <Link href={`/jobcards/new?customerId=${customer.id}`}>
          <Button>+ New Job Card</Button>
        </Link>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Vehicles</h2>
          <ul className="space-y-2 text-sm">
            {customer.vehicles.map((v) => (
              <li key={v.id} className="flex items-center justify-between">
                <span>
                  {v.make} {v.model} <span className="text-zinc-500">· {v.regNumber}</span>
                </span>
              </li>
            ))}
            {customer.vehicles.length === 0 && (
              <li className="text-zinc-500">No vehicles yet.</li>
            )}
          </ul>
          <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <AddVehicleForm customerId={customer.id} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Contact</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Phone</dt>
              <dd>{customer.phone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Address</dt>
              <dd className="text-right">{customer.address ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Customer since</dt>
              <dd>{formatDate(customer.createdAt)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Job card history</h2>
        <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
          {customer.jobCards.map((jc) => (
            <li key={jc.id}>
              <Link
                href={`/jobcards/${jc.id}`}
                className="flex items-center justify-between py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <div>
                  <div className="font-medium">
                    {jc.vehicle.make} {jc.vehicle.model} · {jc.vehicle.regNumber}
                  </div>
                  <div className="text-xs text-zinc-500">{jc.complaints}</div>
                </div>
                <div className="flex items-center gap-3">
                  {jc.bill && <span className="text-xs">{formatINR(jc.bill.grandTotal)}</span>}
                  <Badge tone={statusTone[jc.status]}>{jc.status.replace("_", " ")}</Badge>
                  <span className="text-xs text-zinc-500">{formatDate(jc.createdAt)}</span>
                </div>
              </Link>
            </li>
          ))}
          {customer.jobCards.length === 0 && (
            <li className="py-6 text-center text-zinc-500">No job cards yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
