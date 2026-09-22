import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  barcode: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  make: z.string().optional(),
  category: z.string().optional(),
  costPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().int().min(0).default(0),
  lowStockAt: z.coerce.number().int().min(0).default(2),
});

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
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
  return NextResponse.json(parts);
}

/** Creates a new spare part, or if the barcode already exists, adds the given
 * quantity as new stock inward (recording an inventory transaction). */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.sparePart.findUnique({ where: { barcode: data.barcode } });

  if (existing) {
    const updated = await prisma.$transaction(async (tx) => {
      const part = await tx.sparePart.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          description: data.description,
          make: data.make,
          category: data.category,
          costPrice: data.costPrice,
          sellingPrice: data.sellingPrice,
          quantity: { increment: data.quantity },
          lowStockAt: data.lowStockAt,
        },
      });
      if (data.quantity > 0) {
        await tx.inventoryTxn.create({
          data: {
            sparePartId: part.id,
            type: "IN",
            quantity: data.quantity,
            note: "Stock inward (existing part)",
          },
        });
      }
      return part;
    });
    return NextResponse.json(updated);
  }

  const created = await prisma.$transaction(async (tx) => {
    const part = await tx.sparePart.create({ data });
    if (data.quantity > 0) {
      await tx.inventoryTxn.create({
        data: {
          sparePartId: part.id,
          type: "IN",
          quantity: data.quantity,
          note: "Initial stock inward",
        },
      });
    }
    return part;
  });
  return NextResponse.json(created, { status: 201 });
}
