import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  customerId: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  regNumber: z.string().min(1),
  vin: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.vehicle.findFirst({
    where: { customerId: data.customerId, regNumber: data.regNumber },
  });
  if (existing) return NextResponse.json(existing);

  const vehicle = await prisma.vehicle.create({ data });
  return NextResponse.json(vehicle, { status: 201 });
}
