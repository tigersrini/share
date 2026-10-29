import { prisma } from "@/lib/prisma";

export async function loadInvoiceOptions() {
  const [customers, projects] = await Promise.all([
    prisma.customer.findMany({ orderBy: { updatedAt: "desc" }, take: 1000, select: { id: true, name: true, phone: true, address: true, city: true, pincode: true, gstin: true } }),
    prisma.project.findMany({ where: { stage: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, take: 500, select: { id: true, code: true, name: true, customerId: true } }),
  ]);
  return {
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: [c.address, [c.city, c.pincode].filter(Boolean).join(" ")].filter(Boolean).join(", "),
      gstin: c.gstin ?? "",
    })),
    projects,
  };
}
