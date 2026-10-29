import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import ActionForm from "@/components/ActionForm";
import ConfirmButton from "@/components/ConfirmButton";
import PaymentForm from "@/components/PaymentForm";
import { Badge, Button, Card, Dl, EmptyState, Field, Input, LinkButton, PageHeader, ProgressBar, SectionTitle, Select, StatCard, TableWrap, Textarea } from "@/components/ui";
import { formatDate, formatINR, toDateInput, todayInput } from "@/lib/format";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_LABEL,
  PAYMENT_MODE_LABEL,
  PROJECT_STAGES,
  PROJECT_STAGE_LABEL,
  PROJECT_STAGE_TONE,
  SUBSIDY_LABEL,
  SUBSIDY_STATUSES,
} from "@/lib/labels";
import { gstFactor } from "@/lib/quote";
import { projectEconomics } from "@/lib/finance";
import {
  addProjectExpense,
  addTask,
  deletePayment,
  deleteProject,
  deleteTask,
  issueMaterial,
  setProjectStage,
  toggleTask,
  updateProject,
  updateSubsidy,
} from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await prisma.project.findUnique({ where: { id }, select: { code: true } });
  return { title: p?.code ?? "Project" };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings, session, items] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        customer: true,
        quote: true,
        tasks: { orderBy: { sort: "asc" } },
        payments: { orderBy: { date: "desc" } },
        invoices: { orderBy: { date: "desc" } },
        movements: { orderBy: { createdAt: "desc" }, include: { item: true } },
        expenses: { orderBy: { date: "desc" } },
        assignments: { where: { status: "DONE" }, select: { member: { select: { dailyRate: true } } } },
      },
    }),
    getSettings(),
    getSession(),
    prisma.item.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  if (!p) notFound();

  const e = projectEconomics({
    contractValue: p.contractValue,
    gstFactor: gstFactor(settings.gst),
    invoices: p.invoices,
    movements: p.movements,
    expenses: p.expenses,
    payments: p.payments,
  });
  const done = p.tasks.filter((t) => t.done).length;
  const isAdmin = session?.role === "ADMIN";
  const liveInvoices = p.invoices.filter((i) => i.status !== "CANCELLED");

  return (
    <div>
      <PageHeader
        title={`${p.code} · ${p.name}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={PROJECT_STAGE_TONE[p.stage]}>{PROJECT_STAGE_LABEL[p.stage]}</Badge>
            <Link href={`/customers/${p.customerId}`} className="font-medium text-brand">{p.customer.name}</Link>
            {p.quote && <Link href={`/quotes/${p.quote.id}`} className="text-muted hover:text-brand">· quotation {p.quote.number}</Link>}
          </span>
        }
        actions={<LinkButton href={`/invoices/new?projectId=${p.id}`} variant="primary">Create invoice</LinkButton>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Contract value" value={formatINR(p.contractValue)} sub={`${p.systemKw} kW`} />
        <StatCard label="Received" value={formatINR(e.received)} tone="green" sub={`${p.contractValue > 0 ? Math.round((e.received / p.contractValue) * 100) : 0}% of contract`} />
        <StatCard label="Balance due" value={formatINR(e.balance)} tone={e.balance > 0 ? "orange" : "green"} />
        <StatCard label={`Margin${e.estimatedRevenue ? " (est.)" : ""}`} value={formatINR(e.margin)} tone={e.margin < 0 ? "red" : "green"} sub={`${e.marginPct.toFixed(0)}% of ${formatINR(e.revenueExGst)} ex-GST`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <SectionTitle action={<span className="text-xs text-muted">{done} of {p.tasks.length} done</span>}>Checklist</SectionTitle>
            <ProgressBar value={p.tasks.length ? (done / p.tasks.length) * 100 : 0} />
            <ul className="mt-3 divide-y divide-line">
              {p.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-1.5">
                  <form action={toggleTask} className="min-w-0 flex-1">
                    <input type="hidden" name="id" value={t.id} />
                    <button className="flex w-full items-center gap-3 text-left text-sm">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${t.done ? "border-brand bg-brand text-white" : "border-line"}`}>{t.done ? "✓" : ""}</span>
                      <span className={t.done ? "text-muted line-through" : ""}>{t.title}</span>
                      {t.doneAt && <span className="ml-auto text-xs text-muted">{formatDate(t.doneAt)}</span>}
                    </button>
                  </form>
                  <form action={deleteTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="px-1 text-xs text-muted hover:text-danger" title="Remove">✕</button>
                  </form>
                </li>
              ))}
            </ul>
            <ActionForm action={addTask} submitLabel="Add" resetOnSuccess className="mt-3">
              <input type="hidden" name="projectId" value={p.id} />
              <Input name="title" placeholder="Add a task, e.g. Structure fabrication at site" />
            </ActionForm>
          </Card>

          <Card pad={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0"><SectionTitle>Payments received</SectionTitle></div>
            {p.payments.length === 0 ? (
              <EmptyState>No payments yet.</EmptyState>
            ) : (
              <TableWrap>
                <table className="tbl">
                  <tbody>
                    {p.payments.map((x) => (
                      <tr key={x.id}>
                        <td className="whitespace-nowrap">{formatDate(x.date)}</td>
                        <td>
                          {PAYMENT_MODE_LABEL[x.mode]}
                          {x.reference && <div className="text-xs text-muted">{x.reference}</div>}
                        </td>
                        <td className="num font-medium">{formatINR(x.amount)}</td>
                        <td className="w-10 text-right">
                          {isAdmin && (
                            <form action={deletePayment}>
                              <input type="hidden" name="id" value={x.id} />
                              <ConfirmButton message="Delete this payment record?" variant="ghost" className="px-1.5 py-0.5 text-xs text-danger">✕</ConfirmButton>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
            <div className="border-t border-line p-4 sm:p-5">
              <PaymentForm
                customerId={p.customerId}
                projectId={p.id}
                invoices={liveInvoices.map((i) => ({ id: i.id, number: i.number }))}
                suggested={e.balance}
              />
            </div>
          </Card>

          <Card pad={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0"><SectionTitle>Materials issued from stock · {formatINR(e.material)}</SectionTitle></div>
            {p.movements.length === 0 ? (
              <EmptyState>No stock issued to this project yet.</EmptyState>
            ) : (
              <TableWrap>
                <table className="tbl">
                  <thead><tr><th>Date</th><th>Item</th><th className="num">Qty</th><th className="num">Cost</th></tr></thead>
                  <tbody>
                    {p.movements.map((m) => (
                      <tr key={m.id}>
                        <td className="whitespace-nowrap">{formatDate(m.createdAt)}</td>
                        <td>{m.item.name}{m.type === "RETURN" && <span className="ml-1.5 text-xs text-muted">(returned)</span>}</td>
                        <td className="num">{-m.qty} {m.item.uom}</td>
                        <td className="num">{formatINR(-m.qty * m.unitCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
            <div className="border-t border-line p-4 sm:p-5">
              <ActionForm action={issueMaterial} submitLabel="Issue" resetOnSuccess pendingLabel="Saving…">
                <input type="hidden" name="projectId" value={p.id} />
                <div className="grid gap-3 sm:grid-cols-6">
                  <Field label="Item" className="sm:col-span-3">
                    <Select name="itemId" defaultValue="" required>
                      <option value="">— choose —</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>{it.name} ({it.quantity} {it.uom} in stock)</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Qty">
                    <Input name="qty" type="number" min="0" step="any" required />
                  </Field>
                  <label className="flex items-end gap-2 pb-2 text-sm sm:col-span-2">
                    <input type="checkbox" name="isReturn" className="h-4 w-4 accent-[var(--brand)]" /> Return to stock
                  </label>
                </div>
              </ActionForm>
            </div>
          </Card>

          <Card pad={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0"><SectionTitle>Direct expenses · {formatINR(e.direct)}</SectionTitle></div>
            {p.expenses.length > 0 && (
              <TableWrap>
                <table className="tbl">
                  <tbody>
                    {p.expenses.map((x) => (
                      <tr key={x.id}>
                        <td className="whitespace-nowrap">{formatDate(x.date)}</td>
                        <td>{EXPENSE_LABEL[x.category]}{x.vendor && <span className="text-muted"> · {x.vendor}</span>}</td>
                        <td className="num">{formatINR(x.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
            <div className="border-t border-line p-4 sm:p-5">
              <ActionForm action={addProjectExpense} submitLabel="Add expense" resetOnSuccess pendingLabel="Saving…">
                <input type="hidden" name="projectId" value={p.id} />
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Category">
                    <Select name="category" defaultValue="LABOUR">
                      {EXPENSE_CATEGORIES.map((c) => (<option key={c} value={c}>{EXPENSE_LABEL[c]}</option>))}
                    </Select>
                  </Field>
                  <Field label="Amount (₹) *"><Input name="amount" type="number" min="0" step="any" required /></Field>
                  <Field label="Paid to"><Input name="vendor" /></Field>
                  <Field label="Date"><Input name="date" type="date" defaultValue={todayInput()} /></Field>
                </div>
              </ActionForm>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionTitle>Site & crew</SectionTitle>
            <Dl items={[["Man-days worked", String(p.assignments.length)], ["Crew wages (est.)", formatINR(p.assignments.reduce((s, a) => s + a.member.dailyRate, 0))]]} />
            <div className="mt-3 flex flex-wrap gap-2">
              <LinkButton href={`/sites/${p.id}`}>Site view</LinkButton>
              <LinkButton href={`/schedule/assign?projectId=${p.id}`}>Assign crew</LinkButton>
            </div>
            <p className="mt-2 text-xs text-muted">Wages are informational and not in the margin above — add them under Direct expenses to include them.</p>
          </Card>

          <Card>
            <SectionTitle>Stage</SectionTitle>
            <form action={setProjectStage} className="flex gap-2">
              <input type="hidden" name="id" value={p.id} />
              <Select name="stage" defaultValue={p.stage}>
                {PROJECT_STAGES.map((s) => (<option key={s} value={s}>{PROJECT_STAGE_LABEL[s]}</option>))}
              </Select>
              <Button type="submit" variant="secondary">Set</Button>
            </form>
          </Card>

          <Card>
            <SectionTitle>Subsidy</SectionTitle>
            <ActionForm action={updateSubsidy} submitLabel="Update subsidy" pendingLabel="Saving…">
              <input type="hidden" name="id" value={p.id} />
              <div className="space-y-3">
                <Field label="Status">
                  <Select name="subsidyStatus" defaultValue={p.subsidyStatus}>
                    {SUBSIDY_STATUSES.map((s) => (<option key={s} value={s}>{SUBSIDY_LABEL[s]}</option>))}
                  </Select>
                </Field>
                <Field label="Expected subsidy (₹)"><Input name="subsidyAmount" type="number" min="0" defaultValue={p.subsidyAmount} /></Field>
                <Field label="Application / reference no."><Input name="subsidyRef" defaultValue={p.subsidyRef ?? ""} /></Field>
              </div>
            </ActionForm>
          </Card>

          <Card>
            <SectionTitle>Invoices</SectionTitle>
            {p.invoices.length === 0 ? (
              <p className="text-sm text-muted">No invoices yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {p.invoices.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <Link href={`/invoices/${i.id}`} className="text-brand">{i.number}</Link>
                    <span className={i.status === "CANCELLED" ? "text-muted line-through" : ""}>{formatINR(i.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionTitle>Profitability</SectionTitle>
            <Dl
              items={[
                [`Revenue ex-GST${e.estimatedRevenue ? " (est.)" : ""}`, formatINR(e.revenueExGst)],
                ["Materials", `− ${formatINR(e.material)}`],
                ["Direct expenses", `− ${formatINR(e.direct)}`],
                ["Margin", <b key="m" className={e.margin < 0 ? "text-danger" : "text-brand-strong"}>{formatINR(e.margin)}</b>],
              ]}
            />
            {e.estimatedRevenue && <p className="mt-2 text-xs text-muted">Estimated from the contract value until a tax invoice is raised.</p>}
          </Card>

          <Card>
            <SectionTitle>Details</SectionTitle>
            <details>
              <summary className="cursor-pointer text-sm font-medium text-brand">Edit project details</summary>
              <ActionForm action={updateProject} className="mt-3">
                <input type="hidden" name="id" value={p.id} />
                <div className="space-y-3">
                  <Field label="Name"><Input name="name" defaultValue={p.name} required /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="System (kW)"><Input name="systemKw" type="number" step="any" defaultValue={p.systemKw} /></Field>
                    <Field label="Contract value (₹)"><Input name="contractValue" type="number" step="any" defaultValue={p.contractValue} /></Field>
                    <Field label="Start"><Input name="startDate" type="date" defaultValue={toDateInput(p.startDate)} /></Field>
                    <Field label="Target"><Input name="targetDate" type="date" defaultValue={toDateInput(p.targetDate)} /></Field>
                  </div>
                  <Field label="Site address"><Textarea name="address" rows={2} defaultValue={p.address ?? ""} /></Field>
                  <Field label="Notes"><Textarea name="notes" rows={3} defaultValue={p.notes ?? ""} /></Field>
                </div>
              </ActionForm>
            </details>
            <div className="mt-3">
              <Dl items={[["Site", p.address], ["Started", formatDate(p.startDate)], ["Target", formatDate(p.targetDate)], ["Completed", p.completedAt ? formatDate(p.completedAt) : null]]} />
              {p.notes && <p className="mt-3 whitespace-pre-line rounded-lg bg-surface-2 p-3 text-sm">{p.notes}</p>}
            </div>
            {isAdmin && (
              <form action={deleteProject} className="mt-3">
                <input type="hidden" name="id" value={p.id} />
                <ConfirmButton message="Delete this project?" variant="ghost" className="text-danger">Delete project</ConfirmButton>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
