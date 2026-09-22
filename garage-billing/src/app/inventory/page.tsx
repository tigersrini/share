import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, PageTitle } from "@/components/ui";
import { formatINR } from "@/lib/format";
import InventorySearch from "./InventorySearch";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const parts = await prisma.sparePart.findMany({
    where: q
      ? {
          OR: [
            { barcode: { contains: q } },
            { name: { contains: q } },
            { make: { contains: q } },
            { category: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
  });

  const lowStockCount = parts.filter((p) => p.quantity <= p.lowStockAt).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <PageTitle subtitle="Every screw, filter, oil, brake shoe and piston in the garage.">
          Inventory
        </PageTitle>
        <Link href="/inventory/new">
          <Button>+ Scan / Add Part</Button>
        </Link>
      </div>

      <Card className="mb-4">
        <InventorySearch initialQuery={q ?? ""} />
      </Card>

      {lowStockCount > 0 && (
        <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-900/20 dark:text-orange-300">
          {lowStockCount} part{lowStockCount > 1 ? "s are" : " is"} at or below its low-stock threshold.
        </div>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-3">Part</th>
              <th className="px-4 py-3">Barcode</th>
              <th className="px-4 py-3">Make</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Sell Price</th>
              <th className="px-4 py-3 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr
                key={p.id}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900/50"
              >
                <td className="px-4 py-3">
                  <Link href={`/inventory/${p.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                    {p.name}
                  </Link>
                  {p.description && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{p.description}</div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">{p.barcode}</td>
                <td className="px-4 py-3">{p.make ?? "—"}</td>
                <td className="px-4 py-3">{p.category ?? "—"}</td>
                <td className="px-4 py-3 text-right">{formatINR(p.costPrice)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatINR(p.sellingPrice)}</td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      p.quantity <= p.lowStockAt
                        ? "font-semibold text-red-600 dark:text-red-400"
                        : "font-semibold text-zinc-900 dark:text-zinc-100"
                    }
                  >
                    {p.quantity}
                  </span>
                  {p.quantity <= p.lowStockAt && (
                    <span className="ml-2">
                      <Badge tone="red">low</Badge>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {parts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  No parts found. Scan a barcode to add your first item.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
