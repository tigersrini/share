import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ActionForm from "@/components/ActionForm";
import ConfirmButton from "@/components/ConfirmButton";
import Icon from "@/components/Icon";
import { SiteChip } from "@/components/CrewBits";
import { Badge, Card, EmptyState, Field, Input, LinkButton, PageHeader, SectionTitle, Select, TableWrap, Textarea } from "@/components/ui";
import { financialYearStart, formatDate, formatINR, startOfDay, startOfMonth, toDateInput, whatsAppLink } from "@/lib/format";
import { ASSIGNMENT_LABEL, ASSIGNMENT_TONE, MEMBER_ROLES } from "@/lib/team";
import { deleteMember, updateMember } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const m = await prisma.teamMember.findUnique({ where: { id }, select: { name: true } });
  return { title: m?.name ?? "Team member" };
}

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const [m, users] = await Promise.all([
    prisma.teamMember.findUnique({ where: { id }, include: { user: true } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, include: { teamMember: { select: { id: true } } } }),
  ]);
  if (!m) notFound();

  const today = startOfDay(new Date());
  const [upcoming, history] = await Promise.all([
    prisma.assignment.findMany({ where: { memberId: id, date: { gte: today } }, orderBy: { date: "asc" }, take: 40, include: { project: { select: { id: true, code: true, customer: { select: { name: true } } } } } }),
    prisma.assignment.findMany({ where: { memberId: id, date: { lt: today } }, orderBy: { date: "desc" }, take: 120, include: { project: { select: { id: true, code: true, customer: { select: { name: true } } } } } }),
  ]);
  const all = await prisma.assignment.findMany({ where: { memberId: id, status: "DONE", date: { gte: financialYearStart() } }, select: { date: true, projectId: true } });
  const monthStart = startOfMonth();
  const monthDays = all.filter((a) => a.date >= monthStart).length;
  const sitesWorked = new Set(all.map((a) => a.projectId)).size;
  const linkable = users.filter((u) => !u.teamMember || u.teamMember.id === m.id);

  return (
    <div>
      <PageHeader
        title={m.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span>{m.role}</span>
            {!m.active && <Badge tone="red">Inactive</Badge>}
            {m.user && <Badge tone="violet">Login: {m.user.email}</Badge>}
          </span>
        }
        actions={
          <>
            {m.phone && (
              <>
                <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2"><Icon name="phone" className="h-4 w-4" /> Call</a>
                <a href={whatsAppLink(m.phone, `Hi ${m.name.split(" ")[0]}, `)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2"><Icon name="whatsapp" className="h-4 w-4" /> WhatsApp</a>
              </>
            )}
            <LinkButton href={`/schedule/assign?memberId=${m.id}`} variant="primary">Assign to site</LinkButton>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><div className="text-xs text-muted">Worked this month</div><div className="text-2xl font-semibold tabular-nums">{monthDays} <span className="text-sm font-normal text-muted">days</span></div></Card>
        <Card><div className="text-xs text-muted">This financial year</div><div className="text-2xl font-semibold tabular-nums">{all.length} <span className="text-sm font-normal text-muted">days</span></div></Card>
        <Card><div className="text-xs text-muted">Sites worked (FY)</div><div className="text-2xl font-semibold tabular-nums">{sitesWorked}</div></Card>
        <Card><div className="text-xs text-muted">Wages this month (est.)</div><div className="text-2xl font-semibold tabular-nums">{m.dailyRate > 0 ? formatINR(monthDays * m.dailyRate) : "—"}</div>{m.dailyRate > 0 && <div className="text-xs text-muted">{formatINR(m.dailyRate)} × {monthDays} days</div>}</Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card pad={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0"><SectionTitle>Upcoming plan</SectionTitle></div>
            {upcoming.length === 0 ? <EmptyState>Nothing planned. <Link href={`/schedule/assign?memberId=${m.id}`} className="font-medium text-brand underline">Assign to a site</Link>.</EmptyState> : (
              <ul className="divide-y divide-line px-4 pb-2 text-sm sm:px-5">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="w-28 shrink-0 font-medium">{formatDate(a.date)}</span>
                    <SiteChip code={a.project.code} href={`/sites/${a.project.id}`}>{a.project.code} · {a.project.customer.name}</SiteChip>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted">{a.note}</span>
                    <Badge tone={ASSIGNMENT_TONE[a.status]}>{ASSIGNMENT_LABEL[a.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card pad={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0"><SectionTitle action={<Link href={`/team/history?memberId=${m.id}`} className="text-xs font-medium text-brand">Full report →</Link>}>Site history</SectionTitle></div>
            {history.length === 0 ? <EmptyState>No past site days recorded.</EmptyState> : (
              <TableWrap>
                <table className="tbl">
                  <thead><tr><th>Date</th><th>Site</th><th>Status</th><th>Note</th></tr></thead>
                  <tbody>
                    {history.map((a) => (
                      <tr key={a.id}>
                        <td className="whitespace-nowrap">{formatDate(a.date)}</td>
                        <td><SiteChip code={a.project.code} href={`/sites/${a.project.id}`}>{a.project.code} · {a.project.customer.name}</SiteChip></td>
                        <td><Badge tone={ASSIGNMENT_TONE[a.status]}>{ASSIGNMENT_LABEL[a.status]}</Badge></td>
                        <td className="text-xs text-muted">{a.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </div>

        <Card>
          <SectionTitle>Profile</SectionTitle>
          <ActionForm action={updateMember} submitLabel="Save" pendingLabel="Saving…">
            <input type="hidden" name="id" value={m.id} />
            <div className="space-y-3">
              <Field label="Name *"><Input name="name" defaultValue={m.name} required /></Field>
              <Field label="Phone"><Input name="phone" type="tel" defaultValue={m.phone ?? ""} /></Field>
              <Field label="Role">
                <Input name="role" list="member-roles" defaultValue={m.role} />
                <datalist id="member-roles">{MEMBER_ROLES.map((r) => <option key={r} value={r} />)}</datalist>
              </Field>
              <Field label="Daily wage (₹)"><Input name="dailyRate" type="number" min="0" step="any" defaultValue={m.dailyRate} /></Field>
              <Field label="Joined on"><Input name="joinedOn" type="date" defaultValue={toDateInput(m.joinedOn)} /></Field>
              <Field label="Phone login" hint="lets them open My Jobs">
                <Select name="userId" defaultValue={m.userId ?? ""}>
                  <option value="">— no login —</option>
                  {linkable.map((u) => (<option key={u.id} value={u.id}>{u.name} ({u.email})</option>))}
                </Select>
              </Field>
              <Field label="Notes"><Textarea name="notes" rows={2} defaultValue={m.notes ?? ""} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={m.active} className="h-4 w-4 accent-[var(--brand)]" /> Active (can be assigned)</label>
            </div>
          </ActionForm>
          <p className="mt-3 text-xs text-muted">To give someone a phone login, create a user with the “Field crew” role in Settings → Staff accounts, then link it here.</p>
          {session?.role === "ADMIN" && (
            <form action={deleteMember} className="mt-3">
              <input type="hidden" name="id" value={m.id} />
              <ConfirmButton message={`Delete ${m.name}? Only possible if they have no site history.`} variant="ghost" className="text-danger">Delete member</ConfirmButton>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
