"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { bool, fail, num, optStr, str, type ActionState } from "@/lib/form";
import { fromDateInput, normalizePhone } from "@/lib/format";

function readMember(fd: FormData) {
  const phone = optStr(fd, "phone");
  return {
    name: str(fd, "name"),
    phone: phone ? normalizePhone(phone) : null,
    role: str(fd, "role") || "Installer",
    dailyRate: Math.max(0, num(fd, "dailyRate")),
    joinedOn: fromDateInput(str(fd, "joinedOn")),
    notes: optStr(fd, "notes"),
  };
}

export async function createMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff();
  const data = readMember(fd);
  if (!data.name) return fail("Enter the member's name.");
  const m = await prisma.teamMember.create({ data });
  revalidatePath("/team");
  redirect(`/team/${m.id}`);
}

export async function updateMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff();
  const id = str(fd, "id");
  const data = readMember(fd);
  if (!data.name) return fail("Name is required.");
  const userId = optStr(fd, "userId");
  if (userId) {
    const taken = await prisma.teamMember.findFirst({ where: { userId, NOT: { id } } });
    if (taken) return fail(`That login is already linked to ${taken.name}.`);
  }
  await prisma.teamMember.update({ where: { id }, data: { ...data, active: bool(fd, "active"), userId } });
  revalidatePath("/team");
  revalidatePath(`/team/${id}`);
  revalidatePath("/schedule");
  return { ok: "Saved." };
}

export async function deleteMember(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const used = await prisma.assignment.count({ where: { memberId: id } });
  if (used > 0) throw new Error("This member has site history. Mark them inactive instead of deleting.");
  await prisma.teamMember.delete({ where: { id } });
  revalidatePath("/team");
  redirect("/team");
}
