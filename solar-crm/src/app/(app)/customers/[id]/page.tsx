import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ActionForm from "@/components/ActionForm";
import ConfirmButton from "@/components/ConfirmButton";
import Icon from "@/components/Icon";
import { Badge, Card, Dl, EmptyState, Field, Input, LinkButton, PageHeader, Select, SectionTitle, TableWrap, Textarea } from "@/components/ui";
import { formatDate, formatDateTime, formatINR, startOfDay, toDateInput, whatsAppLink } from "@/lib/format";
import {
  ACTIVITY_LABEL,
  ACTIVITY_TYPES,
  CUSTOMER_TYPE_LABEL,
  PROJECT_STAGE_LABEL,
  PROJECT_STAGE_TONE,
  QUOTE_LABEL,
  QUOTE_TONE,
  STAGES,
  STAGE_LABEL,
  STAGE_TONE,
} from "@/lib/labels";
import { addActivity, deleteCustomer, setStage, updateCustomer } from "../actions";
import CustomerFields from "../CustomerFields";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = await prisma.customer.findUnique({ where: { id }, select: { name: true } });
  return { title: c?.name ?? "Customer" };
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      quotes: { orderBy: { createdAt: "desc" } },
      projects: { orderBy: { createdAt: "desc" }, include: { payments: true } },
      invoices: { orderBy: { date: "desc" }, include: { payments: true } },
      payments: { orderBy: { date: "desc" } },
    },
  });
  if (!c) notFound();

  const overdue = c.nextFollowUpAt && c.nextFollowUpAt < startOfDay();
  const waText = `Hello ${c.name}, this is Sanacara Solar Solutions. `;
  const totalPaid = c.payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <PageHeader
        title={c.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={STAGE_TONE[c.stage]}>{STAGE_LABEL[c.stage]}</Badge>
            <span>{CUSTOMER_TYPE_LABEL[c.type]}</span>
            {c.city && <span>· {c.city}</span>}
            {c.source && <span>· via {c.source}</span>}
          </span>
        }
        actions={
          <>
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2">
              <Icon name="phone" className="h-4 w-4" /> Call
            </a>
            <a href={whatsAppLink(c.phone, waText)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2">
              <Icon name="whatsapp" className="h-4 w-4" /> WhatsApp
            </a>
            <LinkButton href={`/calculator?customerId=${c.id}`}>Solar calculator</LinkButton>
            <LinkButton href={`/quotes/new?customerId=${c.id}`} variant="primary">+ New quotation</LinkButton>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <SectionTitle>Pipeline stage</SectionTitle>
            <ActionForm action={setStage} submitLabel="Update stage" pendingLabel="Updating…">
              <input type="hidden" name="id" value={c.id} />
              <div className="space-y-3">
                <Select name="stage" defaultValue={c.stage}>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABEL[s]}
                    </option>
                  ))}
                </Select>
                <Input name="lostReason" placeholder="Reason, if lost" defaultValue={c.lostReason ?? ""} />
              </div>
            </ActionForm>
          </Card>

          <Card>
            <SectionTitle>Contact & site</SectionTitle>
            <Dl
              items={[
                ["Phone", <a key="p" href={`tel:${c.phone}`} className="text-brand">{c.phone}</a>],
                ["Alt phone", c.altPhone],
                ["Email", c.email],
                ["Address", c.address],
                ["Pincode", c.pincode],
                ["GSTIN", c.gstin],
                ["Monthly bill", c.monthlyBill ? formatINR(c.monthlyBill) : null],
                ["Monthly units", c.monthlyUnits ? `${Math.round(c.monthlyUnits)} kWh` : null],
                ["Roof area", c.roofAreaSqft ? `${c.roofAreaSqft} sq ft` : null],
                ["Interested in", c.expectedKw ? `${c.expectedKw} kW` : null],
                ["Next follow-up", c.nextFollowUpAt ? <span key="f" className={overdue ? "text-danger" : ""}>{formatDate(c.nextFollowUpAt)}{overdue ? " (overdue)" : ""}</span> : null],
              ]}
            />
            {c.notes && <p className="mt-3 whitespace-pre-line rounded-lg bg-surface-2 p-3 text-sm">{c.notes}</p>}
            <details className="mt-4 border-t border-line pt-3">
              <summary className="cursor-pointer text-sm font-medium text-brand">Edit details</summary>
              <ActionForm action={updateCustomer} className="mt-3">
                <input type="hidden" name="id" value={c.id} />
                <CustomerFields v={c} />
              </ActionForm>
              {session?.role === "ADMIN" && (
                <form action={deleteCustomer} className="mt-3">
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton message={`Delete ${c.name}? This cannot be undone.`} variant="ghost" className="text-danger">
                    Delete customer
                  </ConfirmButton>
                </form>
              )}
            </details>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <SectionTitle>Log activity</SectionTitle>
            <ActionForm action={addActivity} submitLabel="Log it" pendingLabel="Saving…" resetOnSuccess>
              <input type="hidden" name="id" value={c.id} />
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Type">
                  <Select name="type" defaultValue="CALL">
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {ACTIVITY_LABEL[t]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Next follow-up" hint="blank = none" className="sm:col-span-1">
                  <Input name="followUp" type="date" defaultValue={toDateInput(c.nextFollowUpAt)} />
                </Field>
                <Field label="What happened?" className="sm:col-span-4">
                  <Textarea name="text" rows={2} placeholder="e.g. Spoke to owner, wants 5 kW with subsidy. Will share EB bill tomorrow." required />
                </Field>
              </div>
            </ActionForm>
            <ul className="mt-5 space-y-3 border-t border-line pt-4">
              {c.activities.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.type === "STAGE" ? "bg-sun" : "bg-brand"}`} />
                  <div className="min-w-0">
                    <div className="whitespace-pre-line">{a.text}</div>
                    <div className="text-xs text-muted">
                      {ACTIVITY_LABEL[a.type]} · {a.createdByName ?? "—"} · {formatDateTime(a.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
              {c.activities.length === 0 && <li className="text-sm text-muted">Nothing logged yet.</li>}
            </ul>
          </Card>

          <Card pad={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0">
              <SectionTitle action={<Link href={`/quotes/new?customerId=${c.id}`} className="text-xs font-medium text-brand">+ New</Link>}>Quotations</SectionTitle>
            </div>
            {c.quotes.length === 0 ? (
              <EmptyState>No quotations yet.</EmptyState>
            ) : (
              <TableWrap>
                <table className="tbl">
                  <tbody>
                    {c.quotes.map((q) => (
                      <tr key={q.id} className="row-link">
                        <td>
                          <Link href={`/quotes/${q.id}`} className="font-medium hover:text-brand">{q.number}</Link>
                          <div className="text-xs text-muted">{formatDate(q.date)} · {q.systemKw} kW {q.systemType}</div>
                        </td>
                        <td><Badge tone={QUOTE_TONE[q.status]}>{QUOTE_LABEL[q.status]}</Badge></td>
                        <td className="num">{formatINR(q.totalAmount - q.subsidyCentral - q.subsidyState)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>

          {(c.projects.length > 0 || c.invoices.length > 0) && (
            <Card pad={false}>
              <div className="p-4 pb-0 sm:p-5 sm:pb-0">
                <SectionTitle>Projects, invoices & payments</SectionTitle>
              </div>
              <TableWrap>
                <table className="tbl">
                  <tbody>
                    {c.projects.map((p) => {
                      const paid = p.payments.reduce((s, x) => s + x.amount, 0);
                      return (
                        <tr key={p.id} className="row-link">
                          <td>
                            <Link href={`/projects/${p.id}`} className="font-medium hover:text-brand">{p.code} · {p.name}</Link>
                            <div className="text-xs text-muted">Paid {formatINR(paid)} of {formatINR(p.contractValue)}</div>
                          </td>
                          <td><Badge tone={PROJECT_STAGE_TONE[p.stage]}>{PROJECT_STAGE_LABEL[p.stage]}</Badge></td>
                          <td className="num">{formatINR(p.contractValue - paid)} due</td>
                        </tr>
                      );
                    })}
                    {c.invoices.map((i) => (
                      <tr key={i.id} className="row-link">
                        <td>
                          <Link href={`/invoices/${i.id}`} className="font-medium hover:text-brand">Invoice {i.number}</Link>
                          <div className="text-xs text-muted">{formatDate(i.date)}</div>
                        </td>
                        <td><Badge tone={i.status === "CANCELLED" ? "red" : "blue"}>{i.status === "CANCELLED" ? "Cancelled" : "Issued"}</Badge></td>
                        <td className="num">{formatINR(i.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
              <div className="border-t border-line px-4 py-3 text-sm text-muted sm:px-5">Total received from this customer: <b className="text-ink">{formatINR(totalPaid)}</b></div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
