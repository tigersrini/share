"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { bool, fail, num, oneOf, optNum, optStr, str, type ActionState } from "@/lib/form";
import { recordMovement } from "@/lib/stock";
import { ITEM_CATEGORIES } from "@/lib/labels";

function readItem(fd: FormData) {
  return {
    sku: str(fd, "sku").toUpperCase(),
    name: str(fd, "name"),
    category: oneOf(str(fd, "category"), ITEM_CATEGORIES, "OTHER"),
    make: optStr(fd, "make"),
    spec: optStr(fd, "spec"),
    uom: str(fd, "uom") || "Nos",
    hsn: optStr(fd, "hsn"),
    gstRate: num(fd, "gstRate"),
    sellPrice: num(fd, "sellPrice"),
    reorderLevel: num(fd, "reorderLevel"),
    notes: optStr(fd, "notes"),
  };
}

function refresh(id?: string) {
  revalidatePath("/inventory");
  if (id) revalidatePath(`/inventory/${id}`);
  revalidatePath("/");
  revalidatePath("/finance");
}

export async function createItem(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireStaff();
  const data = readItem(fd);
  if (!data.name) return fail("Item name is required.");
  if (!data.sku) return fail("SKU / code is required.");
  const openingQty = num(fd, "openingQty");
  const openingCost = num(fd, "openingCost");
  if (openingQty < 0 || openingCost < 0) return fail("Opening stock cannot be negative.");

  let id: string;
  try {
    const item = await prisma.$transaction(async (tx) => {
      const it = await tx.item.create({ data });
      if (openingQty > 0) {
        await recordMovement(tx, { itemId: it.id, type: "OPENING", qty: openingQty, unitCost: openingCost, note: "Opening stock", createdByName: session.name });
      }
      return it;
    });
    id = item.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail("That SKU already exists.");
    throw e;
  }
  refresh();
  redirect(`/inventory/${id}`);
}

export async function updateItem(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff();
  const id = str(fd, "id");
  const data = readItem(fd);
  if (!data.name || !data.sku) return fail("Name and SKU are required.");
  const costPrice = optNum(fd, "costPrice");
  try {
    await prisma.item.update({
      where: { id },
      data: { ...data, ...(costPrice !== null && costPrice >= 0 ? { costPrice } : {}), active: bool(fd, "active") },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail("That SKU already exists.");
    throw e;
  }
  refresh(id);
  return { ok: "Saved." };
}

/** Goods received from a supplier. Recalculates the weighted-average cost. */
export async function receiveStock(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireStaff();
  const itemId = str(fd, "itemId");
  const qty = num(fd, "qty");
  const unitCost = num(fd, "unitCost", -1);
  if (!(qty > 0)) return fail("Enter the quantity received.");
  if (unitCost < 0) return fail("Enter the purchase price per unit (ex-GST).");
  try {
    await prisma.$transaction((tx) =>
      recordMovement(tx, { itemId, type: "PURCHASE", qty, unitCost, supplierId: optStr(fd, "supplierId"), reference: optStr(fd, "reference"), note: optStr(fd, "note"), createdByName: session.name }),
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not record the purchase.");
  }
  refresh(itemId);
  return { ok: "Stock received." };
}

export async function adjustStock(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireStaff();
  const itemId = str(fd, "itemId");
  const qty = num(fd, "qty");
  const note = str(fd, "note");
  if (!(qty > 0)) return fail("Enter the quantity to add or remove.");
  if (!note) return fail("Give a reason (damage, recount, sample…).");
  try {
    await prisma.$transaction((tx) =>
      recordMovement(tx, { itemId, type: "ADJUSTMENT", qty, direction: str(fd, "direction") === "remove" ? -1 : 1, note, createdByName: session.name }),
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not adjust stock.");
  }
  refresh(itemId);
  return { ok: "Stock adjusted." };
}

export async function createSupplier(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff();
  const name = str(fd, "name");
  if (!name) return fail("Supplier name is required.");
  await prisma.supplier.create({ data: { name, phone: optStr(fd, "phone"), email: optStr(fd, "email"), gstin: optStr(fd, "gstin"), address: optStr(fd, "address"), notes: optStr(fd, "notes") } });
  revalidatePath("/inventory/suppliers");
  return { ok: "Supplier added." };
}

export async function deleteSupplier(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const used = await prisma.stockMovement.count({ where: { supplierId: id } });
  if (used > 0) throw new Error("This supplier has purchases recorded and cannot be deleted.");
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/inventory/suppliers");
}
