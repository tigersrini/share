import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import InvoiceDocument, { type InvoiceData, type InvoiceLine } from "@/lib/pdf/InvoiceDocument";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobCardId } = await params;

  const jobCard = await prisma.jobCard.findUnique({
    where: { id: jobCardId },
    include: {
      customer: true,
      vehicle: true,
      parts: { include: { sparePart: true }, orderBy: { createdAt: "asc" } },
      labors: { orderBy: { createdAt: "asc" } },
      bill: true,
    },
  });
  if (!jobCard || !jobCard.bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  const lines: InvoiceLine[] = [
    ...jobCard.parts.map((p) => ({
      description: p.sparePart.name,
      qty: p.quantity,
      unitPrice: p.priceAtSale,
      amount: p.priceAtSale * p.quantity,
    })),
    ...jobCard.labors.map((l) => ({
      description: l.description,
      qty: 1,
      unitPrice: l.amount,
      amount: l.amount,
      isLabor: true,
    })),
  ];

  const data: InvoiceData = {
    invoiceNumber: jobCard.bill.id.slice(-8).toUpperCase(),
    invoiceDate: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
      jobCard.bill.createdAt
    ),
    customerName: jobCard.customer.name,
    customerPhone: jobCard.customer.phone,
    customerAddress: jobCard.customer.address,
    vehicleLabel: `${jobCard.vehicle.make} ${jobCard.vehicle.model}`,
    regNumber: jobCard.vehicle.regNumber,
    odometer: jobCard.odometer,
    complaints: jobCard.complaints,
    lines,
    partsTotal: jobCard.bill.partsTotal,
    laborTotal: jobCard.bill.laborTotal,
    discount: jobCard.bill.discount,
    taxPercent: jobCard.bill.taxPercent,
    taxAmount: jobCard.bill.taxAmount,
    grandTotal: jobCard.bill.grandTotal,
  };

  const buffer = await renderToBuffer(<InvoiceDocument data={data} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${data.invoiceNumber}.pdf"`,
    },
  });
}
