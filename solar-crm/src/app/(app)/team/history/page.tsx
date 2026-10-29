import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteChip } from "@/components/CrewBits";
import { Badge, Button, Card, EmptyState, Field, Input, LinkButton, PageHeader, SectionTitle, Select, TableWrap } from "@/components/ui";
import { endOfDay, formatDate, fromDateInput, startOfDay, toDateInput } from "@/lib/format";
import { addDaysKey, ASSIGNMENT_LABEL, ASSIGNMENT_TONE } from "@/lib/team";

export const metadata: Metadata = { title: "Who worked where" };
export const dynamic = "force-dynamic";

export default async function CrewHistoryPage({ searchParams }: { searchParams: Promise<{ memberId?: string; projectId?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const todayKey = toDateInput(new Date());
  const from = sp.from || addDaysKey(todayKey, -30);
  const to = sp.to || todayKey;
  const fromD = fromDateInput(from) ?? new Date();
  const toD = fromDateInput(to) ?? new Date();

  const where = {
    date: { gte: startOfDay(fromD), lte: endOfDay(toD) },
    ...(sp.memberId ? { memberId: sp.memberId } : {}),
    ...(sp.projectId ? { projectId: sp.projectId } : {}),
  };
  const [rows, members, projects] = await Promise.all([
    prisma.assignment.findMany({ where, orderBy: [{ date: "desc" }, { member: { name: "asc" } }], take: 1000, include: { member: { select: { id: true, name: true, role: true } }, project: { select: { id: true, code: true, customer: { select: { name: true } } } } } }),
    prisma.teamMember.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ orderBy: { createdAt: "desc" }, take: 300, select: { id: true, code: true, customer: { select: { name: true } } } }),
  ]);

  const worked = rows.filter((r) => r.status === "DONE");
  const byMember = new Map<string, { name: string; days: number; sites: Set<string> }>();
  const bySite = new Map<string, { code: string; customer: string; manDays: number; people: Set<string> }>();
  for (const r of worked) {
    const m = byMember.get(r.memberId) ?? { name: r.member.name, days: 0, sites: new Set<string>() };
    m.days++; m.sites.add(r.projectId); byMember.set(r.memberId, m);
    const s = bySite.get(r.projectId) ?? { code: r.project.code, customer: r.project.customer.name, manDays: 0, people: new Set<string>() };
    s.manDays++; s.people.add(r.memberId); bySite.set(r.projectId, s);
  }
  const qs = new URLSearchParams({ from, to, ...(sp.memberId ? { memberId: sp.memberId } : {}), ...(sp.projectId ? { projectId: sp.projectId } : {}) }).toString();

  return (
    <div>
      <PageHeader title="Who worked where" subtitle={<Link href="/team" className="text-brand">← Team</Link>} actions={<LinkButton href={`/api/export/crew?${qs}`}>Export CSV</LinkButton>} />
      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-5">
          <Field label="Member"><Select name="memberId" defaultValue={sp.memberId ?? ""}><option value="">Everyone</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
          <Field label="Site"><Select name="projectId" defaultValue={sp.projectId ?? ""}><option value="">All sites</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.customer.name}</option>)}</Select></Field>
          <Field label="From"><Input name="from" type="date" defaultValue={from} /></Field>
          <Field label="To"><Input name="to" type="date" defaultValue={to} /></Field>
          <div className="flex items-end"><Button type="submit" className="w-full">Show</Button></div>
        </form>
      </Card>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Card>
          <SectionTitle>Days worked by person</SectionTitle>
          {byMember.size === 0 ? <p className="text-sm text-muted">No worked days in this range.</p> : (
            <ul className="space-y-1.5 text-sm">
              {[...byMember.entries()].sort((a, b) => b[1].days - a[1].days).map(([id, v]) => (
                <li key={id} className="flex justify-between"><Link href={`/team/${id}`} className="hover:text-brand">{v.name}</Link><span className="tabular-nums text-muted">{v.days} days · {v.sites.size} site{v.sites.size > 1 ? "s" : ""}</span></li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <SectionTitle>Man-days by site</SectionTitle>
          {bySite.size === 0 ? <p className="text-sm text-muted">No worked days in this range.</p> : (
            <ul className="space-y-1.5 text-sm">
              {[...bySite.entries()].sort((a, b) => b[1].manDays - a[1].manDays).map(([id, v]) => (
                <li key={id} className="flex justify-between"><Link href={`/sites/${id}`} className="hover:text-brand">{v.code} · {v.customer}</Link><span className="tabular-nums text-muted">{v.manDays} man-days · {v.people.size} people</span></li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card pad={false}>
        {rows.length === 0 ? <EmptyState>Nothing recorded for this selection.</EmptyState> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Date</th><th>Member</th><th>Site</th><th>Status</th><th>Note</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{formatDate(r.date)}</td>
                    <td><Link href={`/team/${r.member.id}`} className="font-medium hover:text-brand">{r.member.name}</Link><div className="text-xs text-muted">{r.member.role}</div></td>
                    <td><SiteChip code={r.project.code} href={`/sites/${r.project.id}`}>{r.project.code} · {r.project.customer.name}</SiteChip></td>
                    <td><Badge tone={ASSIGNMENT_TONE[r.status]}>{ASSIGNMENT_LABEL[r.status]}</Badge></td>
                    <td className="text-xs text-muted">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
