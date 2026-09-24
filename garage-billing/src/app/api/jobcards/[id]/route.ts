import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { invalidJsonResponse, readJsonBody } from "@/lib/request";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jobCard = await prisma.jobCard.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      parts: { include: { sparePart: true }, orderBy: { createdAt: "asc" } },
      labors: { orderBy: { createdAt: "asc" } },
      bill: true,
    },
  });
  if (!jobCard) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(jobCard);
}

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "BILLED"]).optional(),
  complaints: z.string().min(1).optional(),
  notes: z.string().optional(),
  estimatedAmount: z.coerce.number().min(0).optional(),
  odometer: z.coerce.number().int().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await readJsonBody(request);
  if (body === null) return invalidJsonResponse();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = { ...parsed.data } as typeof parsed.data & { closedAt?: Date };
  if (parsed.data.status === "COMPLETED") {
    data.closedAt = new Date();
  }
  const jobCard = await prisma.jobCard.update({ where: { id }, data });
  return NextResponse.json(jobCard);
}
