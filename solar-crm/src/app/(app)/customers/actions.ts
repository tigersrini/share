"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { fail, oneOf, optNum, optStr, str, type ActionState } from "@/lib/form";
import { fromDateInput, normalizePhone } from "@/lib/format";
import { ACTIVITY_TYPES, CUSTOMER_TYPES, STAGES, STAGE_LABEL } from "@/lib/labels";

function readCustomer(fd: FormData) {
  return {
    name: str(fd, "name"),
    phone: normalizePhone(str(fd, "phone")),
    altPhone: optStr(fd, "altPhone"),
    email: optStr(fd, "email"),
    address: optStr(fd, "address"),
    city: optStr(fd, "city"),
    pincode: optStr(fd, "pincode"),
    gstin: optStr(fd, "gstin")?.toUpperCase() ?? null,
    type: oneOf(str(fd, "type"), CUSTOMER_TYPES, "RESIDENTIAL"),
    source: optStr(fd, "source"),
    monthlyBill: optNum(fd, "monthlyBill"),
    monthlyUnits: optNum(fd, "monthlyUnits"),
    roofAreaSqft: optNum(fd, "roofAreaSqft"),
    expectedKw: optNum(fd, "expectedKw"),
    nextFollowUpAt: fromDateInput(str(fd, "nextFollowUpAt")),
    notes: optStr(fd, "notes"),
  };
}

function validate(c: ReturnType<typeof readCustomer>): string | null {
  if (!c.name) return "Name is required.";
  if (c.phone.replace(/\D/g, "").length < 8) return "Enter a valid phone number.";
  return null;
}

export async function createCustomer(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSession();
  const data = readCustomer(fd);
  const err = validate(data);
  if (err) return fail(err);

  let id: string;
  try {
    const c = await prisma.customer.create({
      data: {
        ...data,
        ownerId: session.userId,
        activities: { create: { type: "NOTE", text: "Lead created", createdByName: session.name } },
      },
    });
    id = c.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const dup = await prisma.customer.findUnique({ where: { phone: data.phone } });
      return fail(`A customer with this phone number already exists${dup ? `: ${dup.name}` : ""}.`);
    }
    throw e;
  }
  revalidatePath("/customers");
  redirect(`/customers/${id}`);
}

export async function updateCustomer(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const id = str(fd, "id");
  const data = readCustomer(fd);
  const err = validate(data);
  if (err) return fail(err);
  try {
    await prisma.customer.update({ where: { id }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("Another customer already uses this phone number.");
    }
    throw e;
  }
  revalidatePath(`/customers/${id}`);
  revalidatePath("/customers");
  return { ok: "Saved." };
}

async function changeStage(id: string, stage: (typeof STAGES)[number], lostReason: string | null, userName: string): Promise<string | null> {
  const current = await prisma.customer.findUnique({ where: { id } });
  if (!current) return "Customer not found.";
  if (current.stage === stage && stage !== "LOST") return null;

  await prisma.$transaction([
    prisma.customer.update({
      where: { id },
      data: {
        stage,
        lostReason: stage === "LOST" ? lostReason : null,
        // once won or lost there is nothing left to follow up
        ...(stage === "WON" || stage === "LOST" ? { nextFollowUpAt: null } : {}),
      },
    }),
    prisma.activity.create({
      data: {
        customerId: id,
        type: "STAGE",
        text: `Moved to ${STAGE_LABEL[stage]}${stage === "LOST" && lostReason ? ` — ${lostReason}` : ""}`,
        createdByName: userName,
      },
    }),
  ]);
  revalidatePath(`/customers/${id}`);
  revalidatePath("/customers");
  revalidatePath("/pipeline");
  revalidatePath("/");
  return null;
}

export async function setStage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSession();
  const stage = oneOf(str(fd, "stage"), STAGES, "NEW");
  const err = await changeStage(str(fd, "id"), stage, optStr(fd, "lostReason"), session.name);
  return err ? fail(err) : { ok: `Moved to ${STAGE_LABEL[stage]}.` };
}

/** Pipeline-board arrows: plain <form action>, so it returns nothing. */
export async function moveStage(fd: FormData): Promise<void> {
  const session = await requireSession();
  const stage = oneOf(str(fd, "stage"), STAGES, "NEW");
  const err = await changeStage(str(fd, "id"), stage, null, session.name);
  if (err) throw new Error(err);
}

export async function addActivity(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = str(fd, "id");
  const text = str(fd, "text");
  if (!text) return fail("Write a short note first.");
  const type = oneOf(str(fd, "type"), ACTIVITY_TYPES, "NOTE");
  const followUp = fromDateInput(str(fd, "followUp"));

  await prisma.$transaction([
    prisma.activity.create({ data: { customerId: id, type, text, createdByName: session.name } }),
    prisma.customer.update({ where: { id }, data: { nextFollowUpAt: followUp } }),
  ]);
  revalidatePath(`/customers/${id}`);
  revalidatePath("/");
  return { ok: "Logged." };
}

/** One-tap "snooze" / reschedule from the dashboard follow-up list. */
export async function rescheduleFollowUp(fd: FormData): Promise<void> {
  await requireSession();
  const id = str(fd, "id");
  const when = fromDateInput(str(fd, "date"));
  await prisma.customer.update({ where: { id }, data: { nextFollowUpAt: when } });
  revalidatePath("/");
  revalidatePath("/customers");
}

export async function deleteCustomer(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const [quotes, projects, invoices, payments] = await Promise.all([
    prisma.quote.count({ where: { customerId: id } }),
    prisma.project.count({ where: { customerId: id } }),
    prisma.invoice.count({ where: { customerId: id } }),
    prisma.payment.count({ where: { customerId: id } }),
  ]);
  if (quotes + projects + invoices + payments > 0) {
    throw new Error("This customer has quotes, projects, invoices or payments and cannot be deleted.");
  }
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
  redirect("/customers");
}
