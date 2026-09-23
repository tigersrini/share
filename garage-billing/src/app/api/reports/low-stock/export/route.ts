import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const allParts = await prisma.sparePart.findMany({ orderBy: { quantity: "asc" } });
  const parts = allParts.filter((p) => p.quantity <= p.lowStockAt);

  const header = ["Barcode", "Name", "Make", "Category", "Quantity", "Low Stock At", "Cost Price", "Selling Price"];
  const rows = parts.map((p) => [
    p.barcode,
    p.name,
    p.make ?? "",
    p.category ?? "",
    p.quantity,
    p.lowStockAt,
    p.costPrice,
    p.sellingPrice,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="low-stock-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
