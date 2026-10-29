import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HBars } from "@/components/Charts";
import { Badge, Card, EmptyState, LinkButton, PageHeader, SectionTitle, StatCard, TableWrap } from "@/components/ui";
import { formatINR, formatINRShort, formatNum } from "@/lib/format";
import { ITEM_CATEGORIES, ITEM_CATEGORY_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; low?: string }> }) {
  const { q, cat, low } = await searchParams;
  const all = await prisma.item.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] });

  const isLow = (i: (typeof all)[number]) => i.quantity <= i.reorderLevel;
  const stockValue = all.reduce((s, i) => s + i.quantity * i.costPrice, 0);
  const saleValue = all.reduce((s, i) => s + i.quantity * i.sellPrice, 0);
  const lowCount = all.filter((i) => isLow(i) && i.reorderLevel > 0).length;
  const outCount = all.filter((i) => i.quantity <= 0).length;

  const byCat = ITEM_CATEGORIES.map((c) => ({
    label: ITEM_CATEGORY_LABEL[c],
    value: all.filter((i) => i.category === c).reduce((s, i) => s + i.quantity * i.costPrice, 0),
  }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const t = q?.trim().toLowerCase();
  const list = all.filter(
    (i) =>
      (!cat || i.category === cat) &&
      (!low || (isLow(i) && i.reorderLevel > 0)) &&
      (!t || `${i.name} ${i.sku} ${i.make ?? ""} ${i.spec ?? ""}`.toLowerCase().includes(t)),
  );

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Panels, inverters, structures, cables and everything else you stock"
        actions={
          <>
            <LinkButton href="/inventory/suppliers">Suppliers</LinkButton>
            <LinkButton href="/api/export/stock">Export CSV</LinkButton>
            <LinkButton href="/inventory/new" variant="primary">+ New item</LinkButton>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Stock value (at cost)" value={formatINRShort(stockValue)} sub={`${formatNum(all.length)} active items`} tone="green" />
        <StatCard label="Potential sales value" value={formatINRShort(saleValue)} sub={`${formatINRShort(saleValue - stockValue)} margin on hand`} />
        <StatCard label="Low stock" value={lowCount} tone={lowCount ? "orange" : undefined} sub="at or below reorder level" href="/inventory?low=1" />
        <StatCard label="Out of stock" value={outCount} tone={outCount ? "red" : undefined} sub="zero on hand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <SectionTitle>Stock value by category</SectionTitle>
          <HBars rows={byCat} />
        </Card>

        <div className="space-y-3 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2">
            <form className="min-w-48 flex-1">
              {cat && <input type="hidden" name="cat" value={cat} />}
              <input name="q" defaultValue={q} placeholder="Search name, SKU, make…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            </form>
            <div className="flex flex-wrap gap-1.5">
              <Link href="/inventory" className={`rounded-full px-3 py-1 text-xs font-medium ${!cat && !low ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-ink"}`}>All</Link>
              {ITEM_CATEGORIES.filter((c) => all.some((i) => i.category === c)).map((c) => (
                <Link key={c} href={`/inventory?cat=${c}`} className={`rounded-full px-3 py-1 text-xs font-medium ${cat === c ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-ink"}`}>{ITEM_CATEGORY_LABEL[c]}</Link>
              ))}
            </div>
          </div>
          <Card pad={false}>
            {list.length === 0 ? (
              <EmptyState>{all.length === 0 ? <>No items yet. <Link href="/inventory/new" className="font-medium text-brand underline">Add your first item</Link>.</> : "No items match."}</EmptyState>
            ) : (
              <TableWrap>
                <table className="tbl">
                  <thead><tr><th>Item</th><th className="num">On hand</th><th className="num">Avg cost</th><th className="num">Sell</th><th className="num">Value</th></tr></thead>
                  <tbody>
                    {list.map((i) => (
                      <tr key={i.id} className="row-link">
                        <td>
                          <Link href={`/inventory/${i.id}`} className="font-medium hover:text-brand">{i.name}</Link>
                          <div className="text-xs text-muted">{i.sku}{i.make ? ` · ${i.make}` : ""}{i.spec ? ` · ${i.spec}` : ""}</div>
                        </td>
                        <td className="num">
                          {formatNum(i.quantity)} {i.uom}
                          {i.quantity <= 0 ? <div><Badge tone="red">Out</Badge></div> : i.reorderLevel > 0 && isLow(i) ? <div><Badge tone="orange">Low</Badge></div> : null}
                        </td>
                        <td className="num">{formatINR(i.costPrice)}</td>
                        <td className="num">{formatINR(i.sellPrice)}</td>
                        <td className="num font-medium">{formatINR(i.quantity * i.costPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
