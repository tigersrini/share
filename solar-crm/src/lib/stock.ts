import type { MovementType } from "@prisma/client";
import type { Tx } from "./prisma";
import { round2 } from "./format";

export interface MovementInput {
  itemId: string;
  type: MovementType;
  /** Positive quantity; sign is derived from the type unless `signed` is passed. */
  qty: number;
  /** Required for PURCHASE/OPENING. Others use the item's current average cost. */
  unitCost?: number;
  projectId?: string | null;
  supplierId?: string | null;
  reference?: string | null;
  note?: string | null;
  createdByName?: string | null;
  /** For ADJUSTMENT — whether to add (+) or remove (−) */
  direction?: 1 | -1;
}

/**
 * The single place stock changes. Updates Item.quantity, keeps a weighted-average cost on
 * purchases, snapshots the cost on every movement (so project costing stays correct later),
 * and refuses to issue more than is on hand.
 */
export async function recordMovement(tx: Tx, m: MovementInput) {
  if (!(m.qty > 0)) throw new Error("Quantity must be greater than zero.");
  const item = await tx.item.findUnique({ where: { id: m.itemId } });
  if (!item) throw new Error("Item not found.");

  const sign = m.type === "ISSUE" ? -1 : m.type === "ADJUSTMENT" ? (m.direction ?? 1) : 1;
  const signedQty = sign * m.qty;
  if (item.quantity + signedQty < -1e-9) {
    throw new Error(`Only ${item.quantity} ${item.uom} of ${item.name} in stock — cannot remove ${m.qty}.`);
  }

  let unitCost = item.costPrice;
  let newCost = item.costPrice;
  if ((m.type === "PURCHASE" || m.type === "OPENING") && m.unitCost !== undefined) {
    unitCost = m.unitCost;
    const onHand = Math.max(0, item.quantity);
    const total = onHand + m.qty;
    newCost = total > 0 ? round2((onHand * item.costPrice + m.qty * m.unitCost) / total) : m.unitCost;
  }

  await tx.item.update({
    where: { id: item.id },
    data: { quantity: { increment: signedQty }, costPrice: newCost },
  });
  return tx.stockMovement.create({
    data: {
      itemId: item.id,
      type: m.type,
      qty: signedQty,
      unitCost,
      projectId: m.projectId ?? null,
      supplierId: m.supplierId ?? null,
      reference: m.reference ?? null,
      note: m.note ?? null,
      createdByName: m.createdByName ?? null,
    },
  });
}

/** Material cost of a set of movements that were issued to projects (issues minus returns). */
export function materialCost(movements: { qty: number; unitCost: number }[]): number {
  return round2(-movements.reduce((s, m) => s + m.qty * m.unitCost, 0));
}
