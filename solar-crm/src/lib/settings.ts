import { prisma } from "./prisma";

export interface PaymentTermRow {
  label: string;
  percent: number;
}
export interface MakeRow {
  item: string;
  makes: string;
}

/** Everything business-specific lives here, editable at /settings. Defaults come from the
 * existing Sanacara proposal (SSS/EPC/26-27/022) and tax invoice (SS/26-27/013). */
export interface Settings {
  company: {
    name: string;
    legalName: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    gstin: string;
    state: string;
    stateCode: string;
    signatory: string;
  };
  bank: { name: string; branch: string; ifsc: string; accountNo: string; beneficiary: string };
  numbering: { quotePrefix: string; invoicePrefix: string };
  solar: {
    /** Average grid tariff ₹/unit used for savings */
    tariff: number;
    /** kWh generated per kW per day (Chennai ≈ 4.0 after losses) */
    yieldPerKwDay: number;
    panelWp: number;
    areaPerKwSqft: number;
    /** Your all-in selling price per kW (GST incl.) — used for quick estimates */
    costPerKw: number;
    tariffEscalationPct: number;
    degradationPct: number;
    /** kg CO₂ avoided per kWh */
    co2PerUnit: number;
  };
  subsidy: {
    /** Central (PM Surya Ghar) ₹ per kW for the first 2 kW */
    centralFirst2PerKw: number;
    /** Central ₹ for the 3rd kW */
    central3rdKw: number;
    centralCap: number;
    /** State top-up (flat) */
    stateAmount: number;
    stateMinKw: number;
  };
  gst: {
    /** Share of a solar EPC package billed as supply of goods (rest = services) */
    supplySharePct: number;
    supplyGstPct: number;
    serviceGstPct: number;
    supplyHsn: string;
    serviceHsn: string;
  };
  quoteDefaults: {
    validityDays: number;
    systemType: string;
    warranty: string;
    performanceRatio: string;
    timeline: string;
    otherTerms: string;
    paymentTerms: PaymentTermRow[];
    subsidyDocs: string[];
    makes: MakeRow[];
  };
  invoiceDefaults: { paymentTerms: string; terms: string };
}

export const DEFAULT_SETTINGS: Settings = {
  company: {
    name: "Sanacara Solar Solutions",
    legalName: "Sanacara Business Solutions",
    tagline: "(A Unit of Sanacara Business Solutions)",
    address: "Old No. 18, New No. 2B, 14th Street, Jai Nagar, Arumbakkam, Chennai - 600106",
    phone: "+91 8939 592820 / 8939 420980",
    email: "energy@sanacara.com",
    website: "www.energy.sanacara.com",
    gstin: "33AQDPS6625C2Z0",
    state: "Tamilnadu",
    stateCode: "33",
    signatory: "Swaminathan Srinivasan",
  },
  bank: {
    name: "Karur Vysya Bank",
    branch: "Semencherry, Chennai",
    ifsc: "KVBL0001784",
    accountNo: "1784115000002601",
    beneficiary: "Sanacara Business Solutions",
  },
  numbering: { quotePrefix: "SSS/EPC", invoicePrefix: "SS" },
  solar: {
    tariff: 7,
    yieldPerKwDay: 4,
    panelWp: 580,
    areaPerKwSqft: 100,
    costPerKw: 74300,
    tariffEscalationPct: 3,
    degradationPct: 0.6,
    co2PerUnit: 0.82,
  },
  subsidy: {
    centralFirst2PerKw: 30000,
    central3rdKw: 18000,
    centralCap: 78000,
    stateAmount: 22000,
    stateMinKw: 3,
  },
  gst: { supplySharePct: 70, supplyGstPct: 5, serviceGstPct: 18, supplyHsn: "8541", serviceHsn: "9954" },
  quoteDefaults: {
    validityDays: 10,
    systemType: "On-Grid",
    warranty:
      "8 Years for Inverter and Battery, For Panels - 12 years Product Workmanship Warranty and 30 years Power Warranty (as per the respective manufacturer)",
    performanceRatio: "Based on PV Syst report, 78% of PR will be maintained throughout the year",
    timeline:
      "10-15 days from the date of confirmation and advance payment (Subject to availability of Solar Panels and Resources)",
    otherTerms: "Any other activities other than the specified scope will be charged extra.",
    paymentTerms: [
      { label: "Advance along with a Letter of Award (LOA)", percent: 60 },
      { label: "Once the materials reach the site", percent: 20 },
      { label: "Completion of installation & commissioning", percent: 20 },
    ],
    subsidyDocs: [
      "Passport size photo",
      "EB Card Copy / Latest Bill Copy",
      "Aadhar copy front and back",
      "Passbook front page or cancelled cheque",
      "Email id",
      "One Phone number to get otp",
    ],
    makes: [
      { item: "Modules", makes: "EMMVEE/PREMIER/ADANI/SAATVIK/Equivalent" },
      { item: "Inverter", makes: "DEYE/FESTON/Equivalent" },
      { item: "MC4", makes: "NINGJBO / ELCOM / EQUIVALENT" },
      { item: "DC & AC Cables", makes: "POLYCAB / EQUIVALENT" },
      { item: "ACDB / DCDB", makes: "EVVO / EQUIVALENT" },
      { item: "Earthing Materials", makes: "EXCEL EARTHING" },
      { item: "CONDUIT", makes: "ASTRAL" },
    ],
  },
  invoiceDefaults: {
    paymentTerms: "50% Advance along with Letter of Award (LOA)\n30% Once material is delivered\n20% Upon completion of installation & commissioning",
    terms:
      "1. Prices are inclusive/exclusive of GST as stated.\n2. Any additional civil work, EB scope variation, or statutory charges beyond agreed scope will be extra.\n3. Warranty applicable as per manufacturer terms.\n4. Material dispatch subject to receipt of advance payment.",
  },
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Overlays stored values on defaults, section by section, so new settings added later get their defaults. */
function merge<T>(defaults: T, stored: unknown): T {
  if (!isPlainObject(defaults) || !isPlainObject(stored)) return (stored ?? defaults) as T;
  const out: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const d = (defaults as Record<string, unknown>)[key];
    const s = stored[key];
    if (s === undefined) continue;
    if (isPlainObject(d)) out[key] = merge(d, s);
    else if (Array.isArray(d)) out[key] = Array.isArray(s) ? s : d;
    else if (typeof d === typeof s) out[key] = s;
  }
  return out as T;
}

export async function getSettings(): Promise<Settings> {
  const row = await prisma.setting.findUnique({ where: { id: "main" } });
  return merge(DEFAULT_SETTINGS, row?.data);
}

export async function saveSettings(next: Settings): Promise<void> {
  const data = JSON.parse(JSON.stringify(next));
  await prisma.setting.upsert({ where: { id: "main" }, create: { id: "main", data }, update: { data } });
}
