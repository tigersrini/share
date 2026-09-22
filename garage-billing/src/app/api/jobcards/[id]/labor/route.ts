import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().min(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobCardId } = await params;
  const body = await request.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const jobCard = await prisma.jobCard.findUnique({ where: { id: jobCardId } });
  if (!jobCard) return NextResponse.json({ error: "Job card not found" }, { status: 404 });
  if (jobCard.status === "BILLED") {
    return NextResponse.json({ error: "This job card is already billed." }, { status: 400 });
  }

  const labor = await prisma.jobCardLabor.create({
    data: { jobCardId, description: parsed.data.description, amount: parsed.data.amount },
  });
  return NextResponse.json(labor, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobCardId } = await params;
  const laborId = request.nextUrl.searchParams.get("laborId");
  if (!laborId) return NextResponse.json({ error: "laborId required" }, { status: 400 });

  const labor = await prisma.jobCardLabor.findUnique({ where: { id: laborId } });
  if (!labor || labor.jobCardId !== jobCardId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.jobCardLabor.delete({ where: { id: laborId } });
  return NextResponse.json({ ok: true });
}
