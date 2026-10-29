import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ActionForm from "@/components/ActionForm";
import Icon from "@/components/Icon";
import { SiteChip, StatusDot } from "@/components/CrewBits";
import { Badge, Card, EmptyState, Field, Input, LinkButton, PageHeader, SectionTitle } from "@/components/ui";
import { endOfDay, formatINR, startOfDay, startOfMonth, whatsAppLink } from "@/lib/format";
import { MEMBER_ROLES } from "@/lib/team";
import { createMember } from "./actions";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const now = new Date();
  const [members, today, monthRows] = await Promise.all([
    prisma.teamMember.findMany({ where: show === "inactive" ? { active: false } : { active: true }, orderBy: { name: "asc" } }),
    prisma.assignment.findMany({
      where: { date: { gte: startOfDay(now), lte: endOfDay(now) } },
      include: { project: { select: { id: true, code: true, customer: { select: { name: true } } } } },
    }),
    prisma.assignment.groupBy({ by: ["memberId"], where: { status: "DONE", date: { gte: startOfMonth(now) } }, _count: true }),
  ]);
  const todayBy = new Map<string, typeof today>();
  for (const a of today) todayBy.set(a.memberId, [...(todayBy.get(a.memberId) ?? []), a]);
  const monthDays = new Map(monthRows.map((r) => [r.memberId, r._count]));
  const onSite = members.filter((m) => (todayBy.get(m.id) ?? []).some((a) => a.status !== "ABSENT")).length;

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle={`${members.length} ${show === "inactive" ? "inactive" : "active"} · ${onSite} on site today`}
        actions={
          <>
            <LinkButton href="/team/history">Who worked where</LinkButton>
            <LinkButton href="/schedule/assign" variant="primary">+ Assign to site</LinkButton>
          </>
        }
      />
      <div className="mb-4 flex gap-1.5">
        {[["", "Active"], ["inactive", "Inactive"]].map(([k, l]) => (
          <Link key={k} href={k ? `/team?show=${k}` : "/team"} className={`rounded-full px-3 py-1 text-xs font-medium ${(show ?? "") === k ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-ink"}`}>{l}</Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:col-span-2">
          {members.length === 0 && <Card className="sm:col-span-2"><EmptyState>No team members here yet — add your first on the right.</EmptyState></Card>}
          {members.map((m) => {
            const rows = todayBy.get(m.id) ?? [];
            const live = rows.filter((a) => a.status !== "ABSENT");
            const absent = rows.some((a) => a.status === "ABSENT");
            return (
              <Card key={m.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/team/${m.id}`} className="min-w-0">
                    <div className="truncate text-base font-semibold hover:text-brand">{m.name}</div>
                    <div className="text-xs text-muted">{m.role}{m.dailyRate > 0 ? ` · ${formatINR(m.dailyRate)}/day` : ""}</div>
                  </Link>
                  <div className="flex shrink-0 gap-1.5">
                    {m.phone && (
                      <>
                        <a href={`tel:${m.phone}`} className="rounded-lg border border-line p-2 text-muted hover:bg-surface-2 hover:text-ink" title="Call"><Icon name="phone" className="h-4 w-4" /></a>
                        <a href={whatsAppLink(m.phone, `Hi ${m.name.split(" ")[0]}, `)} target="_blank" rel="noreferrer" className="rounded-lg border border-line p-2 text-muted hover:bg-surface-2 hover:text-ink" title="WhatsApp"><Icon name="whatsapp" className="h-4 w-4" /></a>
                      </>
                    )}
                  </div>
                </div>
                <div className="min-h-6 text-sm">
                  {live.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="green">On site today</Badge>
                      {live.map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1"><StatusDot status={a.status} /><SiteChip code={a.project.code} href={`/sites/${a.project.id}`}>{a.project.code} · {a.project.customer.name}</SiteChip></span>
                      ))}
                    </div>
                  ) : absent ? (
                    <Badge tone="red">Absent today</Badge>
                  ) : (
                    <Badge tone="zinc">Free today</Badge>
                  )}
                </div>
                <div className="text-xs text-muted">{monthDays.get(m.id) ?? 0} day(s) worked this month</div>
              </Card>
            );
          })}
        </div>

        <Card>
          <SectionTitle>Add team member</SectionTitle>
          <ActionForm action={createMember} submitLabel="Add member" pendingLabel="Saving…">
            <div className="space-y-3">
              <Field label="Name *"><Input name="name" required /></Field>
              <Field label="Phone"><Input name="phone" type="tel" inputMode="tel" /></Field>
              <Field label="Role">
                <Input name="role" list="member-roles" defaultValue="Installer" />
                <datalist id="member-roles">{MEMBER_ROLES.map((r) => <option key={r} value={r} />)}</datalist>
              </Field>
              <Field label="Daily wage (₹)" hint="for crew-cost estimate"><Input name="dailyRate" type="number" min="0" step="any" /></Field>
            </div>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
