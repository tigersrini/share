import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Icon from "@/components/Icon";
import { StatusDot } from "@/components/CrewBits";
import { Badge, Card, EmptyState, PageHeader, ProgressBar, StatCard } from "@/components/ui";
import { endOfDay, formatDate, nowMs, startOfDay, timeAgo, toDateInput } from "@/lib/format";
import { ACTIVE_PROJECT_STAGES, PROJECT_STAGE_LABEL, PROJECT_STAGE_TONE } from "@/lib/labels";
import { dayLabel } from "@/lib/team";

export const metadata: Metadata = { title: "Sites" };
export const dynamic = "force-dynamic";

export default async function SitesPage() {
  const now = new Date();
  const todayKey = toDateInput(now);
  const projects = await prisma.project.findMany({
    where: { stage: { in: [...ACTIVE_PROJECT_STAGES, "ON_HOLD"] } },
    orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    include: { customer: { select: { name: true, phone: true } }, tasks: { select: { done: true } } },
  });
  const ids = projects.map((p) => p.id);
  const [assignments, updates, members] = await Promise.all([
    prisma.assignment.findMany({ where: { projectId: { in: ids }, date: { gte: startOfDay(now), lte: endOfDay(new Date(nowMs() + 30 * 86400000)) } }, orderBy: { date: "asc" }, include: { member: { select: { id: true, name: true } } } }),
    prisma.siteUpdate.findMany({ where: { projectId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.teamMember.count({ where: { active: true } }),
  ]);

  const crewToday = new Map<string, typeof assignments>();
  const next = new Map<string, { key: string; names: string[] }>();
  for (const a of assignments) {
    const k = toDateInput(a.date);
    if (k === todayKey) crewToday.set(a.projectId, [...(crewToday.get(a.projectId) ?? []), a]);
    else if (!next.has(a.projectId)) next.set(a.projectId, { key: k, names: [] });
    const n = next.get(a.projectId);
    if (n && n.key === k && k !== todayKey) n.names.push(a.member.name.split(" ")[0]);
  }
  const lastUpdate = new Map<string, (typeof updates)[number]>();
  for (const u of updates) if (!lastUpdate.has(u.projectId)) lastUpdate.set(u.projectId, u);

  const peopleToday = new Set(assignments.filter((a) => toDateInput(a.date) === todayKey && a.status !== "ABSENT").map((a) => a.memberId)).size;
  const sitesNoCrew = projects.filter((p) => !(crewToday.get(p.id) ?? []).some((a) => a.status !== "ABSENT") && p.stage !== "ON_HOLD" && ["PROCUREMENT", "INSTALLATION", "COMMISSIONING", "NET_METERING"].includes(p.stage)).length;

  return (
    <div>
      <PageHeader title="Sites" subtitle={`Live status of every running job · ${dayLabel(todayKey)}`} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active sites" value={projects.length} />
        <StatCard label="People on site today" value={peopleToday} tone="green" sub={`of ${members} on the team`} href="/schedule" />
        <StatCard label="Sites with no crew today" value={sitesNoCrew} tone={sitesNoCrew ? "orange" : "green"} sub="in procurement / install stages" href="/schedule" />
        <StatCard label="Free today" value={Math.max(0, members - peopleToday)} sub="available to assign" href="/schedule" />
      </div>

      {projects.length === 0 ? (
        <Card><EmptyState>No active sites. Start a project from an accepted quotation.</EmptyState></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const done = p.tasks.filter((t) => t.done).length;
            const pct = p.tasks.length ? (done / p.tasks.length) * 100 : 0;
            const today = crewToday.get(p.id) ?? [];
            const upd = lastUpdate.get(p.id);
            const nx = next.get(p.id);
            const overdue = p.targetDate && toDateInput(p.targetDate) < todayKey;
            const maps = p.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}` : null;
            return (
              <Card key={p.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/sites/${p.id}`} className="min-w-0">
                    <div className="truncate text-base font-semibold hover:text-brand">{p.customer.name}</div>
                    <div className="text-xs text-muted">{p.code} · {p.systemKw} kW</div>
                  </Link>
                  <Badge tone={PROJECT_STAGE_TONE[p.stage]}>{PROJECT_STAGE_LABEL[p.stage]}</Badge>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted"><span>Checklist</span><span>{done}/{p.tasks.length}</span></div>
                  <ProgressBar value={pct} />
                </div>

                <div className="text-sm">
                  {today.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium text-muted">Today:</span>
                      {today.map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs"><StatusDot status={a.status} />{a.member.name.split(" ")[0]}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge tone="amber">No crew today</Badge>
                      {nx && <span className="text-muted">Next: {dayLabel(nx.key, { short: true })} · {nx.names.join(", ")}</span>}
                    </div>
                  )}
                </div>

                <div className="min-h-10 rounded-lg bg-surface-2 px-3 py-2 text-xs">
                  {upd ? (<><span className="line-clamp-2">{upd.note}</span><span className="mt-0.5 block text-muted">{upd.createdByName ?? "—"} · {timeAgo(upd.createdAt)}</span></>) : <span className="text-muted">No site updates yet.</span>}
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span className={overdue ? "font-medium text-danger" : ""}>{p.targetDate ? `Target ${formatDate(p.targetDate)}${overdue ? " · overdue" : ""}` : "No target date"}</span>
                  <span className="flex gap-1.5">
                    <a href={`tel:${p.customer.phone}`} className="rounded-lg border border-line p-1.5 hover:bg-surface-2 hover:text-ink" title="Call customer"><Icon name="phone" className="h-4 w-4" /></a>
                    {maps && <a href={maps} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-2 py-1.5 font-medium hover:bg-surface-2 hover:text-ink">📍 Directions</a>}
                    <Link href={`/sites/${p.id}`} className="rounded-lg bg-brand px-2.5 py-1.5 font-medium text-white hover:bg-brand-strong">Open</Link>
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
