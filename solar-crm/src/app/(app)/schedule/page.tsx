import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SiteChip } from "@/components/CrewBits";
import { Button, Card, EmptyState, LinkButton, PageHeader, SectionTitle, Select } from "@/components/ui";
import { endOfDay, fromDateInput, startOfDay, toDateInput } from "@/lib/format";
import { addDaysKey, dayLabel, monthGrid } from "@/lib/team";
import DayDetail, { type Row } from "./DayDetail";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

const keyOf = (d: Date) => toDateInput(d);

/** rows → { dayKey → { projectId → rows[] } } */
function group(rows: Row[]) {
  const out = new Map<string, Map<string, Row[]>>();
  for (const r of rows) {
    const k = keyOf(r.date);
    const day = out.get(k) ?? new Map<string, Row[]>();
    day.set(r.projectId, [...(day.get(r.projectId) ?? []), r]);
    out.set(k, day);
  }
  return out;
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ m?: string; day?: string; memberId?: string; projectId?: string }> }) {
  const sp = await searchParams;
  const session = await getSession();
  const canEdit = session?.role !== "FIELD";
  const todayKey = toDateInput(new Date());
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "") ? sp.day! : todayKey;
  const ym = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? sp.m! : day.slice(0, 7);
  const grid = monthGrid(ym);
  const agendaEnd = addDaysKey(day, 13);
  const filter = { ...(sp.memberId ? { memberId: sp.memberId } : {}), ...(sp.projectId ? { projectId: sp.projectId } : {}) };
  const include = { member: { select: { id: true, name: true, role: true } }, project: { select: { id: true, code: true, customer: { select: { name: true } } } } };

  const [monthRows, agendaRows, members, projects] = await Promise.all([
    prisma.assignment.findMany({ where: { ...filter, date: { gte: startOfDay(fromDateInput(grid.days[0].key)!), lte: endOfDay(fromDateInput(grid.days[grid.days.length - 1].key)!) } }, include, orderBy: { member: { name: "asc" } } }),
    prisma.assignment.findMany({ where: { ...filter, date: { gte: startOfDay(fromDateInput(day)!), lte: endOfDay(fromDateInput(agendaEnd)!) } }, include, orderBy: [{ date: "asc" }, { member: { name: "asc" } }] }),
    prisma.teamMember.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
    prisma.project.findMany({ where: { stage: { notIn: ["CANCELLED"] } }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, code: true, customer: { select: { name: true } } } }),
  ]);

  const byDay = group(monthRows as Row[]);
  const agenda = group(agendaRows as Row[]);
  const dayGroups = byDay.get(day) ?? new Map<string, Row[]>();
  const busyIds = new Set([...dayGroups.values()].flat().filter((r) => r.status !== "ABSENT").map((r) => r.memberId));
  const free = members.filter((m) => !busyIds.has(m.id));

  const q = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base: Record<string, string | undefined> = { m: ym, day, memberId: sp.memberId, projectId: sp.projectId, ...over };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    return `/schedule?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Schedule"
        subtitle="Plan who goes to which site, and mark attendance"
        actions={canEdit ? <LinkButton href={`/schedule/assign?date=${day}`} variant="primary">+ Assign crew</LinkButton> : undefined}
      />

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="m" value={ym} />
        <input type="hidden" name="day" value={day} />
        <div className="min-w-40 flex-1 sm:flex-none">
          <Select name="memberId" defaultValue={sp.memberId ?? ""} aria-label="Filter by member"><option value="">All members</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
        </div>
        <div className="min-w-40 flex-1 sm:flex-none">
          <Select name="projectId" defaultValue={sp.projectId ?? ""} aria-label="Filter by site"><option value="">All sites</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.customer.name}</option>)}</Select>
        </div>
        <Button type="submit" variant="secondary">Filter</Button>
        {(sp.memberId || sp.projectId) && <Link href={q({ memberId: undefined, projectId: undefined })} className="px-2 py-2 text-xs text-muted hover:text-ink">Clear</Link>}
      </form>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* PC: month grid */}
          <Card pad={false} className="hidden md:block">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <Link href={q({ m: grid.prev, day: `${grid.prev}-01` })} className="rounded-lg px-3 py-1 text-sm font-medium hover:bg-surface-2">← Prev</Link>
              <div className="text-sm font-semibold">{grid.label}</div>
              <div className="flex gap-1">
                <Link href={q({ m: todayKey.slice(0, 7), day: todayKey })} className="rounded-lg px-3 py-1 text-sm font-medium text-brand hover:bg-surface-2">Today</Link>
                <Link href={q({ m: grid.next, day: `${grid.next}-01` })} className="rounded-lg px-3 py-1 text-sm font-medium hover:bg-surface-2">Next →</Link>
              </div>
            </div>
            <div className="grid grid-cols-7 border-b border-line text-center text-[0.68rem] font-semibold uppercase tracking-wide text-muted">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1.5">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {grid.days.map((d) => {
                const groups = byDay.get(d.key);
                const people = groups ? [...groups.values()].flat().length : 0;
                const entries = groups ? [...groups.entries()] : [];
                const isToday = d.key === todayKey;
                const selected = d.key === day;
                return (
                  <Link
                    key={d.key}
                    href={q({ day: d.key, m: ym })}
                    className={`min-h-[6.5rem] border-b border-r border-line p-1.5 text-left transition hover:bg-surface-2 ${d.inMonth ? "" : "bg-surface-2/50 text-muted"} ${selected ? "ring-2 ring-inset ring-brand" : ""}`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${isToday ? "bg-brand font-semibold text-white" : ""}`}>{Number(d.key.slice(8))}</span>
                      {people > 0 && <span className="text-[0.65rem] text-muted">{people} 👷</span>}
                    </div>
                    <div className="space-y-0.5">
                      {entries.slice(0, 3).map(([pid, rows]) => (
                        <SiteChip key={pid} code={rows[0].project.code}>{rows[0].project.customer.name.split(" ")[0]} · {rows.length}</SiteChip>
                      ))}
                      {entries.length > 3 && <div className="text-[0.65rem] text-muted">+{entries.length - 3} more sites</div>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          {/* Phone: agenda */}
          <div className="space-y-3 md:hidden">
            <div className="flex items-center justify-between">
              <Link href={q({ day: addDaysKey(day, -7), m: undefined })} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium">← Week</Link>
              <Link href={q({ day: todayKey, m: undefined })} className="text-sm font-medium text-brand">Today</Link>
              <Link href={q({ day: addDaysKey(day, 7), m: undefined })} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium">Week →</Link>
            </div>
            {Array.from({ length: 14 }, (_, i) => addDaysKey(day, i)).map((k) => {
              const groups = agenda.get(k);
              if (!groups) {
                return (
                  <div key={k} className="flex items-center justify-between px-1 text-sm text-muted">
                    <span>{dayLabel(k)}{k === todayKey && <span className="ml-2 text-xs font-medium text-brand">Today</span>} · free</span>
                    {canEdit && <Link href={`/schedule/assign?date=${k}`} className="text-xs font-medium text-brand">+ Assign</Link>}
                  </div>
                );
              }
              return (
                <Card key={k} className={k === todayKey ? "border-brand/60" : ""}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{dayLabel(k)}{k === todayKey && <span className="ml-2 text-xs font-medium text-brand">Today</span>}</span>
                    {canEdit && <Link href={`/schedule/assign?date=${k}`} className="text-xs font-medium text-brand">+ Assign</Link>}
                  </div>
                  <DayDetail groups={groups} k={k} canEdit={canEdit} />
                </Card>
              );
            })}
          </div>
        </div>

        {/* Day panel (PC) */}
        <div className="hidden space-y-4 md:block">
          <Card>
            <SectionTitle>{dayLabel(day)}{day === todayKey ? " · Today" : ""}</SectionTitle>
            <DayDetail groups={dayGroups} k={day} canEdit={canEdit} />
            {canEdit && <LinkButton href={`/schedule/assign?date=${day}`} className="mt-3 w-full">+ Assign crew for this day</LinkButton>}
          </Card>
          <Card>
            <SectionTitle>Available this day · {free.length}</SectionTitle>
            {free.length === 0 ? <p className="text-sm text-muted">Everyone is booked.</p> : (
              <ul className="space-y-1.5 text-sm">{free.map((m) => <li key={m.id} className="flex justify-between"><Link href={`/team/${m.id}`} className="hover:text-brand">{m.name}</Link><span className="text-xs text-muted">{m.role}</span></li>)}</ul>
            )}
          </Card>
        </div>
      </div>
      <div className="md:hidden">{members.length === 0 && <EmptyState>Add team members to start planning.</EmptyState>}</div>
    </div>
  );
}
