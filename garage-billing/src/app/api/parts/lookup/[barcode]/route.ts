import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lookupBarcodeExternally } from "@/lib/productLookup";

/**
 * Looks up a barcode: first against our own inventory (exact match already
 * in stock), then, if unknown, best-effort against a public product
 * database. The UI always lets the mechanic fall back to manual entry.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  const { barcode } = await params;

  const existing = await prisma.sparePart.findUnique({ where: { barcode } });
  if (existing) {
    return NextResponse.json({ source: "inventory", part: existing });
  }

  const external = await lookupBarcodeExternally(barcode);
  if (external) {
    return NextResponse.json({ source: "external", info: external });
  }

  return NextResponse.json({ source: "none" });
}
