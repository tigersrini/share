import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidJsonResponse, readJsonBody } from "@/lib/request";

const updateSchema = z.object({
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  regNumber: z.string().min(1).optional(),
  vin: z.string().optional(),
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

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.regNumber) {
    const existing = await prisma.vehicle.findFirst({
      where: { customerId: vehicle.customerId, regNumber: parsed.data.regNumber },
    });
    if (existing && existing.id !== id) {
      return NextResponse.json(
        { error: "This customer already has a vehicle with that registration number." },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.vehicle.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jobCardCount = await prisma.jobCard.count({ where: { vehicleId: id } });
  if (jobCardCount > 0) {
    return NextResponse.json(
      { error: `Can't delete: this vehicle has ${jobCardCount} job card(s) on record.` },
      { status: 409 }
    );
  }
  await prisma.vehicle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
