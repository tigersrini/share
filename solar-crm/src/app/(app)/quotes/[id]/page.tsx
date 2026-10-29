import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSettings, type MakeRow, type PaymentTermRow } from "@/lib/settings";
import ConfirmButton from "@/components/ConfirmButton";
import { Badge, Button, Card, Dl, LinkButton, PageHeader, SectionTitle, TableWrap } from "@/components/ui";
import { formatDate, formatINR, nowMs, whatsAppLink } from "@/lib/format";
import { QUOTE_LABEL, QUOTE_STATUSES, QUOTE_TONE } from "@/lib/labels";
import { bomCost, gstFactor, netPayable } from "@/lib/quote";
import { convertToProject, deleteQuote, duplicateQuote, setQuoteStatus } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const q = await prisma.quote.findUnique({ where: { id }, select: { number: true } });
  return { title: q?.number ?? "Quotation" };
}

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [q, settings, session] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: { customer: true, lines: { orderBy: { sort: "asc" } }, projects: true, invoices: { orderBy: { date: "desc" } } },
    }),
    getSettings(),
    getSession(),
  ]);
  if (!q) notFound();

  const net = netPayable(q);
  const cost = bomCost(q.lines.map((l) => ({ qty: l.qty, qtyNum: l.qtyNum, unitCost: l.unitCost })));
  const revenue = net / gstFactor(settings.gst);
  const margin = revenue - cost;
  const terms = q.paymentTerms as unknown as PaymentTermRow[];
  const makes = q.makes as unknown as MakeRow[];
  const expired = q.status === "SENT" && q.date.getTime() + q.validityDays * 86400000 < nowMs();
  const waMsg = `Hello ${q.customer.name}, please find our proposal ${q.number} for a ${q.systemKw} kW solar power plant. Net payable after subsidy: ${formatINR(net)}. – ${settings.company.name}`;

  return (
    <div>
      <PageHeader
        title={q.number}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={QUOTE_TONE[q.status]}>{QUOTE_LABEL[q.status]}</Badge>
            {expired && <Badge tone="amber">Validity over</Badge>}
            <span>
              for <Link href={`/customers/${q.customerId}`} className="font-medium text-brand">{q.customer.name}</Link> · {formatDate(q.date)} · valid {q.validityDays} days
            </span>
          </span>
        }
        actions={
          <>
            <LinkButton href={`/api/quotes/${q.id}/pdf`} variant="primary" target="_blank">Download PDF</LinkButton>
            <a href={whatsAppLink(q.customer.phone, waMsg)} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold hover:bg-surface-2">
              WhatsApp
            </a>
            <LinkButton href={`/quotes/${q.id}/edit`}>Edit</LinkButton>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <h2 className="text-base font-semibold">{q.title}</h2>
            <p className="mt-2 text-sm text-muted">{q.scopeText}</p>
            <div className="mt-4 grid gap-3 rounded-lg bg-surface-2 p-3 sm:grid-cols-4">
              <Stat label="Total cost" value={formatINR(q.totalAmount)} />
              <Stat label="Central subsidy" value={q.subsidyCentral ? `− ${formatINR(q.subsidyCentral)}` : "—"} />
              <Stat label="State subsidy" value={q.subsidyState ? `− ${formatINR(q.subsidyState)}` : "—"} />
              <Stat label="Net payable" value={formatINR(net)} strong />
            </div>
          </Card>

          <Card pad={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0"><SectionTitle>Bill of materials</SectionTitle></div>
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>#</th><th>Particulars</th><th>UOM</th><th className="num">Qty</th></tr></thead>
                <tbody>
                  {q.lines.map((l, i) => (
                    <tr key={l.id}>
                      <td className="text-muted">{i + 1}</td>
                      <td className="whitespace-pre-line">{l.description}</td>
                      <td>{l.uom}</td>
                      <td className="num">{l.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <SectionTitle>Makes</SectionTitle>
              <Dl items={makes.map((m) => [m.item, m.makes] as [string, string])} />
            </Card>
            <Card>
              <SectionTitle>Terms</SectionTitle>
              <ul className="space-y-1 text-sm">
                {terms.map((t, i) => (
                  <li key={i}><b>{t.percent}%</b> {t.label}</li>
                ))}
              </ul>
              <div className="mt-3 space-y-2 text-xs text-muted">
                <p><b className="text-ink">Warranty:</b> {q.warranty}</p>
                <p><b className="text-ink">Timeline:</b> {q.timeline}</p>
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionTitle>Status</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {QUOTE_STATUSES.filter((s) => s !== q.status && s !== "EXPIRED").map((s) => (
                <form key={s} action={setQuoteStatus}>
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="status" value={s} />
                  <Button variant={s === "ACCEPTED" ? "primary" : "secondary"} type="submit">
                    {s === "DRAFT" ? "Back to draft" : s === "SENT" ? "Mark as sent" : s === "ACCEPTED" ? "Mark accepted" : "Mark rejected"}
                  </Button>
                </form>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Marking sent moves the lead to “Quoted”; accepted moves it to “Won”.</p>
          </Card>

          <Card>
            <SectionTitle>Next steps</SectionTitle>
            <div className="space-y-2">
              {q.projects.length > 0 ? (
                q.projects.map((p) => (
                  <LinkButton key={p.id} href={`/projects/${p.id}`} className="w-full">Open project {p.code}</LinkButton>
                ))
              ) : (
                <form action={convertToProject}>
                  <input type="hidden" name="id" value={q.id} />
                  <Button type="submit" variant="sun" className="w-full">Accepted → start project</Button>
                </form>
              )}
              <LinkButton href={`/invoices/new?quoteId=${q.id}`} className="w-full">Create tax invoice</LinkButton>
              <form action={duplicateQuote}>
                <input type="hidden" name="id" value={q.id} />
                <Button type="submit" variant="secondary" className="w-full">New revision (copy)</Button>
              </form>
              {q.invoices.map((i) => (
                <Link key={i.id} href={`/invoices/${i.id}`} className="block text-sm text-brand">Invoice {i.number} · {formatINR(i.total)}</Link>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle>Internal costing</SectionTitle>
            {cost > 0 ? (
              <>
                <Dl
                  items={[
                    ["Net payable (incl. GST)", formatINR(net)],
                    ["Revenue ex-GST (est.)", formatINR(revenue)],
                    ["BOM cost ex-GST", formatINR(cost)],
                    ["Est. margin", <span key="m" className={margin < 0 ? "text-danger" : "text-brand-strong"}>{formatINR(margin)} ({((margin / Math.max(1, revenue)) * 100).toFixed(0)}%)</span>],
                  ]}
                />
                <p className="mt-2 text-xs text-muted">Not shown to the customer. Excludes labour, transport and permits.</p>
              </>
            ) : (
              <p className="text-sm text-muted">Add unit costs to BOM lines (Edit) to see the margin.</p>
            )}
          </Card>

          {q.notes && (
            <Card>
              <SectionTitle>Internal notes</SectionTitle>
              <p className="whitespace-pre-line text-sm">{q.notes}</p>
            </Card>
          )}

          {session?.role === "ADMIN" && q.projects.length === 0 && q.invoices.length === 0 && (
            <form action={deleteQuote}>
              <input type="hidden" name="id" value={q.id} />
              <ConfirmButton message={`Delete quotation ${q.number}?`} variant="ghost" className="text-danger">Delete quotation</ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`tabular-nums ${strong ? "text-lg font-semibold text-brand-strong" : "text-base font-medium"}`}>{value}</div>
    </div>
  );
}
