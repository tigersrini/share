"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { fail, num, oneOf, str, type ActionState } from "@/lib/form";
import { financialYear } from "@/lib/format";
import { getSettings, saveSettings, type MakeRow, type PaymentTermRow, type Settings } from "@/lib/settings";

const lines = (fd: FormData, key: string) =>
  str(fd, key)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export async function saveSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const cur = await getSettings();

  const paymentTerms: PaymentTermRow[] = [];
  for (const l of lines(fd, "quote.paymentTerms")) {
    const [p, ...rest] = l.split("|");
    const percent = Number(p.trim().replace("%", ""));
    const label = rest.join("|").trim();
    if (!Number.isFinite(percent) || !label) return fail(`Payment term "${l}" should look like: 60 | Advance along with LOA`);
    paymentTerms.push({ percent, label });
  }
  const makes: MakeRow[] = lines(fd, "quote.makes").map((l) => {
    const [item, ...rest] = l.split("|");
    return { item: item.trim(), makes: rest.join("|").trim() };
  });

  const next: Settings = {
    company: {
      name: str(fd, "company.name") || cur.company.name,
      legalName: str(fd, "company.legalName") || cur.company.legalName,
      tagline: str(fd, "company.tagline"),
      address: str(fd, "company.address"),
      phone: str(fd, "company.phone"),
      email: str(fd, "company.email"),
      website: str(fd, "company.website"),
      gstin: str(fd, "company.gstin").toUpperCase(),
      state: str(fd, "company.state") || cur.company.state,
      stateCode: str(fd, "company.stateCode") || cur.company.stateCode,
      signatory: str(fd, "company.signatory"),
    },
    bank: {
      name: str(fd, "bank.name"),
      branch: str(fd, "bank.branch"),
      ifsc: str(fd, "bank.ifsc").toUpperCase(),
      accountNo: str(fd, "bank.accountNo"),
      beneficiary: str(fd, "bank.beneficiary"),
    },
    numbering: {
      quotePrefix: str(fd, "numbering.quotePrefix") || cur.numbering.quotePrefix,
      invoicePrefix: str(fd, "numbering.invoicePrefix") || cur.numbering.invoicePrefix,
    },
    solar: {
      tariff: num(fd, "solar.tariff", cur.solar.tariff),
      yieldPerKwDay: num(fd, "solar.yieldPerKwDay", cur.solar.yieldPerKwDay),
      panelWp: num(fd, "solar.panelWp", cur.solar.panelWp),
      areaPerKwSqft: num(fd, "solar.areaPerKwSqft", cur.solar.areaPerKwSqft),
      costPerKw: num(fd, "solar.costPerKw", cur.solar.costPerKw),
      tariffEscalationPct: num(fd, "solar.tariffEscalationPct", cur.solar.tariffEscalationPct),
      degradationPct: num(fd, "solar.degradationPct", cur.solar.degradationPct),
      co2PerUnit: num(fd, "solar.co2PerUnit", cur.solar.co2PerUnit),
    },
    subsidy: {
      centralFirst2PerKw: num(fd, "subsidy.centralFirst2PerKw", cur.subsidy.centralFirst2PerKw),
      central3rdKw: num(fd, "subsidy.central3rdKw", cur.subsidy.central3rdKw),
      centralCap: num(fd, "subsidy.centralCap", cur.subsidy.centralCap),
      stateAmount: num(fd, "subsidy.stateAmount", cur.subsidy.stateAmount),
      stateMinKw: num(fd, "subsidy.stateMinKw", cur.subsidy.stateMinKw),
    },
    gst: {
      supplySharePct: num(fd, "gst.supplySharePct", cur.gst.supplySharePct),
      supplyGstPct: num(fd, "gst.supplyGstPct", cur.gst.supplyGstPct),
      serviceGstPct: num(fd, "gst.serviceGstPct", cur.gst.serviceGstPct),
      supplyHsn: str(fd, "gst.supplyHsn") || cur.gst.supplyHsn,
      serviceHsn: str(fd, "gst.serviceHsn") || cur.gst.serviceHsn,
    },
    quoteDefaults: {
      validityDays: Math.max(1, Math.round(num(fd, "quote.validityDays", cur.quoteDefaults.validityDays))),
      systemType: oneOf(str(fd, "quote.systemType"), ["On-Grid", "Hybrid", "Off-Grid"] as const, "On-Grid"),
      warranty: str(fd, "quote.warranty"),
      performanceRatio: str(fd, "quote.performanceRatio"),
      timeline: str(fd, "quote.timeline"),
      otherTerms: str(fd, "quote.otherTerms"),
      paymentTerms,
      subsidyDocs: lines(fd, "quote.subsidyDocs"),
      makes,
    },
    invoiceDefaults: { paymentTerms: str(fd, "invoice.paymentTerms"), terms: str(fd, "invoice.terms") },
  };
  if (next.gst.supplySharePct < 0 || next.gst.supplySharePct > 100) return fail("Supply share must be between 0 and 100.");

  await saveSettings(next);

  // "Next number" fields set the counter for the current financial year.
  const fy = financialYear();
  for (const [series, field] of [["quote", "numbering.nextQuote"], ["invoice", "numbering.nextInvoice"]] as const) {
    const n = Math.round(num(fd, field, 0));
    if (n >= 1) await prisma.counter.upsert({ where: { key: `${series}:${fy}` }, create: { key: `${series}:${fy}`, value: n - 1 }, update: { value: n - 1 } });
  }
  revalidatePath("/", "layout");
  return { ok: "Settings saved." };
}

// ───── Users ─────

export async function createUser(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const email = str(fd, "email").toLowerCase();
  const name = str(fd, "name");
  const password = str(fd, "password");
  if (!email.includes("@")) return fail("Enter a valid email.");
  if (!name) return fail("Enter a name.");
  if (password.length < 8) return fail("Password must be at least 8 characters.");
  try {
    await prisma.user.create({ data: { email, name, role: oneOf(str(fd, "role"), ["ADMIN", "STAFF", "FIELD"] as const, "STAFF"), passwordHash: await bcrypt.hash(password, 10) } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail("A user with that email already exists.");
    throw e;
  }
  revalidatePath("/settings/users");
  return { ok: "User created." };
}

export async function updateUser(fd: FormData): Promise<void> {
  const me = await requireAdmin();
  const id = str(fd, "id");
  const role = oneOf(str(fd, "role"), ["ADMIN", "STAFF", "FIELD"] as const, "STAFF");
  const active = str(fd, "active") === "true";
  if (id === me.userId && (!active || role !== "ADMIN")) throw new Error("You cannot deactivate or demote your own account.");
  await prisma.user.update({ where: { id }, data: { role, active } });
  revalidatePath("/settings/users");
}

export async function resetUserPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const password = str(fd, "password");
  if (password.length < 8) return fail("Password must be at least 8 characters.");
  await prisma.user.update({ where: { id: str(fd, "id") }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  return { ok: "Password reset." };
}

export async function changeOwnPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return fail("User not found.");
  if (!(await bcrypt.compare(str(fd, "current"), user.passwordHash))) return fail("Current password is incorrect.");
  const next = str(fd, "next");
  if (next.length < 8) return fail("New password must be at least 8 characters.");
  if (next !== str(fd, "confirm")) return fail("The new passwords do not match.");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return { ok: "Password changed." };
}
