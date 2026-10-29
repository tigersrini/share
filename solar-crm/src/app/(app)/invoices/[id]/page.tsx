import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import ConfirmButton from "@/components/ConfirmButton";
import PaymentForm from "@/components/PaymentForm";
import { Badge, Card, Dl, LinkButton, PageHeader, SectionTitle, TableWrap } from "@/components/ui";
import { amountInWords, formatDate, formatINR2, whatsAppLink } from "@/lib/format";
import { computeInvoice } from "@/lib/gst";
import { PAYMENT_MODE_LABEL } from "@/lib/labels";
import { stateName } from "@/lib/states";
import { deletePayment } from "../../projects/actions";
import { cancelInvoice } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const i = await prisma.invoice.findUnique({ where: { id }, select: { number: true } });
  return { title: i ? `Invoice ${i.number}` : "Invoice" };
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [inv, settings, session] = await Promise.all([
    prisma.invoice.findUnique({ where: { id }, include: { customer: true, project: true, lines: { orderBy: { sort: "asc" } }, payments: { orderBy: { date: "desc" } } } }),
    getSettings(),
    getSession(),
  ]);
  if (!inv) notFound();

  const intra = inv.placeOfSupply === settings.company.stateCode;
  const t = computeInvoice(inv.lines.map((l) => ({ description: l.description, hsn: l.hsn, qty: l.qty, unit: l.unit, rate: l.rate, gstRate: l.gstRate })), intra);
  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
  const due = inv.total - paid;
  const cancelled = inv.status === "CANCELLED";
  const wa = `Hello ${inv.billName}, please find tax invoice ${inv.number} dated ${formatDate(inv.date)} for ${formatINR2(inv.total)}. Bank: ${settings.bank.name}, A/c ${settings.bank.accountNo}, IFSC ${settings.bank.ifsc}. – ${settings.company.name}`;

  return (
    <div>
      <PageHeader
        title={`Invoice ${inv.number}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {cancelled ? <Badge tone="red">Cancelled</Badge> : due <= 1 ? <Badge tone="green">Paid</Badge> : paid > 0 ? <Badge tone="orange">Part paid</Badge> : <Badge tone="blue">Issued</Badge>}
            <Link href={`/customers/${inv.customerId}`} className="font-medium text-brand">{inv.billName}</Link>
            <span>· {formatDate(inv.date)}</span>
            {inv.project && <Link href={`/projects/${inv.project.id}`} className="text-muted hover:text-brand">· project {inv.project.code}</Link>}
          </span>
        }
        actions={
          <>
            <LinkButton href={`/api/invoices/${inv.id}/pdf`} variant="primary" target="_blank">Download PDF</LinkButton>
            <a href={whatsAppLink(inv.customer.phone, wa)} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold hover:bg-surface-2">WhatsApp</a>
            {!cancelled && <LinkButton href={`/invoices/${inv.id}/edit`}>Edit</LinkButton>}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card pad={false}>
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>#</th><th>Description</th><th>HSN/SAC</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">GST</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {inv.lines.map((l, i) => (
                    <tr key={l.id}>
                      <td className="text-muted">{i + 1}</td>
                      <td className="whitespace-pre-line">{l.description}</td>
                      <td>{l.hsn}</td>
                      <td className="num">{l.qty} {l.unit}</td>
                      <td className="num">{formatINR2(l.rate)}</td>
                      <td className="num">{l.gstRate}%</td>
                      <td className="num font-medium">{formatINR2(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            <div className="ml-auto max-w-sm space-y-1 border-t border-line p-4 text-sm">
              <Row label="Taxable value" value={formatINR2(inv.subtotal)} />
              {intra ? (
                <>
                  <Row label="CGST" value={formatINR2(inv.cgst)} muted />
                  <Row label="SGST" value={formatINR2(inv.sgst)} muted />
                </>
              ) : (
                <Row label="IGST" value={formatINR2(inv.igst)} muted />
              )}
              {inv.roundOff !== 0 && <Row label="Round off" value={formatINR2(inv.roundOff)} muted />}
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><span>Total</span><span className="tabular-nums">{formatINR2(inv.total)}</span></div>
              <div className="text-xs text-muted">{amountInWords(inv.total)}</div>
            </div>
          </Card>

          <Card pad={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0"><SectionTitle>HSN / SAC tax summary</SectionTitle></div>
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>HSN/SAC</th><th className="num">Taxable</th><th className="num">Rate</th>{intra ? <><th className="num">CGST</th><th className="num">SGST</th></> : <th className="num">IGST</th>}<th className="num">Total tax</th></tr></thead>
                <tbody>
                  {t.hsnRows.map((r) => (
                    <tr key={r.hsn + r.rate}>
                      <td>{r.hsn || "—"}</td>
                      <td className="num">{formatINR2(r.taxable)}</td>
                      <td className="num">{r.rate}%</td>
                      {intra ? <><td className="num">{formatINR2(r.cgst)}</td><td className="num">{formatINR2(r.sgst)}</td></> : <td className="num">{formatINR2(r.igst)}</td>}
                      <td className="num">{formatINR2(r.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionTitle>Payment status</SectionTitle>
            <Dl items={[["Invoice total", formatINR2(inv.total)], ["Received", formatINR2(paid)], ["Balance", <b key="b" className={due > 1 ? "text-sun" : "text-brand-strong"}>{formatINR2(Math.max(0, due))}</b>]]} />
          </Card>

          <Card pad={false}>
            <div className="p-4 pb-0"><SectionTitle>Payments against this invoice</SectionTitle></div>
            {inv.payments.length > 0 && (
              <ul className="divide-y divide-line px-4 text-sm">
                {inv.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <span>{formatDate(p.date)} · {PAYMENT_MODE_LABEL[p.mode]}{p.reference && <span className="text-muted"> · {p.reference}</span>}</span>
                    <span className="flex items-center gap-2 tabular-nums">
                      {formatINR2(p.amount)}
                      {session?.role === "ADMIN" && (
                        <form action={deletePayment}>
                          <input type="hidden" name="id" value={p.id} />
                          <ConfirmButton message="Delete this payment record?" variant="ghost" className="px-1.5 py-0.5 text-xs text-danger">✕</ConfirmButton>
                        </form>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!cancelled && (
              <div className="p-4">
                <PaymentForm customerId={inv.customerId} projectId={inv.projectId ?? undefined} invoiceId={inv.id} suggested={due} />
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle>Billing details</SectionTitle>
            <div className="space-y-3 text-sm">
              <div><div className="text-xs text-muted">Bill to</div><div className="font-medium">{inv.billName}</div><div className="whitespace-pre-line text-muted">{inv.billAddress}</div>{inv.billGstin && <div className="text-muted">GSTIN {inv.billGstin}</div>}</div>
              <div className="text-muted">Place of supply: {stateName(inv.placeOfSupply)} ({inv.placeOfSupply})</div>
            </div>
          </Card>

          {!cancelled && (
            <form action={cancelInvoice}>
              <input type="hidden" name="id" value={inv.id} />
              <ConfirmButton message={`Cancel invoice ${inv.number}? The number is kept but it is excluded from totals.`} variant="ghost" className="text-danger">Cancel invoice</ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
