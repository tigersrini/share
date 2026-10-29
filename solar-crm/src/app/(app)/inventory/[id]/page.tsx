import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ActionForm from "@/components/ActionForm";
import { Badge, Card, Dl, EmptyState, Field, Input, PageHeader, SectionTitle, Select, TableWrap } from "@/components/ui";
import { formatDateTime, formatINR, formatNum } from "@/lib/format";
import { ITEM_CATEGORY_LABEL, MOVEMENT_LABEL } from "@/lib/labels";
import { adjustStock, receiveStock, updateItem } from "../actions";
import ItemFields from "../ItemFields";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const i = await prisma.item.findUnique({ where: { id }, select: { name: true } });
  return { title: i?.name ?? "Item" };
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, suppliers] = await Promise.all([
    prisma.item.findUnique({
      where: { id },
      include: { movements: { orderBy: { createdAt: "desc" }, take: 100, include: { supplier: true, project: { select: { id: true, code: true } } } } },
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!item) notFound();
  const low = item.reorderLevel > 0 && item.quantity <= item.reorderLevel;

  return (
    <div>
      <PageHeader
        title={item.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span>{item.sku}</span>
            <Badge>{ITEM_CATEGORY_LABEL[item.category]}</Badge>
            {!item.active && <Badge tone="red">Inactive</Badge>}
            {low && <Badge tone="orange">Low stock</Badge>}
          </span>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card><div className="text-xs text-muted">On hand</div><div className="text-xl font-semibold tabular-nums">{formatNum(item.quantity)} <span className="text-sm font-normal text-muted">{item.uom}</span></div></Card>
            <Card><div className="text-xs text-muted">Average cost</div><div className="text-xl font-semibold tabular-nums">{formatINR(item.costPrice)}</div></Card>
            <Card><div className="text-xs text-muted">Selling price</div><div className="text-xl font-semibold tabular-nums">{formatINR(item.sellPrice)}</div></Card>
            <Card><div className="text-xs text-muted">Stock value</div><div className="text-xl font-semibold tabular-nums">{formatINR(item.quantity * item.costPrice)}</div></Card>
          </div>

          <Card>
            <SectionTitle>Receive stock (purchase)</SectionTitle>
            <ActionForm action={receiveStock} submitLabel="Add to stock" pendingLabel="Saving…" resetOnSuccess>
              <input type="hidden" name="itemId" value={item.id} />
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label={`Quantity (${item.uom}) *`}><Input name="qty" type="number" min="0" step="any" required /></Field>
                <Field label="Cost / unit ₹ (ex-GST) *"><Input name="unitCost" type="number" min="0" step="any" required defaultValue={item.costPrice || ""} /></Field>
                <Field label="Supplier">
                  <Select name="supplierId" defaultValue="">
                    <option value="">—</option>
                    {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </Select>
                </Field>
                <Field label="Bill / ref no."><Input name="reference" /></Field>
              </div>
            </ActionForm>
          </Card>

          <Card pad={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0"><SectionTitle>Stock history</SectionTitle></div>
            {item.movements.length === 0 ? (
              <EmptyState>No movements yet.</EmptyState>
            ) : (
              <TableWrap>
                <table className="tbl">
                  <thead><tr><th>When</th><th>Type</th><th className="num">Qty</th><th className="num">Unit cost</th><th>Details</th></tr></thead>
                  <tbody>
                    {item.movements.map((m) => (
                      <tr key={m.id}>
                        <td className="whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                        <td>{MOVEMENT_LABEL[m.type]}</td>
                        <td className={`num ${m.qty < 0 ? "text-danger" : "text-brand-strong"}`}>{m.qty > 0 ? "+" : ""}{formatNum(m.qty)}</td>
                        <td className="num">{formatINR(m.unitCost)}</td>
                        <td className="text-xs text-muted">
                          {m.project && <Link href={`/projects/${m.project.id}`} className="text-brand">{m.project.code}</Link>}
                          {[m.supplier?.name, m.reference, m.note].filter(Boolean).join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionTitle>Adjust stock</SectionTitle>
            <ActionForm action={adjustStock} submitLabel="Adjust" pendingLabel="Saving…" resetOnSuccess>
              <input type="hidden" name="itemId" value={item.id} />
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Action"><Select name="direction" defaultValue="remove"><option value="remove">Remove</option><option value="add">Add</option></Select></Field>
                  <Field label="Quantity"><Input name="qty" type="number" min="0" step="any" required /></Field>
                </div>
                <Field label="Reason *"><Input name="note" placeholder="Damaged / recount / sample" required /></Field>
              </div>
            </ActionForm>
            <p className="mt-2 text-xs text-muted">To use stock on a job, issue it from the project page so the cost is charged to that project.</p>
          </Card>
          <Card>
            <SectionTitle>Item details</SectionTitle>
            <ActionForm action={updateItem} submitLabel="Save details" pendingLabel="Saving…">
              <input type="hidden" name="id" value={item.id} />
              <div className="space-y-3">
                <ItemFields v={item} />
                <Field label="Average cost (₹)" hint="normally automatic"><Input name="costPrice" type="number" min="0" step="any" defaultValue={item.costPrice} /></Field>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={item.active} className="h-4 w-4 accent-[var(--brand)]" /> Active (shown in pickers)</label>
              </div>
            </ActionForm>
          </Card>
          <Dl items={[["HSN/SAC", item.hsn], ["GST", `${item.gstRate}%`]]} />
        </div>
      </div>
    </div>
  );
}
