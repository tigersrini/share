import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ActionForm from "@/components/ActionForm";
import ConfirmButton from "@/components/ConfirmButton";
import { HBars } from "@/components/Charts";
import { Badge, Card, EmptyState, Field, Input, LinkButton, PageHeader, SectionTitle, Select, StatCard, TableWrap } from "@/components/ui";
import { financialYear, financialYearStart, formatDate, formatINR, startOfMonth, todayInput } from "@/lib/format";
import { EXPENSE_CATEGORIES, EXPENSE_LABEL, PAYMENT_MODES, PAYMENT_MODE_LABEL } from "@/lib/labels";
import { createExpense, deleteExpense } from "./actions";

export const metadata: Metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ range?: string; cat?: string }> }) {
  const { range = "month", cat } = await searchParams;
  const from = range === "fy" ? financialYearStart() : range === "all" ? undefined : startOfMonth();
  const where = {
    ...(from ? { date: { gte: from } } : {}),
    ...(cat && (EXPENSE_CATEGORIES as readonly string[]).includes(cat) ? { category: cat as (typeof EXPENSE_CATEGORIES)[number] } : {}),
  };
  const [expenses, projects, session] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: { date: "desc" }, take: 500, include: { project: { select: { id: true, code: true } } } }),
    prisma.project.findMany({ where: { stage: { notIn: ["CANCELLED"] } }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, code: true, name: true } }),
    getSession(),
  ]);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const direct = expenses.filter((e) => e.projectId).reduce((s, e) => s + e.amount, 0);
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ label: EXPENSE_LABEL[c], value: expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  const ranges = [["month", "This month"], ["fy", `FY ${financialYear()}`], ["all", "All time"]];

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Overheads and direct project costs. Stock used on jobs is tracked in Inventory." actions={<LinkButton href={`/api/export/expenses?range=${range}`}>Export CSV</LinkButton>} />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="Total" value={formatINR(total)} />
        <StatCard label="Direct (projects)" value={formatINR(direct)} />
        <StatCard label="Overheads" value={formatINR(total - direct)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {ranges.map(([k, l]) => (
              <Link key={k} href={`/expenses?range=${k}`} className={`rounded-full px-3 py-1 text-xs font-medium ${range === k && !cat ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-ink"}`}>{l}</Link>
            ))}
          </div>
          <Card pad={false}>
            {expenses.length === 0 ? (
              <EmptyState>No expenses in this period.</EmptyState>
            ) : (
              <TableWrap>
                <table className="tbl">
                  <thead><tr><th>Date</th><th>Category</th><th>Paid to</th><th>Project</th><th className="num">Amount</th><th /></tr></thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap">{formatDate(e.date)}</td>
                        <td>{EXPENSE_LABEL[e.category]}{e.mode && <div className="text-xs text-muted">{PAYMENT_MODE_LABEL[e.mode]}</div>}</td>
                        <td>{e.vendor ?? "—"}{e.note && <div className="text-xs text-muted">{e.note}</div>}</td>
                        <td>{e.project ? <Link href={`/projects/${e.project.id}`}><Badge tone="blue">{e.project.code}</Badge></Link> : <span className="text-xs text-muted">Overhead</span>}</td>
                        <td className="num font-medium">{formatINR(e.amount)}</td>
                        <td className="text-right">
                          {session?.role === "ADMIN" && (
                            <form action={deleteExpense}>
                              <input type="hidden" name="id" value={e.id} />
                              <ConfirmButton message="Delete this expense?" variant="ghost" className="px-2 py-0.5 text-xs text-danger">✕</ConfirmButton>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <SectionTitle>Add expense</SectionTitle>
            <ActionForm action={createExpense} submitLabel="Add expense" pendingLabel="Saving…" resetOnSuccess>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount (₹) *"><Input name="amount" type="number" min="0" step="any" required /></Field>
                  <Field label="Date"><Input name="date" type="date" defaultValue={todayInput()} /></Field>
                </div>
                <Field label="Category">
                  <Select name="category" defaultValue="OTHER">{EXPENSE_CATEGORIES.map((c) => (<option key={c} value={c}>{EXPENSE_LABEL[c]}</option>))}</Select>
                </Field>
                <Field label="Paid to"><Input name="vendor" /></Field>
                <Field label="Charge to project" hint="optional = direct cost">
                  <Select name="projectId" defaultValue="">
                    <option value="">— overhead (no project) —</option>
                    {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} · {p.name}</option>))}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mode"><Select name="mode" defaultValue="BANK_TRANSFER">{PAYMENT_MODES.map((m) => (<option key={m} value={m}>{PAYMENT_MODE_LABEL[m]}</option>))}</Select></Field>
                  <Field label="Note"><Input name="note" /></Field>
                </div>
              </div>
            </ActionForm>
          </Card>
          <Card>
            <SectionTitle>By category</SectionTitle>
            <HBars rows={byCat} color="var(--sun)" />
          </Card>
        </div>
      </div>
    </div>
  );
}
