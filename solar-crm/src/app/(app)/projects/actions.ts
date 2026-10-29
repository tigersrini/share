"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { bool, fail, num, oneOf, optStr, str, type ActionState } from "@/lib/form";
import { fromDateInput } from "@/lib/format";
import { recordMovement } from "@/lib/stock";
import { EXPENSE_CATEGORIES, PAYMENT_MODES, PROJECT_STAGES, SUBSIDY_STATUSES } from "@/lib/labels";

function refresh(projectId?: string | null) {
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/finance");
  revalidatePath("/");
}

export async function setProjectStage(fd: FormData): Promise<void> {
  const session = await requireSession();
  const id = str(fd, "id");
  const stage = oneOf(str(fd, "stage"), PROJECT_STAGES, "ORDER_CONFIRMED");
  const p = await prisma.project.findUnique({ where: { id } });
  if (!p || p.stage === stage) return;
  await prisma.project.update({
    where: { id },
    data: { stage, completedAt: stage === "COMPLETED" ? new Date() : null },
  });
  await prisma.activity.create({ data: { customerId: p.customerId, type: "STAGE", text: `Project ${p.code} moved to ${stage.replaceAll("_", " ").toLowerCase()}`, createdByName: session.name } });
  refresh(id);
}

export async function updateProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) return fail("Project name is required.");
  const contractValue = num(fd, "contractValue");
  if (contractValue < 0) return fail("Contract value cannot be negative.");
  await prisma.project.update({
    where: { id },
    data: {
      name,
      systemKw: num(fd, "systemKw"),
      contractValue,
      address: optStr(fd, "address"),
      startDate: fromDateInput(str(fd, "startDate")),
      targetDate: fromDateInput(str(fd, "targetDate")),
      notes: optStr(fd, "notes"),
    },
  });
  refresh(id);
  return { ok: "Saved." };
}

export async function updateSubsidy(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const id = str(fd, "id");
  await prisma.project.update({
    where: { id },
    data: {
      subsidyStatus: oneOf(str(fd, "subsidyStatus"), SUBSIDY_STATUSES, "NOT_APPLICABLE"),
      subsidyAmount: num(fd, "subsidyAmount"),
      subsidyRef: optStr(fd, "subsidyRef"),
    },
  });
  refresh(id);
  return { ok: "Subsidy updated." };
}

export async function toggleTask(fd: FormData): Promise<void> {
  await requireSession();
  const id = str(fd, "id");
  const t = await prisma.projectTask.findUnique({ where: { id } });
  if (!t) return;
  await prisma.projectTask.update({ where: { id }, data: { done: !t.done, doneAt: t.done ? null : new Date() } });
  refresh(t.projectId);
}

export async function addTask(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const projectId = str(fd, "projectId");
  const title = str(fd, "title");
  if (!title) return fail("Enter a task.");
  const last = await prisma.projectTask.findFirst({ where: { projectId }, orderBy: { sort: "desc" } });
  await prisma.projectTask.create({ data: { projectId, title, sort: (last?.sort ?? 0) + 1 } });
  refresh(projectId);
  return { ok: "Added." };
}

export async function deleteTask(fd: FormData): Promise<void> {
  await requireSession();
  const t = await prisma.projectTask.findUnique({ where: { id: str(fd, "id") } });
  if (!t) return;
  await prisma.projectTask.delete({ where: { id: t.id } });
  refresh(t.projectId);
}

/** Record money received — from a project page or an invoice page. */
export async function addPayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSession();
  const amount = num(fd, "amount");
  if (!(amount > 0)) return fail("Enter the amount received.");
  const projectId = optStr(fd, "projectId");
  const invoiceId = optStr(fd, "invoiceId");

  let customerId = optStr(fd, "customerId");
  let project = projectId ? await prisma.project.findUnique({ where: { id: projectId } }) : null;
  const invoice = invoiceId ? await prisma.invoice.findUnique({ where: { id: invoiceId } }) : null;
  if (invoice) {
    if (invoice.status === "CANCELLED") return fail("This invoice is cancelled.");
    customerId = invoice.customerId;
    if (!project && invoice.projectId) project = await prisma.project.findUnique({ where: { id: invoice.projectId } });
  }
  if (project) customerId = project.customerId;
  if (!customerId) return fail("Customer not found.");

  await prisma.payment.create({
    data: {
      date: fromDateInput(str(fd, "date")) ?? new Date(),
      amount,
      mode: oneOf(str(fd, "mode"), PAYMENT_MODES, "BANK_TRANSFER"),
      reference: optStr(fd, "reference"),
      note: optStr(fd, "note"),
      customerId,
      projectId: project?.id ?? null,
      invoiceId: invoice?.id ?? null,
    },
  });
  if (project && project.stage === "ORDER_CONFIRMED") {
    await prisma.project.update({ where: { id: project.id }, data: { stage: "ADVANCE_RECEIVED" } });
  }
  await prisma.activity.create({ data: { customerId, type: "NOTE", text: `Payment of ₹${amount.toLocaleString("en-IN")} received${project ? ` for ${project.code}` : ""}`, createdByName: session.name } });
  refresh(project?.id);
  if (invoice) revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/invoices");
  return { ok: "Payment recorded." };
}

export async function deletePayment(fd: FormData): Promise<void> {
  await requireAdmin();
  const p = await prisma.payment.findUnique({ where: { id: str(fd, "id") } });
  if (!p) return;
  await prisma.payment.delete({ where: { id: p.id } });
  refresh(p.projectId);
  if (p.invoiceId) revalidatePath(`/invoices/${p.invoiceId}`);
  revalidatePath("/invoices");
}

/** Issue stock to a project (reduces inventory, becomes project material cost). */
export async function issueMaterial(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSession();
  const projectId = str(fd, "projectId");
  const itemId = str(fd, "itemId");
  const qty = num(fd, "qty");
  if (!itemId) return fail("Choose an item.");
  if (!(qty > 0)) return fail("Enter a quantity.");
  const returning = bool(fd, "isReturn");
  try {
    await prisma.$transaction((tx) =>
      recordMovement(tx, { itemId, type: returning ? "RETURN" : "ISSUE", qty, projectId, note: optStr(fd, "note"), createdByName: session.name }),
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not update stock.");
  }
  refresh(projectId);
  revalidatePath("/inventory");
  return { ok: returning ? "Returned to stock." : "Issued." };
}

export async function addProjectExpense(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const projectId = str(fd, "projectId");
  const amount = num(fd, "amount");
  if (!(amount > 0)) return fail("Enter the amount.");
  await prisma.expense.create({
    data: {
      projectId,
      amount,
      date: fromDateInput(str(fd, "date")) ?? new Date(),
      category: oneOf(str(fd, "category"), EXPENSE_CATEGORIES, "OTHER"),
      vendor: optStr(fd, "vendor"),
      note: optStr(fd, "note"),
    },
  });
  refresh(projectId);
  revalidatePath("/expenses");
  return { ok: "Expense added." };
}

export async function deleteProject(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const p = await prisma.project.findUnique({ where: { id }, include: { _count: { select: { payments: true, invoices: true, movements: true, expenses: true } } } });
  if (!p) return;
  const c = p._count;
  if (c.payments + c.invoices + c.movements + c.expenses > 0) throw new Error("This project has payments, invoices, stock or expenses — cancel it instead of deleting.");
  await prisma.project.delete({ where: { id } });
  refresh();
  redirect("/projects");
}
