"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, requireStaff } from "@/lib/auth";
import { bool, fail, oneOf, optStr, str, type ActionState } from "@/lib/form";
import { endOfDay, fromDateInput, startOfDay, todayInput } from "@/lib/format";
import { expandDays } from "@/lib/team";

const STATUSES = ["PLANNED", "DONE", "ABSENT"] as const;

function refresh(projectId?: string, memberId?: string) {
  revalidatePath("/schedule");
  revalidatePath("/sites");
  revalidatePath("/team");
  revalidatePath("/my");
  revalidatePath("/");
  if (projectId) {
    revalidatePath(`/sites/${projectId}`);
    revalidatePath(`/projects/${projectId}`);
  }
  if (memberId) revalidatePath(`/team/${memberId}`);
}

/** Put one or more members on a site for a date range. Skips days where someone is already on another site. */
export async function assignCrew(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireStaff();
  const projectId = str(fd, "projectId");
  const memberIds = fd.getAll("memberId").filter((v): v is string => typeof v === "string" && v !== "");
  const from = str(fd, "from");
  const to = str(fd, "to") || from;
  if (!projectId) return fail("Choose the site.");
  if (memberIds.length === 0) return fail("Tick at least one team member.");
  const days = expandDays(from, to, bool(fd, "skipSundays"));
  if (days.length === 0) return fail("Pick a valid date range (up to ~2 months).");

  const [project, members] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.teamMember.findMany({ where: { id: { in: memberIds } } }),
  ]);
  if (!project || project.stage === "CANCELLED") return fail("Site not found or cancelled.");

  const first = fromDateInput(days[0])!;
  const last = fromDateInput(days[days.length - 1])!;
  const existing = await prisma.assignment.findMany({
    where: { memberId: { in: memberIds }, date: { gte: startOfDay(first), lte: endOfDay(last) } },
    include: { project: { select: { code: true } }, member: { select: { name: true } } },
  });
  const key = (m: string, d: string) => `${m}|${d}`;
  const taken = new Map<string, { code: string; name: string; same: boolean }>();
  for (const a of existing) {
    const d = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Kolkata" }).format(a.date);
    taken.set(key(a.memberId, d), { code: a.project.code, name: a.member.name, same: a.projectId === projectId });
  }

  const today = todayInput();
  const note = optStr(fd, "note");
  const rows: { projectId: string; memberId: string; date: Date; status: "PLANNED" | "DONE"; note: string | null; createdByName: string }[] = [];
  const conflicts: string[] = [];
  for (const m of members) {
    for (const d of days) {
      const t = taken.get(key(m.id, d));
      if (t?.same) continue;
      if (t) {
        conflicts.push(`${m.name} on ${d} (already at ${t.code})`);
        continue;
      }
      // Entering a past day records who actually worked; future days are plans.
      rows.push({ projectId, memberId: m.id, date: fromDateInput(d)!, status: d < today ? "DONE" : "PLANNED", note, createdByName: session.name });
    }
  }
  if (rows.length > 0) await prisma.assignment.createMany({ data: rows, skipDuplicates: true });
  refresh(projectId);

  const skipped = conflicts.length ? ` Skipped ${conflicts.length} double-booking${conflicts.length > 1 ? "s" : ""}: ${conflicts.slice(0, 4).join("; ")}${conflicts.length > 4 ? "…" : ""}.` : "";
  if (rows.length === 0) return fail(conflicts.length ? `Nothing added.${skipped}` : "Everyone selected is already on this site for those days.");
  return { ok: `Added ${rows.length} member-day${rows.length > 1 ? "s" : ""}.${skipped}` };
}

/** Attendance for one row. Crew leads can do this from their phones too. */
export async function setAssignmentStatus(fd: FormData): Promise<void> {
  await requireSession();
  const a = await prisma.assignment.findUnique({ where: { id: str(fd, "id") } });
  if (!a) return;
  await prisma.assignment.update({ where: { id: a.id }, data: { status: oneOf(str(fd, "status"), STATUSES, "PLANNED") } });
  refresh(a.projectId, a.memberId);
}

/** "Everyone planned for this site today turned up." */
export async function markDayPresent(fd: FormData): Promise<void> {
  await requireSession();
  const projectId = str(fd, "projectId");
  const day = fromDateInput(str(fd, "date"));
  if (!day) return;
  await prisma.assignment.updateMany({ where: { projectId, date: { gte: startOfDay(day), lte: endOfDay(day) }, status: "PLANNED" }, data: { status: "DONE" } });
  refresh(projectId);
}

export async function removeAssignment(fd: FormData): Promise<void> {
  await requireStaff();
  const a = await prisma.assignment.findUnique({ where: { id: str(fd, "id") } });
  if (!a) return;
  await prisma.assignment.delete({ where: { id: a.id } });
  refresh(a.projectId, a.memberId);
}
