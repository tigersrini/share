import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ActionForm from "@/components/ActionForm";
import ConfirmButton from "@/components/ConfirmButton";
import { Card, EmptyState, Field, Input, PageHeader, SectionTitle, TableWrap } from "@/components/ui";
import { formatINR } from "@/lib/format";
import { createSupplier, deleteSupplier } from "../actions";

export const metadata: Metadata = { title: "Suppliers" };
export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const [suppliers, session, spend] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    getSession(),
    prisma.stockMovement.findMany({ where: { type: "PURCHASE", supplierId: { not: null } }, select: { supplierId: true, qty: true, unitCost: true } }),
  ]);
  const spent = new Map<string, number>();
  for (const m of spend) spent.set(m.supplierId!, (spent.get(m.supplierId!) ?? 0) + m.qty * m.unitCost);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Suppliers" subtitle={<Link href="/inventory" className="text-brand">← Inventory</Link>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card pad={false} className="lg:col-span-2">
          {suppliers.length === 0 ? (
            <EmptyState>No suppliers yet.</EmptyState>
          ) : (
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>Supplier</th><th>Contact</th><th className="num">Purchased (ex-GST)</th><th /></tr></thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <td><div className="font-medium">{s.name}</div><div className="text-xs text-muted">{[s.gstin, s.address].filter(Boolean).join(" · ")}</div></td>
                      <td className="text-sm">{[s.phone, s.email].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="num">{formatINR(spent.get(s.id) ?? 0)}</td>
                      <td className="text-right">
                        {session?.role === "ADMIN" && (
                          <form action={deleteSupplier}>
                            <input type="hidden" name="id" value={s.id} />
                            <ConfirmButton message={`Delete ${s.name}?`} variant="ghost" className="px-2 py-0.5 text-xs text-danger">✕</ConfirmButton>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
        <Card>
          <SectionTitle>Add supplier</SectionTitle>
          <ActionForm action={createSupplier} submitLabel="Add supplier" pendingLabel="Saving…" resetOnSuccess>
            <div className="space-y-3">
              <Field label="Name *"><Input name="name" required /></Field>
              <Field label="Phone"><Input name="phone" type="tel" /></Field>
              <Field label="Email"><Input name="email" type="email" /></Field>
              <Field label="GSTIN"><Input name="gstin" className="uppercase" /></Field>
              <Field label="Address"><Input name="address" /></Field>
            </div>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
