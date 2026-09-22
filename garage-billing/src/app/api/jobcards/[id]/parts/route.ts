import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { invalidJsonResponse, readJsonBody } from "@/lib/request";

const addSchema = z.object({
  barcode: z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
});

/**
 * A mechanic scans a spare's barcode while working a job card. This adds it
 * to that specific job card and atomically deducts the quantity from
 * inventory, recording an OUT transaction linked to the job card.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobCardId } = await params;
  const body = await readJsonBody(request);
  if (body === null) return invalidJsonResponse();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { barcode, quantity } = parsed.data;

  const jobCard = await prisma.jobCard.findUnique({ where: { id: jobCardId } });
  if (!jobCard) return NextResponse.json({ error: "Job card not found" }, { status: 404 });
  if (jobCard.status === "BILLED") {
    return NextResponse.json({ error: "This job card is already billed." }, { status: 400 });
  }

  const sparePart = await prisma.sparePart.findUnique({ where: { barcode } });
  if (!sparePart) {
    return NextResponse.json(
      { error: "No part in inventory with this barcode. Scan it into Inventory first." },
      { status: 404 }
    );
  }
  if (sparePart.quantity < quantity) {
    return NextResponse.json(
      { error: `Only ${sparePart.quantity} in stock for "${sparePart.name}".` },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.sparePart.update({
      where: { id: sparePart.id },
      data: { quantity: { decrement: quantity } },
    });
    await tx.inventoryTxn.create({
      data: {
        sparePartId: sparePart.id,
        type: "OUT",
        quantity,
        jobCardId,
        note: `Used on job card`,
      },
    });
    const jobCardPart = await tx.jobCardPart.create({
      data: {
        jobCardId,
        sparePartId: sparePart.id,
        quantity,
        priceAtSale: sparePart.sellingPrice,
      },
      include: { sparePart: true },
    });
    if (jobCard.status === "OPEN") {
      await tx.jobCard.update({ where: { id: jobCardId }, data: { status: "IN_PROGRESS" } });
    }
    return jobCardPart;
  });

  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobCardId } = await params;
  const jobCardPartId = request.nextUrl.searchParams.get("jobCardPartId");
  if (!jobCardPartId) return NextResponse.json({ error: "jobCardPartId required" }, { status: 400 });

  const jcp = await prisma.jobCardPart.findUnique({ where: { id: jobCardPartId } });
  if (!jcp || jcp.jobCardId !== jobCardId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.sparePart.update({
      where: { id: jcp.sparePartId },
      data: { quantity: { increment: jcp.quantity } },
    });
    await tx.inventoryTxn.create({
      data: {
        sparePartId: jcp.sparePartId,
        type: "IN",
        quantity: jcp.quantity,
        jobCardId,
        note: "Removed from job card (returned to stock)",
      },
    });
    await tx.jobCardPart.delete({ where: { id: jobCardPartId } });
  });

  return NextResponse.json({ ok: true });
}
