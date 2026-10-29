"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { fail, str, type ActionState } from "@/lib/form";
import { fromDateInput } from "@/lib/format";
import { computeInvoice } from "@/lib/gst";
import { invoiceFormSchema, toLineInputs } from "@/lib/invoice";
import { nextInvoiceNumber } from "@/lib/numbering";
import { getSettings } from "@/lib/settings";

export async function saveInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSession();
  let raw: unknown;
  try {
    raw = JSON.parse(str(fd, "payload"));
  } catch {
    return fail("Could not read the form — please try again.");
  }
  const parsed = invoiceFormSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  const f = parsed.data;

  const [customer, settings] = await Promise.all([prisma.customer.findUnique({ where: { id: f.customerId } }), getSettings()]);
  if (!customer) return fail("Customer not found.");
  const date = fromDateInput(f.date) ?? new Date();
  const intra = f.placeOfSupply === settings.company.stateCode;
  const t = computeInvoice(toLineInputs(f.lines), intra);
  if (t.total <= 0) return fail("The invoice total must be more than zero.");

  const data = {
    date,
    customerId: f.customerId,
    projectId: f.projectId || null,
    quoteId: f.quoteId || null,
    placeOfSupply: f.placeOfSupply,
    billName: f.billName,
    billAddress: f.billAddress,
    billGstin: f.billGstin || null,
    shipName: f.shipSame ? null : f.shipName || null,
    shipAddress: f.shipSame ? null : f.shipAddress || null,
    shipGstin: f.shipSame ? null : f.shipGstin || null,
    buyerOrderNo: f.buyerOrderNo || null,
    buyerOrderDate: f.buyerOrderDate || null,
    paymentTerms: f.paymentTerms || null,
    terms: f.terms || null,
    subtotal: t.subtotal,
    cgst: t.cgst,
    sgst: t.sgst,
    igst: t.igst,
    roundOff: t.roundOff,
    total: t.total,
  };
  const lines = t.lines.map((l, i) => ({ sort: i, description: l.description, hsn: l.hsn ?? null, qty: l.qty, unit: l.unit, rate: l.rate, gstRate: l.gstRate, amount: l.amount }));

  let id: string;
  if (f.id) {
    const existing = await prisma.invoice.findUnique({ where: { id: f.id } });
    if (!existing) return fail("Invoice not found.");
    if (existing.status === "CANCELLED") return fail("A cancelled invoice cannot be edited.");
    await prisma.$transaction([
      prisma.invoiceLine.deleteMany({ where: { invoiceId: f.id } }),
      prisma.invoice.update({ where: { id: f.id }, data: { ...data, lines: { create: lines } } }),
    ]);
    id = f.id;
  } else {
    const inv = await prisma.$transaction(async (tx) => {
      const number = await nextInvoiceNumber(tx, settings.numbering.invoicePrefix, date);
      return tx.invoice.create({ data: { ...data, number, status: "ISSUED", createdByName: session.name, lines: { create: lines } } });
    });
    id = inv.id;
    await prisma.activity.create({ data: { customerId: f.customerId, type: "NOTE", text: `Tax invoice ${inv.number} raised for ₹${t.total.toLocaleString("en-IN")}`, createdByName: session.name } });
  }
  revalidatePath("/invoices");
  revalidatePath("/finance");
  revalidatePath("/");
  if (f.projectId) revalidatePath(`/projects/${f.projectId}`);
  redirect(`/invoices/${id}`);
}

export async function cancelInvoice(fd: FormData): Promise<void> {
  const session = await requireSession();
  const id = str(fd, "id");
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv || inv.status === "CANCELLED") return;
  await prisma.invoice.update({ where: { id }, data: { status: "CANCELLED" } });
  await prisma.activity.create({ data: { customerId: inv.customerId, type: "NOTE", text: `Tax invoice ${inv.number} cancelled`, createdByName: session.name } });
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/finance");
  revalidatePath("/");
}
