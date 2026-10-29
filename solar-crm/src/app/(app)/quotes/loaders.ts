import { prisma } from "@/lib/prisma";

/** Data the quote builder needs besides the quote itself. */
export async function loadBuilderOptions() {
  const [customers, items] = await Promise.all([
    prisma.customer.findMany({ orderBy: { updatedAt: "desc" }, take: 1000, select: { id: true, name: true, phone: true, city: true, type: true } }),
    prisma.item.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }], select: { id: true, sku: true, name: true, uom: true, costPrice: true, make: true } }),
  ]);
  return {
    customers: customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, city: c.city, residential: c.type === "RESIDENTIAL" })),
    items,
  };
}
