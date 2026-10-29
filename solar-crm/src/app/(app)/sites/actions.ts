"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { fail, str, type ActionState } from "@/lib/form";

/** Field log entry. Allowed for every role, so crews can post from site. */
export async function postSiteUpdate(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSession();
  const projectId = str(fd, "projectId");
  const note = str(fd, "note");
  if (!note) return fail("Write what's happening on site.");
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return fail("Site not found.");
  const member = await prisma.teamMember.findUnique({ where: { userId: session.userId }, select: { id: true } });
  await prisma.siteUpdate.create({ data: { projectId, note, memberId: member?.id ?? null, createdByName: session.name } });
  revalidatePath(`/sites/${projectId}`);
  revalidatePath("/sites");
  revalidatePath("/my");
  revalidatePath(`/projects/${projectId}`);
  return { ok: "Posted." };
}

export async function toggleSiteTask(fd: FormData): Promise<void> {
  await requireSession();
  const t = await prisma.projectTask.findUnique({ where: { id: str(fd, "id") } });
  if (!t) return;
  await prisma.projectTask.update({ where: { id: t.id }, data: { done: !t.done, doneAt: t.done ? null : new Date() } });
  revalidatePath(`/sites/${t.projectId}`);
  revalidatePath(`/projects/${t.projectId}`);
  revalidatePath("/sites");
}
