import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizePhone } from "@/lib/format";
import { invalidJsonResponse, readJsonBody } from "@/lib/request";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  address: z.string().optional(),
});

/** Search customers by phone number (partial match) — the core lookup for
 * "type in the number to raise a new job card". Returns their vehicles too. */
export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone")?.trim();
  const q = request.nextUrl.searchParams.get("q")?.trim();

  const where = phone
    ? { phone: { contains: normalizePhone(phone) } }
    : q
    ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }] }
    : undefined;

  const customers = await prisma.customer.findMany({
    where,
    include: { vehicles: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (body === null) return invalidJsonResponse();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const phone = normalizePhone(parsed.data.phone);

  const existing = await prisma.customer.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json({ error: "A customer with this phone number already exists." }, { status: 409 });
  }

  const customer = await prisma.customer.create({
    data: { name: parsed.data.name, phone, address: parsed.data.address },
  });
  return NextResponse.json(customer, { status: 201 });
}
