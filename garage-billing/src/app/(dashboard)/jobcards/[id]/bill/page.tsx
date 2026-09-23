import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageTitle } from "@/components/ui";
import { formatDate, formatINR } from "@/lib/format";
import GenerateBillForm from "./GenerateBillForm";
import WhatsAppSendButton from "./WhatsAppSendButton";

export const dynamic = "force-dynamic";

export default async function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobCard = await prisma.jobCard.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      parts: { include: { sparePart: true }, orderBy: { createdAt: "asc" } },
      labors: { orderBy: { createdAt: "asc" } },
      bill: true,
    },
  });
  if (!jobCard) notFound();

  const partsTotal = jobCard.parts.reduce((s, p) => s + p.priceAtSale * p.quantity, 0);
  const laborTotal = jobCard.labors.reduce((s, l) => s + l.amount, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle subtitle={`Job card for ${jobCard.vehicle.make} ${jobCard.vehicle.model} · ${jobCard.vehicle.regNumber}`}>
        Final Bill
      </PageTitle>

      {!jobCard.bill ? (
        <Card>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Parts total {formatINR(partsTotal)} + labor {formatINR(laborTotal)} ={" "}
            <strong>{formatINR(partsTotal + laborTotal)}</strong> (MRP, tax-inclusive) before
            discount.
          </p>
          <GenerateBillForm jobCardId={jobCard.id} />
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{jobCard.customer.name}</div>
                <div className="text-xs text-zinc-500">{jobCard.customer.phone}</div>
              </div>
              <div className="text-right text-xs text-zinc-500">
                Bill date
                <br />
                {formatDate(jobCard.bill.createdAt)}
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
                  <th className="py-2">Item</th>
                  <th className="py-2 pl-2 text-right">Qty</th>
                  <th className="hidden py-2 pl-2 text-right sm:table-cell">Price</th>
                  <th className="py-2 pl-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {jobCard.parts.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2">{p.sparePart.name}</td>
                    <td className="py-2 pl-2 text-right">{p.quantity}</td>
                    <td className="hidden py-2 pl-2 text-right sm:table-cell">{formatINR(p.priceAtSale)}</td>
                    <td className="py-2 pl-2 text-right">{formatINR(p.priceAtSale * p.quantity)}</td>
                  </tr>
                ))}
                {jobCard.labors.map((l) => (
                  <tr key={l.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2">{l.description} <span className="text-xs text-zinc-500">(labor)</span></td>
                    <td className="py-2 pl-2 text-right">1</td>
                    <td className="hidden py-2 pl-2 text-right sm:table-cell">{formatINR(l.amount)}</td>
                    <td className="py-2 pl-2 text-right">{formatINR(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Parts + Labor</span>
                <span>{formatINR(jobCard.bill.partsTotal + jobCard.bill.laborTotal)}</span>
              </div>
              {jobCard.bill.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Discount</span>
                  <span>-{formatINR(jobCard.bill.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-lg font-bold dark:border-zinc-800">
                <span>Grand Total</span>
                <span>{formatINR(jobCard.bill.grandTotal)}</span>
              </div>
              {jobCard.bill.taxAmount > 0 && (
                <p className="pt-1 text-xs text-zinc-400">
                  Price is MRP, inclusive of GST @{jobCard.bill.taxPercent}% ({formatINR(jobCard.bill.taxAmount)}
                  ) — not an additional charge.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <WhatsAppSendButton
              jobCardId={jobCard.id}
              phone={jobCard.customer.phone}
              customerName={jobCard.customer.name}
              vehicle={`${jobCard.vehicle.make} ${jobCard.vehicle.model} (${jobCard.vehicle.regNumber})`}
              grandTotal={formatINR(jobCard.bill.grandTotal)}
              alreadySentAt={jobCard.bill.whatsappSentAt ? jobCard.bill.whatsappSentAt.toString() : null}
            />
          </Card>
        </>
      )}

      <div className="mt-4">
        <Link href={`/jobcards/${jobCard.id}`} className="text-sm text-zinc-500 hover:underline">
          ← Back to job card
        </Link>
      </div>
    </div>
  );
}
