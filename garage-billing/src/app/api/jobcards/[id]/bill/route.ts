import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { invalidJsonResponse, readJsonBody } from "@/lib/request";

const genSchema = z.object({
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  discount: z.coerce.number().min(0).default(0),
});

/** Generates (or regenerates) the final bill for a job card from its parts + labor. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobCardId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = genSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { taxPercent, discount } = parsed.data;

  const jobCard = await prisma.jobCard.findUnique({
    where: { id: jobCardId },
    include: { parts: true, labors: true },
  });
  if (!jobCard) return NextResponse.json({ error: "Job card not found" }, { status: 404 });

  const partsTotal = jobCard.parts.reduce((sum, p) => sum + p.priceAtSale * p.quantity, 0);
  const laborTotal = jobCard.labors.reduce((sum, l) => sum + l.amount, 0);
  const subtotal = partsTotal + laborTotal - discount;
  const taxAmount = (subtotal * taxPercent) / 100;
  const grandTotal = Math.max(0, subtotal + taxAmount);

  const bill = await prisma.$transaction(async (tx) => {
    const saved = await tx.bill.upsert({
      where: { jobCardId },
      update: { partsTotal, laborTotal, taxPercent, taxAmount, discount, grandTotal },
      create: { jobCardId, partsTotal, laborTotal, taxPercent, taxAmount, discount, grandTotal },
    });
    await tx.jobCard.update({ where: { id: jobCardId }, data: { status: "BILLED" } });
    return saved;
  });

  return NextResponse.json(bill, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobCardId } = await params;
  const body = await readJsonBody(request);
  if (body === null) return invalidJsonResponse();
  if (typeof body === "object" && body !== null && "whatsappSent" in body && body.whatsappSent) {
    const bill = await prisma.bill.update({
      where: { jobCardId },
      data: { whatsappSentAt: new Date() },
    });
    return NextResponse.json(bill);
  }
  return NextResponse.json({ error: "Unsupported update" }, { status: 400 });
}
