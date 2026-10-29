import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
import { financialYear, round2 } from "../src/lib/format";
import { computeInvoice } from "../src/lib/gst";
import { recordMovement } from "../src/lib/stock";
import { nextInvoiceNumber, nextProjectCode, nextQuoteNumber } from "../src/lib/numbering";
import { DEFAULT_PROJECT_TASKS } from "../src/lib/labels";
import { calculateSolar, defaultInput } from "../src/lib/solar";
import { asJson } from "../src/lib/prisma";

const prisma = new PrismaClient();
const DAY = 86400000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysAhead = (n: number) => new Date(Date.now() + n * DAY);

async function seedBase() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@sanacara.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "changeme123";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: { email, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`Created admin login: ${email} / ${password}  ← change this password after first login`);
  } else {
    console.log(`Admin ${email} already exists.`);
  }

  await prisma.setting.upsert({
    where: { id: "main" },
    create: { id: "main", data: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) },
    update: {},
  });

  // Continue the existing document series: proposal SSS/EPC/26-27/022 and invoice SS/26-27/013 were the latest.
  const fy = financialYear();
  await prisma.counter.createMany({
    data: [
      { key: `quote:${fy}`, value: fy === "26-27" ? 22 : 0 },
      { key: `invoice:${fy}`, value: fy === "26-27" ? 13 : 0 },
    ],
    skipDuplicates: true,
  });
}

async function seedDemo() {
  if ((await prisma.customer.count()) > 0) {
    console.log("Customers already exist — skipping demo data.");
    return;
  }
  const s = DEFAULT_SETTINGS;

  const [kvs, rn] = await Promise.all([
    prisma.supplier.create({ data: { name: "Kovai Solar Distributors", phone: "9800011111", gstin: "33AAAAA0000A1Z5", address: "Coimbatore" } }),
    prisma.supplier.create({ data: { name: "Chennai Electricals & Cables", phone: "9800022222", address: "Mannady, Chennai" } }),
  ]);

  const itemDefs = [
    { sku: "PNL-585-BF", name: "DCR Bifacial TOPCon Module 585 Wp", category: "PANEL", make: "Emmvee", spec: "585 Wp", hsn: "8541", gstRate: 5, cost: 9800, sell: 11800, qty: 40, reorder: 20, sup: kvs.id },
    { sku: "INV-5K-1P", name: "Solar On-Grid Inverter 5 kW 1-Ph", category: "INVERTER", make: "Deye", spec: "5 kW 1-Ph", hsn: "8504", gstRate: 5, cost: 38500, sell: 46000, qty: 6, reorder: 3, sup: kvs.id },
    { sku: "INV-3K-1P", name: "Solar On-Grid Inverter 3 kW 1-Ph", category: "INVERTER", make: "Deye", spec: "3 kW 1-Ph", hsn: "8504", gstRate: 5, cost: 26500, sell: 32000, qty: 2, reorder: 3, sup: kvs.id },
    { sku: "INV-6K-HY", name: "Hybrid Inverter 6 kW 1-Ph", category: "INVERTER", make: "Deye", spec: "6 kW", hsn: "8504", gstRate: 5, cost: 82000, sell: 96000, qty: 1, reorder: 1, sup: kvs.id },
    { sku: "BAT-5K-LI", name: "Lithium Battery 5 kWh", category: "BATTERY", make: "Pylontech", spec: "5 kWh", hsn: "8507", gstRate: 18, cost: 98000, sell: 118000, qty: 1, reorder: 1, sup: kvs.id },
    { sku: "STR-AL-1K", name: "Mounting Structure (Al/GI) per kW", category: "STRUCTURE", make: "Local", spec: "hot-dip galvanised", uom: "Set", hsn: "7308", gstRate: 18, cost: 6200, sell: 8000, qty: 18, reorder: 6, sup: rn.id },
    { sku: "CBL-DC-4", name: "DC Solar Cable 4 sq.mm", category: "CABLE", make: "Polycab", uom: "Mtrs", hsn: "8544", gstRate: 18, cost: 42, sell: 60, qty: 600, reorder: 300, sup: rn.id },
    { sku: "CBL-AC-6", name: "AC Cable 3C x 6 sq.mm", category: "CABLE", make: "Polycab", uom: "Mtrs", hsn: "8544", gstRate: 18, cost: 118, sell: 160, qty: 160, reorder: 150, sup: rn.id },
    { sku: "ACDB-5K", name: "ACDB with SPD 5 kW", category: "PROTECTION", make: "Evvo", uom: "Set", hsn: "8537", gstRate: 18, cost: 2600, sell: 3800, qty: 9, reorder: 4, sup: rn.id },
    { sku: "DCDB-5K", name: "DCDB with SPD 5 kW", category: "PROTECTION", make: "Evvo", uom: "Set", hsn: "8537", gstRate: 18, cost: 3100, sell: 4400, qty: 9, reorder: 4, sup: rn.id },
    { sku: "ERT-KIT", name: "Earthing Kit + Lightning Arrester", category: "EARTHING", make: "Excel Earthing", uom: "Set", hsn: "8536", gstRate: 18, cost: 4200, sell: 5800, qty: 7, reorder: 4, sup: rn.id },
    { sku: "MC4-PR", name: "MC4 Connectors (pair)", category: "ACCESSORY", make: "Ningbo", uom: "Set", hsn: "8536", gstRate: 18, cost: 85, sell: 140, qty: 12, reorder: 20, sup: rn.id },
  ] as const;
  const items: Record<string, string> = {};
  for (const d of itemDefs) {
    const it = await prisma.item.create({
      data: {
        sku: d.sku, name: d.name, category: d.category, make: d.make, spec: "spec" in d ? d.spec : null,
        uom: "uom" in d ? d.uom : "Nos", hsn: d.hsn, gstRate: d.gstRate, costPrice: 0, sellPrice: d.sell, reorderLevel: d.reorder,
      },
    });
    items[d.sku] = it.id;
    await prisma.$transaction((tx) =>
      recordMovement(tx, { itemId: it.id, type: "PURCHASE", qty: d.qty, unitCost: d.cost, supplierId: d.sup, reference: "Demo opening purchase" }),
    );
  }

  const people = [
    { name: "Ravi Kumar", phone: "9840000001", city: "Velachery", stage: "NEW", units: 520, follow: daysAhead(0), source: "Website" },
    { name: "Meenakshi Sundaram", phone: "9840000002", city: "Adyar", stage: "CONTACTED", units: 700, follow: daysAgo(2), source: "Referral" },
    { name: "Anand Villas Owners Assoc.", phone: "9840000003", city: "Thazhambur", stage: "SITE_VISIT", units: 1500, follow: daysAhead(2), source: "Apartment / Villa community", type: "COMMERCIAL" },
    { name: "Priya Natarajan", phone: "9840000004", city: "Porur", stage: "QUOTED", units: 450, follow: daysAhead(1), source: "WhatsApp" },
    { name: "Karthik Subramanian", phone: "9840000005", city: "Medavakkam", stage: "NEGOTIATION", units: 620, follow: daysAgo(1), source: "Referral" },
    { name: "Lakshmi Iyer", phone: "9840000006", city: "Anna Nagar", stage: "WON", units: 380, follow: null, source: "Google" },
    { name: "Suresh Babu", phone: "9840000007", city: "Tambaram", stage: "WON", units: 840, follow: null, source: "Walk-in" },
    { name: "Divya Menon", phone: "9840000008", city: "Perungudi", stage: "LOST", units: 300, follow: null, source: "Facebook / Instagram", lost: "Went with a cheaper local vendor" },
  ];
  const customers: Record<string, string> = {};
  for (const p of people) {
    const c = await prisma.customer.create({
      data: {
        name: p.name, phone: p.phone, city: p.city, address: `${p.city}, Chennai`, type: (p.type as "COMMERCIAL" | undefined) ?? "RESIDENTIAL",
        stage: p.stage as "NEW", monthlyUnits: p.units, monthlyBill: p.units * 6.5, source: p.source, nextFollowUpAt: p.follow, lostReason: p.lost ?? null,
        activities: { create: [{ type: "NOTE", text: "Enquiry received", createdByName: "Admin", createdAt: daysAgo(10) }] },
      },
    });
    customers[p.name] = c.id;
  }

  const lineSet = (kw: number) => {
    const panels = Math.ceil((kw * 1000) / 580);
    return [
      { description: `Supply and Installation of ${(panels * 0.58).toFixed(2)}KW DC Solar Power Plant\nSolar Panel DCR Bifacial Mono/TOPCon (540–600 Wp) EMMVEE/ Premier/ Equivalent`, uom: "Nos", qty: String(panels), qtyNum: panels, itemId: items["PNL-585-BF"], unitCost: 9800 },
      { description: `${kw}KW 1Ph Solar Inverter  Make: Deye / Feston / Equivalent`, uom: "Nos", qty: "1", qtyNum: 1, itemId: items[kw >= 5 ? "INV-5K-1P" : "INV-3K-1P"], unitCost: kw >= 5 ? 38500 : 26500 },
      { description: `Solar Mounting Structure Sheet Al– ${kw}KW`, uom: "Set", qty: "3", qtyNum: 3, itemId: items["STR-AL-1K"], unitCost: 6200 },
      { description: `ACDB with SPD – ${kw}kw & DCDB with SPD – ${kw}kw`, uom: "Set", qty: "1", qtyNum: 1, itemId: items["ACDB-5K"], unitCost: 5700 },
      { description: "MC4 Connectors, PVC Pipes and clamps", uom: "Set", qty: "1", qtyNum: 1, itemId: items["MC4-PR"], unitCost: 1800 },
      { description: "Earthing Kits, Lighting Arrester", uom: "Set", qty: "1", qtyNum: 1, itemId: items["ERT-KIT"], unitCost: 4200 },
    ];
  };

  async function makeQuote(customerName: string, kw: number, status: "DRAFT" | "SENT" | "ACCEPTED", ageDays: number) {
    const date = daysAgo(ageDays);
    const calc = calculateSolar({ ...defaultInput(s), monthlyUnits: Math.round((kw * 4 * 30) / 1), kwOverride: kw }, s.subsidy);
    return prisma.$transaction(async (tx) => {
      const number = await nextQuoteNumber(tx, s.numbering.quotePrefix, date);
      return tx.quote.create({
        data: {
          number, customerId: customers[customerName], status, date, validityDays: 10,
          title: `PROPOSAL- DESIGN, SUPPLY & INSTALLATION OF ${kw}KW On-GRID SOLAR PV POWER PROJECT`,
          systemKw: kw, systemType: "On-Grid",
          scopeText: `Design, Engineering, Supply of Solar DCR Bifacial Mono/TOPCon, (540–600 Wp) ${kw} kW, Single Phase, MPPT. High-raised, hot-dip galvanized MS structure, AC box, DC box, DC, AC & PV structure, inverter & equipment earthing, Earthing Cables, Copper Bonded Earth Rods, Lightning Arrester & Other Accessories`,
          totalAmount: calc.grossCost, subsidyCentral: calc.subsidyCentral, subsidyState: calc.subsidyState,
          makes: asJson(s.quoteDefaults.makes), paymentTerms: asJson(s.quoteDefaults.paymentTerms), subsidyDocs: asJson(s.quoteDefaults.subsidyDocs),
          warranty: s.quoteDefaults.warranty, performanceRatio: s.quoteDefaults.performanceRatio, timeline: s.quoteDefaults.timeline, otherTerms: s.quoteDefaults.otherTerms,
          calc: JSON.parse(JSON.stringify({ ...defaultInput(s), monthlyUnits: Math.round(kw * 4 * 30), kwOverride: kw })), includeSavings: true,
          createdByName: "Admin", sentAt: status === "DRAFT" ? null : date, decidedAt: status === "ACCEPTED" ? daysAgo(ageDays - 3) : null,
          lines: { create: lineSet(kw).map((l, i) => ({ ...l, sort: i })) },
        },
      });
    });
  }

  await makeQuote("Priya Natarajan", 3, "SENT", 4);
  await makeQuote("Karthik Subramanian", 5, "SENT", 6);
  await makeQuote("Anand Villas Owners Assoc.", 10, "DRAFT", 1);
  const q1 = await makeQuote("Lakshmi Iyer", 3, "ACCEPTED", 40);
  const q2 = await makeQuote("Suresh Babu", 5, "ACCEPTED", 25);

  async function makeProject(quote: { id: string; customerId: string; systemKw: number; totalAmount: number; subsidyCentral: number; subsidyState: number }, name: string, doneTasks: number, stage: "COMPLETED" | "INSTALLATION", ageDays: number, paidPct: number) {
    const contract = quote.totalAmount - quote.subsidyCentral - quote.subsidyState;
    const code = await prisma.$transaction((tx) => nextProjectCode(tx, daysAgo(ageDays)));
    const proj = await prisma.project.create({
      data: {
        code, customerId: quote.customerId, quoteId: quote.id, name, systemKw: quote.systemKw, stage, contractValue: contract,
        subsidyAmount: quote.subsidyCentral + quote.subsidyState, subsidyStatus: stage === "COMPLETED" ? "APPLIED" : "TO_APPLY",
        startDate: daysAgo(ageDays), targetDate: daysAhead(10), completedAt: stage === "COMPLETED" ? daysAgo(5) : null, createdAt: daysAgo(ageDays),
        tasks: { create: DEFAULT_PROJECT_TASKS.map((title, i) => ({ title, sort: i, done: i < doneTasks, doneAt: i < doneTasks ? daysAgo(ageDays - i) : null })) },
      },
    });
    // stock issued
    const issue = quote.systemKw >= 5 ? [["PNL-585-BF", 9], ["INV-5K-1P", 1], ["STR-AL-1K", 3], ["ACDB-5K", 1], ["DCDB-5K", 1], ["ERT-KIT", 1], ["CBL-DC-4", 60], ["MC4-PR", 1]] : [["PNL-585-BF", 6], ["INV-3K-1P", 1], ["STR-AL-1K", 3], ["ACDB-5K", 1], ["DCDB-5K", 1], ["ERT-KIT", 1], ["CBL-DC-4", 40], ["MC4-PR", 1]];
    for (const [sku, qty] of issue as [string, number][]) {
      await prisma.$transaction((tx) => recordMovement(tx, { itemId: items[sku], type: "ISSUE", qty, projectId: proj.id, createdByName: "Admin" }));
    }
    await prisma.expense.createMany({
      data: [
        { date: daysAgo(ageDays - 8), category: "LABOUR", amount: quote.systemKw * 3500, vendor: "Installation crew", projectId: proj.id },
        { date: daysAgo(ageDays - 7), category: "TRANSPORT", amount: 2500, vendor: "Mini-truck", projectId: proj.id },
        { date: daysAgo(ageDays - 6), category: "PERMITS", amount: 1500, vendor: "TNEB", projectId: proj.id },
      ],
    });
    const paid = round2(contract * paidPct);
    await prisma.payment.create({ data: { date: daysAgo(ageDays - 1), amount: round2(contract * 0.6), mode: "BANK_TRANSFER", reference: "Advance 60%", customerId: quote.customerId, projectId: proj.id } });
    if (paidPct > 0.6) await prisma.payment.create({ data: { date: daysAgo(ageDays - 10), amount: round2(paid - contract * 0.6), mode: "UPI", reference: "Balance", customerId: quote.customerId, projectId: proj.id } });
    return { proj, contract };
  }

  const p1 = await makeProject(q1, "3 kW On-Grid – Lakshmi Iyer", 14, "COMPLETED", 40, 1);
  const p2 = await makeProject(q2, "5 kW On-Grid – Suresh Babu", 6, "INSTALLATION", 25, 0.6);

  // One tax invoice for the completed project, built like invoice SS/26-27/013
  const base = p1.contract;
  const supply = round2((base / 1.089) * 0.7);
  const svc = round2(base / 1.089 - supply);
  const totals = computeInvoice(
    [
      { description: "Supply of Materials (On-Grid Solar Power Plant)\n3.00kW Solar Plant – DCR Bifacial modules, inverter & balance of system", hsn: "8541", qty: 3, unit: "KW", rate: round2(supply / 3), gstRate: 5 },
      { description: "Installation, civil & commissioning services", hsn: "9954", qty: 1, unit: "SET", rate: svc, gstRate: 18 },
    ],
    true,
  );
  await prisma.$transaction(async (tx) => {
    const number = await nextInvoiceNumber(tx, s.numbering.invoicePrefix, daysAgo(8));
    const cust = await tx.customer.findUniqueOrThrow({ where: { id: customers["Lakshmi Iyer"] } });
    await tx.invoice.create({
      data: {
        number, date: daysAgo(8), status: "ISSUED", customerId: cust.id, projectId: p1.proj.id, quoteId: q1.id,
        placeOfSupply: "33", billName: cust.name, billAddress: cust.address ?? "", paymentTerms: s.invoiceDefaults.paymentTerms, terms: s.invoiceDefaults.terms,
        subtotal: totals.subtotal, cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst, roundOff: totals.roundOff, total: totals.total, createdByName: "Admin",
        lines: { create: totals.lines.map((l, i) => ({ sort: i, description: l.description, hsn: l.hsn, qty: l.qty, unit: l.unit, rate: l.rate, gstRate: l.gstRate, amount: l.amount })) },
      },
    });
  });
  // ── Field team: crew, a sample phone login, 3 weeks of history and 2 weeks of plan ──
  const crew = await Promise.all(
    [
      ["Murugan", "Supervisor", 1200, "9840100001"],
      ["Selvam", "Installer", 900, "9840100002"],
      ["Ramesh", "Installer", 900, "9840100003"],
      ["Anbu", "Electrician", 1000, "9840100004"],
      ["Karthi", "Helper", 700, "9840100005"],
      ["Vignesh", "Welder / fabricator", 950, "9840100006"],
    ].map(([name, role, rate, phone]) => prisma.teamMember.create({ data: { name: name as string, role: role as string, dailyRate: rate as number, phone: phone as string } })),
  );
  // Locally the sample crew login is crew@sanacara.com / crew12345. On a hosted deploy (VERCEL) the password
  // must come from DEMO_CREW_PASSWORD, otherwise no crew login is created — never ship a known password.
  const crewPassword = process.env.DEMO_CREW_PASSWORD ?? (process.env.VERCEL ? null : "crew12345");
  if (crewPassword) {
    const crewUser = await prisma.user.create({ data: { email: "crew@sanacara.com", name: "Selvam", role: "FIELD", passwordHash: await bcrypt.hash(crewPassword, 10) } });
    await prisma.teamMember.update({ where: { id: crew[1].id }, data: { userId: crewUser.id } });
  }

  const noon = (n: number) => {
    const d = new Date(Date.now() + n * DAY);
    return new Date(`${new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Kolkata" }).format(d)}T12:00:00+05:30`);
  };
  const isSunday = (d: Date) => new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Kolkata" }).format(d) === "Sun";
  const rows: { projectId: string; memberId: string; date: Date; status: "DONE" | "PLANNED" | "ABSENT"; note: string | null; createdByName: string }[] = [];
  const put = (proj: string, members: number[], from: number, to: number, note: string | null) => {
    for (let n = from; n <= to; n++) {
      const d = noon(n);
      if (isSunday(d)) continue;
      for (const mi of members) rows.push({ projectId: proj, memberId: crew[mi].id, date: d, status: n < 0 ? (mi === 4 && n === -3 ? "ABSENT" : "DONE") : "PLANNED", note: n === from ? note : null, createdByName: "Admin" });
    }
  };
  // completed 3 kW job (finished ~5 days ago)
  put(p1.proj.id, [0, 1, 2], -14, -12, "Structure erection");
  put(p1.proj.id, [1, 3], -11, -6, "Panels, inverter, cabling & commissioning");
  // running 5 kW job
  put(p2.proj.id, [0, 2, 5], -4, -2, "Structure fabrication & erection");
  put(p2.proj.id, [0, 2, 4], -1, 0, "Panel mounting");
  put(p2.proj.id, [0, 2, 3], 1, 3, "Inverter, ACDB/DCDB, cabling — electrician on site");
  put(p2.proj.id, [3], 5, 5, "Net-meter inspection with TNEB");
  await prisma.assignment.createMany({ data: rows, skipDuplicates: true });
  await prisma.siteUpdate.createMany({
    data: [
      { projectId: p2.proj.id, memberId: crew[0].id, note: "Structure erected on both roof sections. Panels delivered and stacked in the car park.", createdByName: "Murugan", createdAt: new Date(Date.now() - 2 * DAY) },
      { projectId: p2.proj.id, memberId: crew[1].id, note: "9 panels mounted. Customer asked to move the inverter to the utility wall — fine, cable +8 m.", createdByName: "Selvam", createdAt: new Date(Date.now() - 4 * 3600000) },
      { projectId: p1.proj.id, memberId: crew[0].id, note: "Commissioned, customer trained on the app. Net-meter application filed.", createdByName: "Murugan", createdAt: new Date(Date.now() - 6 * DAY) },
    ],
  });

  await prisma.expense.createMany({
    data: [
      { date: daysAgo(20), category: "RENT", amount: 18000, vendor: "Office rent" },
      { date: daysAgo(15), category: "SALARY", amount: 45000, vendor: "Staff salaries" },
      { date: daysAgo(12), category: "MARKETING", amount: 6500, vendor: "Meta ads" },
      { date: daysAgo(3), category: "UTILITIES", amount: 2400, vendor: "Internet & phone" },
    ],
  });
  console.log("Demo data loaded (fictional customers). Sample crew login: crew@sanacara.com (see DEMO_CREW_PASSWORD / seed notes)");
}

async function main() {
  await seedBase();
  if (process.env.SEED_DEMO === "true") await seedDemo();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
