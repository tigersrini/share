import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, PageTitle } from "@/components/ui";
import CustomerSearch from "./CustomerSearch";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const { phone } = await searchParams;

  const customers = await prisma.customer.findMany({
    where: phone ? { phone: { contains: phone.replace(/[^\d+]/g, "") } } : undefined,
    include: { vehicles: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <PageTitle subtitle="Search by phone number to pull up a customer's full history, or add a new one.">
          Customers
        </PageTitle>
        <Link
          href="/customers/new"
          className="rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          + New Customer
        </Link>
      </div>

      <Card className="mb-4">
        <CustomerSearch initialPhone={phone ?? ""} />
      </Card>

      <Card className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
        {customers.map((c) => (
          <Link
            key={c.id}
            href={`/customers/${c.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
          >
            <div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{c.phone}</div>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {c.vehicles.length} vehicle{c.vehicles.length === 1 ? "" : "s"}
            </div>
          </Link>
        ))}
        {customers.length === 0 && (
          <div className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
            No customers found.
          </div>
        )}
      </Card>
    </div>
  );
}
