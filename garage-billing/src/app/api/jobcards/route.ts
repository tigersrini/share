import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { invalidJsonResponse, readJsonBody } from "@/lib/request";

const createSchema = z.object({
  customerId: z.string().min(1),
  vehicleId: z.string().min(1),
  complaints: z.string().min(1),
  odometer: z.coerce.number().int().min(0).optional(),
});

const statusValues = ["OPEN", "IN_PROGRESS", "COMPLETED", "BILLED"] as const;

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  if (status && !statusValues.includes(status as (typeof statusValues)[number])) {
    return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
  }
  const jobCards = await prisma.jobCard.findMany({
    where: status ? { status: status as (typeof statusValues)[number] } : { status: { not: "BILLED" } },
    include: { customer: true, vehicle: true, bill: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(jobCards);
}

/** Opens a new job card ("garage list" entry) for a customer's vehicle with
 * their complaint. This is what a mechanic creates the moment a bike rolls in. */
export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (body === null) return invalidJsonResponse();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const jobCard = await prisma.jobCard.create({
    data: parsed.data,
    include: { customer: true, vehicle: true },
  });
  return NextResponse.json(jobCard, { status: 201 });
}
