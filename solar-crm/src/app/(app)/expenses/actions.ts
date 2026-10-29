"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { fail, num, oneOf, optStr, str, type ActionState } from "@/lib/form";
import { fromDateInput } from "@/lib/format";
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from "@/lib/labels";

export async function createExpense(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const amount = num(fd, "amount");
  if (!(amount > 0)) return fail("Enter the amount.");
  const projectId = optStr(fd, "projectId");
  await prisma.expense.create({
    data: {
      amount,
      date: fromDateInput(str(fd, "date")) ?? new Date(),
      category: oneOf(str(fd, "category"), EXPENSE_CATEGORIES, "OTHER"),
      vendor: optStr(fd, "vendor"),
      note: optStr(fd, "note"),
      mode: oneOf(str(fd, "mode"), PAYMENT_MODES, "BANK_TRANSFER"),
      projectId,
    },
  });
  revalidatePath("/expenses");
  revalidatePath("/finance");
  revalidatePath("/");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  return { ok: "Expense recorded." };
}

export async function deleteExpense(fd: FormData): Promise<void> {
  await requireAdmin();
  const e = await prisma.expense.findUnique({ where: { id: str(fd, "id") } });
  if (!e) return;
  await prisma.expense.delete({ where: { id: e.id } });
  revalidatePath("/expenses");
  revalidatePath("/finance");
  revalidatePath("/");
  if (e.projectId) revalidatePath(`/projects/${e.projectId}`);
}
