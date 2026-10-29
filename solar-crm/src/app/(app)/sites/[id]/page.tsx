import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ActionForm from "@/components/ActionForm";
import AssignForm, { StatusDot } from "@/components/CrewBits";
import Icon from "@/components/Icon";
import { Badge, Button, Card, Dl, LinkButton, PageHeader, ProgressBar, SectionTitle, Select, Textarea } from "@/components/ui";
import { formatDate, timeAgo, toDateInput } from "@/lib/format";
import { PROJECT_STAGES, PROJECT_STAGE_LABEL, PROJECT_STAGE_TONE } from "@/lib/labels";
import { ASSIGNMENT_LABEL, ASSIGNMENT_TONE, dayLabel } from "@/lib/team";
import { markDayPresent, removeAssignment, setAssignmentStatus } from "../../schedule/actions";
import { setProjectStage } from "../../projects/actions";
import { postSiteUpdate, toggleSiteTask } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await prisma.project.findUnique({ where: { id }, select: { code: true, customer: { select: { name: true } } } });
  return { title: p ? `${p.customer.name} · ${p.code}` : "Site" };
}

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const canEdit = session?.role !== "FIELD";
  const p = await prisma.project.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, phone: true } },
      tasks: { orderBy: { sort: "asc" } },
      assignments: { orderBy: { date: "asc" }, include: { member: { select: { id: true, name: true, role: true } } } },
      siteUpdates: { orderBy: { createdAt: "desc" }, take: 40 },
    },
  });
  if (!p) notFound();

  const members = canEdit ? await prisma.teamMember.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }) : [];
  const todayKey = toDateInput(new Date());
  const byDay = new Map<string, typeof p.assignments>();
  for (const a of p.assignments) byDay.set(toDateInput(a.date), [...(byDay.get(toDateInput(a.date)) ?? []), a]);
  const todayRows = byDay.get(todayKey) ?? [];
  const upcoming = [...byDay.entries()].filter(([k]) => k > todayKey).slice(0, 14);
  const past = [...byDay.entries()].filter(([k]) => k < todayKey).reverse().slice(0, 14);

  const crewDays = new Map<string, { name: string; role: string; days: number }>();
  for (const a of p.assignments) {
    if (a.status !== "DONE") continue;
    const c = crewDays.get(a.memberId) ?? { name: a.member.name, role: a.member.role, days: 0 };
    c.days++;
    crewDays.set(a.memberId, c);
  }
  const done = p.tasks.filter((t) => t.done).length;
  const maps = p.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}` : null;

  return (
    <div>
      <PageHeader
        title={p.customer.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={PROJECT_STAGE_TONE[p.stage]}>{PROJECT_STAGE_LABEL[p.stage]}</Badge>
            <span>{p.code} · {p.systemKw} kW</span>
            <Link href="/sites" className="text-brand">← All sites</Link>
          </span>
        }
        actions={
          <>
            <a href={`tel:${p.customer.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2"><Icon name="phone" className="h-4 w-4" /> Call customer</a>
            {maps && <a href={maps} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2">📍 Directions</a>}
            {canEdit && <LinkButton href={`/projects/${p.id}`}>Project & money →</LinkButton>}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <SectionTitle>Post a site update</SectionTitle>
            <ActionForm action={postSiteUpdate} submitLabel="Post update" pendingLabel="Posting…" resetOnSuccess>
              <input type="hidden" name="projectId" value={p.id} />
              <Textarea name="note" rows={2} placeholder="e.g. Structure done, panels arrive tomorrow. Customer wants cable run changed." required />
            </ActionForm>
            <ul className="mt-5 space-y-3 border-t border-line pt-4">
              {p.siteUpdates.map((u) => (
                <li key={u.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <div className="min-w-0"><div className="whitespace-pre-line">{u.note}</div><div className="text-xs text-muted">{u.createdByName ?? "—"} · {timeAgo(u.createdAt)}</div></div>
                </li>
              ))}
              {p.siteUpdates.length === 0 && <li className="text-sm text-muted">No updates yet — post the first one above.</li>}
            </ul>
          </Card>

          <Card>
            <SectionTitle action={<span className="text-xs text-muted">{done} of {p.tasks.length} done</span>}>Checklist</SectionTitle>
            <ProgressBar value={p.tasks.length ? (done / p.tasks.length) * 100 : 0} />
            <ul className="mt-3 divide-y divide-line">
              {p.tasks.map((t) => (
                <li key={t.id}>
                  <form action={toggleSiteTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="flex w-full items-center gap-3 py-2.5 text-left text-sm">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs ${t.done ? "border-brand bg-brand text-white" : "border-line"}`}>{t.done ? "✓" : ""}</span>
                      <span className={t.done ? "text-muted line-through" : ""}>{t.title}</span>
                      {t.doneAt && <span className="ml-auto text-xs text-muted">{formatDate(t.doneAt)}</span>}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionTitle>Crew history on this site</SectionTitle>
            {crewDays.size === 0 ? <p className="text-sm text-muted">No worked days recorded yet.</p> : (
              <ul className="space-y-1.5 text-sm">
                {[...crewDays.entries()].sort((a, b) => b[1].days - a[1].days).map(([mid, c]) => (
                  <li key={mid} className="flex justify-between">{canEdit ? <Link href={`/team/${mid}`} className="hover:text-brand">{c.name}</Link> : <span>{c.name}</span>}<span className="tabular-nums text-muted">{c.role} · {c.days} day{c.days > 1 ? "s" : ""}</span></li>
                ))}
              </ul>
            )}
            {past.length > 0 && (
              <details className="mt-3 border-t border-line pt-3">
                <summary className="cursor-pointer text-sm font-medium text-brand">Day-by-day (last {past.length} days)</summary>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {past.map(([k, rows]) => (
                    <li key={k} className="flex flex-wrap justify-between gap-2"><span className="font-medium">{dayLabel(k)}</span><span className="text-muted">{rows.map((r) => `${r.member.name.split(" ")[0]}${r.status === "ABSENT" ? " (absent)" : ""}`).join(", ")}</span></li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionTitle action={todayRows.some((r) => r.status === "PLANNED") ? (
              <form action={markDayPresent}><input type="hidden" name="projectId" value={p.id} /><input type="hidden" name="date" value={todayKey} /><button className="rounded-md bg-brand-soft px-2 py-1 text-xs font-medium text-brand-strong">✓ All present</button></form>
            ) : undefined}>Crew today</SectionTitle>
            {todayRows.length === 0 ? <p className="text-sm text-muted">Nobody scheduled today.</p> : (
              <ul className="space-y-2">
                {todayRows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2"><StatusDot status={r.status} /><span className="font-medium">{r.member.name}</span><span className="text-xs text-muted">{r.member.role}</span></span>
                    <span className="flex items-center gap-1">
                      <Badge tone={ASSIGNMENT_TONE[r.status]}>{ASSIGNMENT_LABEL[r.status]}</Badge>
                      {(["DONE", "ABSENT"] as const).filter((s) => s !== r.status).map((s) => (
                        <form key={s} action={setAssignmentStatus}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value={s} /><button className="rounded-md border border-line px-2 py-1 text-xs hover:bg-surface-2">{s === "DONE" ? "Present" : "Absent"}</button></form>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {todayRows[0]?.note && <p className="mt-3 rounded-lg bg-surface-2 p-2.5 text-xs">📝 {todayRows[0].note}</p>}
          </Card>

          <Card>
            <SectionTitle>Upcoming plan</SectionTitle>
            {upcoming.length === 0 ? <p className="text-sm text-muted">Nothing scheduled ahead.</p> : (
              <ul className="space-y-2 text-sm">
                {upcoming.map(([k, rows]) => (
                  <li key={k}>
                    <div className="flex justify-between gap-2"><span className="font-medium">{dayLabel(k)}</span><span className="text-right text-muted">{rows.map((r) => r.member.name.split(" ")[0]).join(", ")}</span></div>
                    {rows[0].note && <div className="text-xs text-muted">📝 {rows[0].note}</div>}
                    {canEdit && (
                      <div className="mt-0.5 flex gap-2">
                        {rows.map((r) => (
                          <form key={r.id} action={removeAssignment}><input type="hidden" name="id" value={r.id} /><button className="text-[0.68rem] text-muted hover:text-danger" title={`Remove ${r.member.name}`}>✕ {r.member.name.split(" ")[0]}</button></form>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {canEdit && (
            <Card>
              <SectionTitle>Status</SectionTitle>
              <form action={setProjectStage} className="flex gap-2">
                <input type="hidden" name="id" value={p.id} />
                <Select name="stage" defaultValue={p.stage}>{PROJECT_STAGES.map((s) => <option key={s} value={s}>{PROJECT_STAGE_LABEL[s]}</option>)}</Select>
                <Button type="submit" variant="secondary">Set</Button>
              </form>
            </Card>
          )}

          {canEdit && (
            <Card>
              <details>
                <summary className="cursor-pointer text-sm font-semibold">+ Assign crew to this site</summary>
                <div className="mt-3">
                  <AssignForm sites={[]} members={members} projectId={p.id} date={todayKey} />
                </div>
              </details>
            </Card>
          )}

          <Card>
            <SectionTitle>Site details</SectionTitle>
            <Dl items={[["Address", p.address], ["System", `${p.systemKw} kW`], ["Started", formatDate(p.startDate)], ["Target", formatDate(p.targetDate)]]} />
            {p.notes && <p className="mt-3 whitespace-pre-line rounded-lg bg-surface-2 p-3 text-sm">{p.notes}</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
