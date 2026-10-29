import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import CalculatorClient from "./CalculatorClient";

export const metadata: Metadata = { title: "Solar calculator" };
export const dynamic = "force-dynamic";

export default async function CalculatorPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { customerId } = await searchParams;
  const [settings, customer] = await Promise.all([
    getSettings(),
    customerId ? prisma.customer.findUnique({ where: { id: customerId } }) : null,
  ]);

  return (
    <div>
      <PageHeader
        title="Solar calculator"
        subtitle={customer ? `For ${customer.name} — enter the units from their EB bill` : "Size a system, see the subsidy, savings and payback in seconds"}
      />
      <CalculatorClient
        settings={{ solar: settings.solar, subsidy: settings.subsidy, company: { name: settings.company.name, phone: settings.company.phone } }}
        customer={customer ? { id: customer.id, name: customer.name, phone: customer.phone, monthlyUnits: customer.monthlyUnits, monthlyBill: customer.monthlyBill, expectedKw: customer.expectedKw, residential: customer.type === "RESIDENTIAL" } : null}
      />
    </div>
  );
}
