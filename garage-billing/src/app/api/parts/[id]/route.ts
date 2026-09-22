import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  make: z.string().optional(),
  category: z.string().optional(),
  costPrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  lowStockAt: z.coerce.number().int().min(0).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const part = await prisma.sparePart.findUnique({
    where: { id },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!part) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(part);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const part = await prisma.sparePart.update({ where: { id }, data: parsed.data });
  return NextResponse.json(part);
}
