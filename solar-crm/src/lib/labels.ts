export type Tone = "zinc" | "green" | "orange" | "red" | "blue" | "violet" | "amber";

export const STAGES = ["NEW", "CONTACTED", "SITE_VISIT", "QUOTED", "NEGOTIATION", "WON", "LOST"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = {
  NEW: "New lead",
  CONTACTED: "Contacted",
  SITE_VISIT: "Site visit",
  QUOTED: "Quoted",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};
export const STAGE_TONE: Record<Stage, Tone> = {
  NEW: "blue",
  CONTACTED: "violet",
  SITE_VISIT: "amber",
  QUOTED: "orange",
  NEGOTIATION: "orange",
  WON: "green",
  LOST: "zinc",
};

export const CUSTOMER_TYPES = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"] as const;
export const CUSTOMER_TYPE_LABEL: Record<(typeof CUSTOMER_TYPES)[number], string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  INDUSTRIAL: "Industrial",
};

export const LEAD_SOURCES = ["Referral", "Website", "WhatsApp", "Walk-in", "Facebook / Instagram", "Google", "Apartment / Villa community", "Channel partner", "Other"];

export const ACTIVITY_TYPES = ["NOTE", "CALL", "VISIT", "WHATSAPP", "EMAIL"] as const;
export const ACTIVITY_LABEL: Record<string, string> = {
  NOTE: "Note",
  CALL: "Call",
  VISIT: "Site visit",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  STAGE: "Stage change",
};

export const QUOTE_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;
export type QuoteStatusKey = (typeof QUOTE_STATUSES)[number];
export const QUOTE_LABEL: Record<QuoteStatusKey, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};
export const QUOTE_TONE: Record<QuoteStatusKey, Tone> = {
  DRAFT: "zinc",
  SENT: "blue",
  ACCEPTED: "green",
  REJECTED: "red",
  EXPIRED: "amber",
};

export const PROJECT_STAGES = [
  "ORDER_CONFIRMED",
  "ADVANCE_RECEIVED",
  "PROCUREMENT",
  "INSTALLATION",
  "COMMISSIONING",
  "NET_METERING",
  "COMPLETED",
  "ON_HOLD",
  "CANCELLED",
] as const;
export type ProjectStageKey = (typeof PROJECT_STAGES)[number];
export const PROJECT_STAGE_LABEL: Record<ProjectStageKey, string> = {
  ORDER_CONFIRMED: "Order confirmed",
  ADVANCE_RECEIVED: "Advance received",
  PROCUREMENT: "Procurement",
  INSTALLATION: "Installation",
  COMMISSIONING: "Commissioning",
  NET_METERING: "Net metering / DISCOM",
  COMPLETED: "Completed",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
};
export const PROJECT_STAGE_TONE: Record<ProjectStageKey, Tone> = {
  ORDER_CONFIRMED: "blue",
  ADVANCE_RECEIVED: "blue",
  PROCUREMENT: "violet",
  INSTALLATION: "orange",
  COMMISSIONING: "amber",
  NET_METERING: "amber",
  COMPLETED: "green",
  ON_HOLD: "zinc",
  CANCELLED: "red",
};
/** Stages that still need work (everything not finished/dead). */
export const ACTIVE_PROJECT_STAGES: ProjectStageKey[] = ["ORDER_CONFIRMED", "ADVANCE_RECEIVED", "PROCUREMENT", "INSTALLATION", "COMMISSIONING", "NET_METERING"];

export const DEFAULT_PROJECT_TASKS = [
  "Site survey & measurements",
  "Load / DISCOM application submitted",
  "Advance payment received",
  "Materials ordered",
  "Materials delivered to site",
  "Structure erected",
  "Panels installed",
  "Inverter, ACDB/DCDB & cabling done",
  "Earthing & lightning arrester done",
  "Testing & commissioning",
  "Net meter installed",
  "Subsidy application filed",
  "Customer handover & training",
  "Final payment received",
];

export const SUBSIDY_STATUSES = ["NOT_APPLICABLE", "TO_APPLY", "APPLIED", "APPROVED", "RECEIVED"] as const;
export const SUBSIDY_LABEL: Record<(typeof SUBSIDY_STATUSES)[number], string> = {
  NOT_APPLICABLE: "Not applicable",
  TO_APPLY: "To apply",
  APPLIED: "Applied",
  APPROVED: "Approved",
  RECEIVED: "Received",
};

export const PAYMENT_MODES = ["BANK_TRANSFER", "UPI", "CASH", "CHEQUE", "CARD", "OTHER"] as const;
export const PAYMENT_MODE_LABEL: Record<(typeof PAYMENT_MODES)[number], string> = {
  BANK_TRANSFER: "Bank transfer",
  UPI: "UPI",
  CASH: "Cash",
  CHEQUE: "Cheque",
  CARD: "Card",
  OTHER: "Other",
};

export const ITEM_CATEGORIES = ["PANEL", "INVERTER", "BATTERY", "STRUCTURE", "CABLE", "PROTECTION", "EARTHING", "ACCESSORY", "CIVIL", "OTHER"] as const;
export const ITEM_CATEGORY_LABEL: Record<(typeof ITEM_CATEGORIES)[number], string> = {
  PANEL: "Solar panels",
  INVERTER: "Inverters",
  BATTERY: "Batteries",
  STRUCTURE: "Mounting structure",
  CABLE: "Cables & wires",
  PROTECTION: "ACDB / DCDB / SPD",
  EARTHING: "Earthing & lightning",
  ACCESSORY: "Connectors & accessories",
  CIVIL: "Civil & consumables",
  OTHER: "Other",
};

export const MOVEMENT_LABEL: Record<string, string> = {
  OPENING: "Opening stock",
  PURCHASE: "Purchase",
  ISSUE: "Issued to project",
  RETURN: "Returned from project",
  ADJUSTMENT: "Adjustment",
};

export const EXPENSE_CATEGORIES = ["SALARY", "LABOUR", "TRANSPORT", "INSTALLATION", "PERMITS", "MARKETING", "RENT", "UTILITIES", "TOOLS", "OFFICE", "OTHER"] as const;
export const EXPENSE_LABEL: Record<(typeof EXPENSE_CATEGORIES)[number], string> = {
  SALARY: "Salaries",
  LABOUR: "Site labour",
  TRANSPORT: "Transport & freight",
  INSTALLATION: "Installation sub-contract",
  PERMITS: "Permits / DISCOM fees",
  MARKETING: "Marketing",
  RENT: "Rent",
  UTILITIES: "Utilities",
  TOOLS: "Tools & equipment",
  OFFICE: "Office & admin",
  OTHER: "Other",
};

export const UOMS = ["Nos", "Set", "Mtrs", "KW", "Kg", "Lot"];
