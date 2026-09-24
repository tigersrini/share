import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { REFERENCE_CATALOG, type CatalogResponse } from "@/lib/vehicleCatalog";

/**
 * Returns motorcycle makes/models for the Make/Model pickers, with this
 * garage's own most-frequently-used ones ranked first, falling back to a
 * static reference catalog of common Indian OEMs/models for anything not
 * yet in this garage's own vehicle history.
 */
export async function GET() {
  const grouped = await prisma.vehicle.groupBy({
    by: ["make", "model"],
    _count: { _all: true },
  });

  const usageByMake = new Map<string, Map<string, number>>();
  const totalByMake = new Map<string, number>();

  for (const row of grouped) {
    if (!usageByMake.has(row.make)) usageByMake.set(row.make, new Map());
    usageByMake.get(row.make)!.set(row.model, row._count._all);
    totalByMake.set(row.make, (totalByMake.get(row.make) ?? 0) + row._count._all);
  }

  const usedMakesSorted = [...totalByMake.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([make]) => make);

  const referenceMakes = Object.keys(REFERENCE_CATALOG).filter((m) => !totalByMake.has(m));
  const makes = [...usedMakesSorted, ...referenceMakes];

  const modelsByMake: Record<string, string[]> = {};
  for (const make of makes) {
    const usedModels = usageByMake.get(make);
    const usedSorted = usedModels ? [...usedModels.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m) : [];
    const referenceModels = (REFERENCE_CATALOG[make] ?? []).filter((m) => !usedModels?.has(m));
    modelsByMake[make] = [...usedSorted, ...referenceModels];
  }

  const response: CatalogResponse = { makes, modelsByMake };
  return NextResponse.json(response);
}
