"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, asJson } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { fail, oneOf, str, type ActionState } from "@/lib/form";
import { fromDateInput } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { nextProjectCode, nextQuoteNumber } from "@/lib/numbering";
import { parseQty, quoteFormSchema } from "@/lib/quote";
import { DEFAULT_PROJECT_TASKS, QUOTE_STATUSES } from "@/lib/labels";

export async function saveQuote(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireStaff();
  let raw: unknown;
  try {
    raw = JSON.parse(str(fd, "payload"));
  } catch {
    return fail("Could not read the form — please try again.");
  }
  const parsed = quoteFormSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  const f = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: f.customerId } });
  if (!customer) return fail("Customer not found.");
  const date = fromDateInput(f.date) ?? new Date();
  if (f.subsidyCentral + f.subsidyState > f.totalAmount) return fail("Subsidy cannot exceed the total amount.");

  const common = {
    customerId: f.customerId,
    date,
    validityDays: f.validityDays,
    title: f.title,
    systemKw: f.systemKw,
    systemType: f.systemType,
    scopeText: f.scopeText,
    totalAmount: f.totalAmount,
    subsidyCentral: f.subsidyCentral,
    subsidyState: f.subsidyState,
    makes: asJson(f.makes.filter((m) => m.item || m.makes)),
    paymentTerms: asJson(f.paymentTerms),
    subsidyDocs: asJson(f.subsidyDocs.filter(Boolean)),
    warranty: f.warranty,
    performanceRatio: f.performanceRatio,
    timeline: f.timeline,
    otherTerms: f.otherTerms,
    notes: f.notes || null,
    includeSavings: f.includeSavings && !!f.calc,
    calc: f.calc ? asJson(f.calc) : undefined,
  };
  const lines = f.lines.map((l, i) => ({
    sort: i,
    description: l.description,
    uom: l.uom || "Nos",
    qty: l.qty,
    qtyNum: parseQty(l.qty),
    itemId: l.itemId || null,
    unitCost: l.unitCost,
  }));

  let id: string;
  if (f.id) {
    const existing = await prisma.quote.findUnique({ where: { id: f.id } });
    if (!existing) return fail("Quotation not found.");
    await prisma.$transaction([
      prisma.quoteLine.deleteMany({ where: { quoteId: f.id } }),
      prisma.quote.update({ where: { id: f.id }, data: { ...common, calc: f.calc ? asJson(f.calc) : undefined, lines: { create: lines } } }),
    ]);
    id = f.id;
  } else {
    const settings = await getSettings();
    const q = await prisma.$transaction(async (tx) => {
      const number = await nextQuoteNumber(tx, settings.numbering.quotePrefix, date);
      return tx.quote.create({ data: { ...common, number, createdByName: session.name, lines: { create: lines } } });
    });
    id = q.id;
    await prisma.activity.create({ data: { customerId: f.customerId, type: "NOTE", text: `Quotation ${q.number} created (${f.systemKw} kW)`, createdByName: session.name } });
  }
  revalidatePath("/quotes");
  revalidatePath(`/customers/${f.customerId}`);
  redirect(`/quotes/${id}`);
}

export async function setQuoteStatus(fd: FormData): Promise<void> {
  const session = await requireStaff();
  const id = str(fd, "id");
  const status = oneOf(str(fd, "status"), QUOTE_STATUSES, "DRAFT");
  const q = await prisma.quote.findUnique({ where: { id }, include: { customer: true } });
  if (!q) throw new Error("Quotation not found.");

  await prisma.quote.update({
    where: { id },
    data: {
      status,
      sentAt: status === "SENT" && !q.sentAt ? new Date() : q.sentAt,
      decidedAt: status === "ACCEPTED" || status === "REJECTED" ? new Date() : null,
    },
  });
  const stage = q.customer.stage;
  const patch: { stage?: "QUOTED" | "WON" } = {};
  if (status === "SENT" && ["NEW", "CONTACTED", "SITE_VISIT"].includes(stage)) patch.stage = "QUOTED";
  if (status === "ACCEPTED" && stage !== "WON") patch.stage = "WON";
  if (patch.stage) await prisma.customer.update({ where: { id: q.customerId }, data: { stage: patch.stage, ...(patch.stage === "WON" ? { nextFollowUpAt: null } : {}) } });
  await prisma.activity.create({ data: { customerId: q.customerId, type: "STAGE", text: `Quotation ${q.number} marked ${status.toLowerCase()}`, createdByName: session.name } });
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  revalidatePath(`/customers/${q.customerId}`);
  revalidatePath("/pipeline");
  revalidatePath("/");
}

/** New revision: copies everything into a fresh draft with the next number. */
export async function duplicateQuote(fd: FormData): Promise<void> {
  const session = await requireStaff();
  const src = await prisma.quote.findUnique({ where: { id: str(fd, "id") }, include: { lines: { orderBy: { sort: "asc" } } } });
  if (!src) throw new Error("Quotation not found.");
  const settings = await getSettings();
  const copy = await prisma.$transaction(async (tx) => {
    const number = await nextQuoteNumber(tx, settings.numbering.quotePrefix);
    return tx.quote.create({
      data: {
        number,
        customerId: src.customerId,
        status: "DRAFT",
        date: new Date(),
        validityDays: src.validityDays,
        title: src.title,
        systemKw: src.systemKw,
        systemType: src.systemType,
        scopeText: src.scopeText,
        totalAmount: src.totalAmount,
        subsidyCentral: src.subsidyCentral,
        subsidyState: src.subsidyState,
        makes: asJson(src.makes),
        paymentTerms: asJson(src.paymentTerms),
        subsidyDocs: asJson(src.subsidyDocs),
        warranty: src.warranty,
        performanceRatio: src.performanceRatio,
        timeline: src.timeline,
        otherTerms: src.otherTerms,
        calc: src.calc ? asJson(src.calc) : undefined,
        includeSavings: src.includeSavings,
        notes: src.notes,
        createdByName: session.name,
        lines: { create: src.lines.map((l) => ({ sort: l.sort, description: l.description, uom: l.uom, qty: l.qty, qtyNum: l.qtyNum, itemId: l.itemId, unitCost: l.unitCost })) },
      },
    });
  });
  revalidatePath("/quotes");
  redirect(`/quotes/${copy.id}/edit`);
}

/** Accepted quote → a delivery project with the standard checklist. */
export async function convertToProject(fd: FormData): Promise<void> {
  const session = await requireStaff();
  const id = str(fd, "id");
  const q = await prisma.quote.findUnique({ where: { id }, include: { customer: true, projects: true } });
  if (!q) throw new Error("Quotation not found.");
  if (q.projects.length > 0) redirect(`/projects/${q.projects[0].id}`);

  const subsidy = q.subsidyCentral + q.subsidyState;
  const project = await prisma.$transaction(async (tx) => {
    const code = await nextProjectCode(tx);
    const p = await tx.project.create({
      data: {
        code,
        customerId: q.customerId,
        quoteId: q.id,
        name: `${q.systemKw} kW ${q.systemType} – ${q.customer.name}`,
        systemKw: q.systemKw,
        contractValue: Math.max(0, q.totalAmount - subsidy),
        subsidyAmount: subsidy,
        subsidyStatus: subsidy > 0 ? "TO_APPLY" : "NOT_APPLICABLE",
        address: [q.customer.address, q.customer.city].filter(Boolean).join(", ") || null,
        startDate: new Date(),
        tasks: { create: DEFAULT_PROJECT_TASKS.map((title, sort) => ({ title, sort })) },
      },
    });
    await tx.quote.update({ where: { id }, data: { status: "ACCEPTED", decidedAt: q.decidedAt ?? new Date() } });
    await tx.customer.update({ where: { id: q.customerId }, data: { stage: "WON", nextFollowUpAt: null } });
    await tx.activity.create({ data: { customerId: q.customerId, type: "STAGE", text: `Project ${code} started from quotation ${q.number}`, createdByName: session.name } });
    return p;
  });
  revalidatePath("/projects");
  revalidatePath("/quotes");
  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function deleteQuote(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const q = await prisma.quote.findUnique({ where: { id }, include: { _count: { select: { projects: true, invoices: true } } } });
  if (!q) return;
  if (q._count.projects + q._count.invoices > 0) throw new Error("This quotation has a project or invoice and cannot be deleted.");
  await prisma.quote.delete({ where: { id } });
  revalidatePath("/quotes");
  redirect("/quotes");
}
