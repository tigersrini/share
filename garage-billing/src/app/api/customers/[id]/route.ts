import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidJsonResponse, readJsonBody } from "@/lib/request";
import { normalizePhone } from "@/lib/format";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      vehicles: true,
      jobCards: {
        orderBy: { createdAt: "desc" },
        include: { vehicle: true, bill: true },
      },
    },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(customer);
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(6).optional(),
  address: z.string().optional(),
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

  const data = { ...parsed.data };
  if (data.phone) {
    const phone = normalizePhone(data.phone);
    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Another customer already has this phone number." }, { status: 409 });
    }
    data.phone = phone;
  }

  const customer = await prisma.customer.update({ where: { id }, data });
  return NextResponse.json(customer);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jobCardCount = await prisma.jobCard.count({ where: { customerId: id } });
  if (jobCardCount > 0) {
    return NextResponse.json(
      { error: `Can't delete: this customer has ${jobCardCount} job card(s) on record.` },
      { status: 409 }
    );
  }
  await prisma.vehicle.deleteMany({ where: { customerId: id } });
  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
