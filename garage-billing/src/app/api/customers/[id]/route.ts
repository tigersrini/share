import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
