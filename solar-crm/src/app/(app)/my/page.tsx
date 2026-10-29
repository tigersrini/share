import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import Icon from "@/components/Icon";
import { SiteChip } from "@/components/CrewBits";
import { Badge, Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { endOfDay, formatDate, startOfDay, startOfMonth, toDateInput } from "@/lib/format";
import { ASSIGNMENT_LABEL, ASSIGNMENT_TONE, dayLabel } from "@/lib/team";
import { setAssignmentStatus } from "../schedule/actions";

export const metadata: Metadata = { title: "My jobs" };
export const dynamic = "force-dynamic";

export default async function MyJobsPage() {
  const session = await requireSession();
  const member = await prisma.teamMember.findUnique({ where: { userId: session.userId } });
  if (!member) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title="My jobs" />
        <Card>
          <EmptyState>
            Your login isn’t linked to a team member yet.
            {session.role !== "FIELD" && <> Open <Link href="/team" className="font-medium text-brand underline">Team</Link>, choose yourself and set “Phone login”.</>}
            {session.role === "FIELD" && " Ask the office to link it."}
          </EmptyState>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const todayKey = toDateInput(now);
  const include = { project: { select: { id: true, code: true, name: true, address: true, systemKw: true, customer: { select: { name: true, phone: true } } } } };
  const [today, upcoming, recent, monthDays] = await Promise.all([
    prisma.assignment.findMany({ where: { memberId: member.id, date: { gte: startOfDay(now), lte: endOfDay(now) } }, include }),
    prisma.assignment.findMany({ where: { memberId: member.id, date: { gt: endOfDay(now) } }, orderBy: { date: "asc" }, take: 14, include }),
    prisma.assignment.findMany({ where: { memberId: member.id, date: { lt: startOfDay(now) } }, orderBy: { date: "desc" }, take: 10, include }),
    prisma.assignment.count({ where: { memberId: member.id, status: "DONE", date: { gte: startOfMonth(now) } } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Hi ${member.name.split(" ")[0]}`} subtitle={`${dayLabel(todayKey)} · ${monthDays} day${monthDays === 1 ? "" : "s"} worked this month`} />

      <h2 className="mb-2 text-sm font-semibold">Today</h2>
      {today.length === 0 ? (
        <Card className="mb-5"><EmptyState>No site assigned today. Enjoy the day off — or check with the office.</EmptyState></Card>
      ) : (
        <div className="mb-5 space-y-3">
          {today.map((a) => {
            const maps = a.project.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.project.address)}` : null;
            return (
              <Card key={a.id} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="text-lg font-semibold">{a.project.customer.name}</div><div className="text-xs text-muted">{a.project.code} · {a.project.systemKw} kW</div></div>
                  <Badge tone={ASSIGNMENT_TONE[a.status]}>{ASSIGNMENT_LABEL[a.status]}</Badge>
                </div>
                {a.project.address && <p className="text-sm">{a.project.address}</p>}
                {a.note && <p className="rounded-lg bg-surface-2 p-2.5 text-sm">📝 {a.note}</p>}
                <div className="flex flex-wrap gap-2">
                  {maps && <a href={maps} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2">📍 Directions</a>}
                  <a href={`tel:${a.project.customer.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2"><Icon name="phone" className="h-4 w-4" /> Call customer</a>
                  <Link href={`/sites/${a.project.id}`} className="inline-flex items-center rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong">Open site · post update</Link>
                </div>
                {a.status !== "DONE" && (
                  <form action={setAssignmentStatus}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="status" value="DONE" />
                    <button className="w-full rounded-lg bg-brand-soft py-2.5 text-sm font-semibold text-brand-strong hover:brightness-95">✓ I’m on site</button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mb-4">
        <SectionTitle>Coming up</SectionTitle>
        {upcoming.length === 0 ? <p className="text-sm text-muted">Nothing planned yet.</p> : (
          <ul className="divide-y divide-line text-sm">
            {upcoming.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="w-28 shrink-0 font-medium">{dayLabel(toDateInput(a.date))}</span>
                <SiteChip code={a.project.code} href={`/sites/${a.project.id}`}>{a.project.customer.name}</SiteChip>
                <span className="w-full text-xs text-muted sm:w-auto">{a.note}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle>Recent</SectionTitle>
        {recent.length === 0 ? <p className="text-sm text-muted">No history yet.</p> : (
          <ul className="divide-y divide-line text-sm">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                <span>{formatDate(a.date)} · {a.project.customer.name}</span>
                <Badge tone={ASSIGNMENT_TONE[a.status]}>{ASSIGNMENT_LABEL[a.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
