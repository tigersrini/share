import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import AcknowledgementDocument, { type AcknowledgementData } from "@/lib/pdf/AcknowledgementDocument";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobCardId } = await params;

  const jobCard = await prisma.jobCard.findUnique({
    where: { id: jobCardId },
    include: { customer: true, vehicle: true },
  });
  if (!jobCard) return NextResponse.json({ error: "Job card not found" }, { status: 404 });

  const data: AcknowledgementData = {
    jobCardNumber: jobCard.id.slice(-8).toUpperCase(),
    date: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(jobCard.createdAt),
    customerName: jobCard.customer.name,
    customerPhone: jobCard.customer.phone,
    vehicleLabel: `${jobCard.vehicle.make} ${jobCard.vehicle.model}`,
    regNumber: jobCard.vehicle.regNumber,
    odometer: jobCard.odometer,
    complaints: jobCard.complaints,
    notes: jobCard.notes,
    estimatedAmount: jobCard.estimatedAmount,
  };

  const buffer = await renderToBuffer(<AcknowledgementDocument data={data} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="jobcard-${data.jobCardNumber}-receipt.pdf"`,
    },
  });
}
