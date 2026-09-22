import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge, Card, PageTitle } from "@/components/ui";
import { formatDate, formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const part = await prisma.sparePart.findUnique({
    where: { id },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!part) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle subtitle={`Barcode: ${part.barcode}`}>{part.name}</PageTitle>

      <Card className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs text-zinc-500">Make</div>
          <div className="font-medium">{part.make ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Category</div>
          <div className="font-medium">{part.category ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">In stock</div>
          <div className="font-medium">
            {part.quantity}{" "}
            {part.quantity <= part.lowStockAt && <Badge tone="red">low</Badge>}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Cost price</div>
          <div className="font-medium">{formatINR(part.costPrice)}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Selling price</div>
          <div className="font-medium">{formatINR(part.sellingPrice)}</div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Stock movement</h2>
        <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
          {part.transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2">
              <span>
                <Badge tone={t.type === "IN" ? "green" : "orange"}>{t.type}</Badge>{" "}
                <span className="ml-1">{t.note ?? (t.type === "IN" ? "Stock inward" : "Used in job card")}</span>
              </span>
              <span className="text-zinc-500">
                {t.type === "OUT" ? "-" : "+"}
                {t.quantity} · {formatDate(t.createdAt)}
              </span>
            </li>
          ))}
          {part.transactions.length === 0 && (
            <li className="py-4 text-center text-zinc-500">No movement recorded yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
