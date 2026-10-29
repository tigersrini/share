import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import AssignForm from "@/components/CrewBits";
import { Card, PageHeader } from "@/components/ui";
import { toDateInput } from "@/lib/format";

export const metadata: Metadata = { title: "Assign crew" };
export const dynamic = "force-dynamic";

export default async function AssignPage({ searchParams }: { searchParams: Promise<{ date?: string; projectId?: string; memberId?: string }> }) {
  const session = await getSession();
  if (session?.role === "FIELD") redirect("/schedule");
  const sp = await searchParams;
  const [members, projects] = await Promise.all([
    prisma.teamMember.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
    prisma.project.findMany({ where: { stage: { notIn: ["CANCELLED", "COMPLETED"] } }, orderBy: { createdAt: "desc" }, select: { id: true, code: true, name: true, customer: { select: { name: true } } } }),
  ]);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Assign crew to a site" subtitle={<Link href="/schedule" className="text-brand">← Schedule</Link>} />
      <Card>
        <AssignForm
          key={`${sp.projectId}-${sp.memberId}-${sp.date}`}
          sites={projects.map((p) => ({ id: p.id, code: p.code, label: p.customer.name }))}
          members={members}
          defaultProjectId={sp.projectId}
          defaultMemberIds={sp.memberId ? [sp.memberId] : []}
          date={sp.date ?? toDateInput(new Date())}
        />
      </Card>
    </div>
  );
}
