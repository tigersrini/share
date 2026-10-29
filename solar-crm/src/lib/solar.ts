import type { Settings } from "./settings";

export interface CalcInput {
  /** Average monthly consumption in units (kWh) */
  monthlyUnits: number;
  /** ₹ per unit */
  tariff: number;
  /** % of consumption the plant should offset (typically 80–100) */
  offsetPct: number;
  yieldPerKwDay: number;
  panelWp: number;
  areaPerKwSqft: number;
  costPerKw: number;
  escalationPct: number;
  degradationPct: number;
  co2PerUnit: number;
  /** Residential customers are eligible for PM Surya Ghar subsidy */
  subsidyEligible: boolean;
  /** Choose the system size yourself instead of using the recommendation */
  kwOverride?: number | null;
  /** Override the computed gross cost */
  grossCostOverride?: number | null;
}

export interface YearRow {
  year: number;
  generation: number;
  savings: number;
  cumulative: number;
}

export interface CalcResult {
  requiredKw: number;
  /** Nominal system size used for pricing & subsidy */
  systemKw: number;
  panels: number;
  /** Actual DC capacity = panels × Wp */
  dcKw: number;
  monthlyGeneration: number;
  annualGeneration: number;
  areaSqft: number;
  grossCost: number;
  subsidyCentral: number;
  subsidyState: number;
  netCost: number;
  billBeforeMonthly: number;
  billAfterMonthly: number;
  savingsYear1: number;
  paybackYears: number | null;
  /** payback computed on the gross cost (no subsidy) */
  paybackYearsNoSubsidy: number | null;
  totalSavings25: number;
  netGain25: number;
  roiPct: number;
  co2TonnesPerYear: number;
  treesEquivalent: number;
  coveragePct: number;
  generationExceedsUse: boolean;
  years: YearRow[];
}

export function subsidyFor(kw: number, s: Settings["subsidy"]): { central: number; state: number } {
  if (kw <= 0) return { central: 0, state: 0 };
  const first = Math.min(kw, 2) * s.centralFirst2PerKw;
  const third = kw > 2 ? Math.min(kw - 2, 1) * s.central3rdKw : 0;
  const central = Math.min(Math.round(first + third), s.centralCap);
  const state = kw >= s.stateMinKw && central > 0 ? s.stateAmount : 0;
  return { central, state };
}

export function defaultInput(settings: Settings): CalcInput {
  return {
    monthlyUnits: 0,
    tariff: settings.solar.tariff,
    offsetPct: 100,
    yieldPerKwDay: settings.solar.yieldPerKwDay,
    panelWp: settings.solar.panelWp,
    areaPerKwSqft: settings.solar.areaPerKwSqft,
    costPerKw: settings.solar.costPerKw,
    escalationPct: settings.solar.tariffEscalationPct,
    degradationPct: settings.solar.degradationPct,
    co2PerUnit: settings.solar.co2PerUnit,
    subsidyEligible: true,
    kwOverride: null,
    grossCostOverride: null,
  };
}

export const YEARS = 25;
const KG_CO2_PER_TREE_YEAR = 21;

export function calculateSolar(inp: CalcInput, subsidy: Settings["subsidy"]): CalcResult {
  const units = Math.max(0, inp.monthlyUnits);
  const yieldDay = Math.max(0.1, inp.yieldPerKwDay);
  const requiredKw = (units * (inp.offsetPct / 100)) / (yieldDay * 30);

  // Installers sell in whole/half-kW sizes; never recommend below 1 kW.
  const recommended = units > 0 ? Math.max(1, Math.ceil(requiredKw * 2) / 2) : 0;
  const systemKw = inp.kwOverride && inp.kwOverride > 0 ? inp.kwOverride : recommended;
  const panelKw = Math.max(0.1, inp.panelWp) / 1000;
  const panels = systemKw > 0 ? Math.ceil(systemKw / panelKw - 1e-9) : 0;
  const dcKw = panels * panelKw;

  const annualGeneration = dcKw * yieldDay * 365;
  const monthlyGeneration = annualGeneration / 12;
  const areaSqft = systemKw * inp.areaPerKwSqft;

  const grossCost = inp.grossCostOverride && inp.grossCostOverride > 0 ? inp.grossCostOverride : Math.round(systemKw * inp.costPerKw);
  const sub = inp.subsidyEligible ? subsidyFor(systemKw, subsidy) : { central: 0, state: 0 };
  const netCost = Math.max(0, grossCost - sub.central - sub.state);

  const annualUse = units * 12;
  const years: YearRow[] = [];
  let cumulative = 0;
  for (let y = 1; y <= YEARS; y++) {
    const gen = annualGeneration * Math.pow(1 - inp.degradationPct / 100, y - 1);
    const usable = Math.min(gen, annualUse); // exports beyond own consumption are not valued
    const savings = usable * inp.tariff * Math.pow(1 + inp.escalationPct / 100, y - 1);
    cumulative += savings;
    years.push({ year: y, generation: gen, savings, cumulative });
  }
  const savingsYear1 = years[0]?.savings ?? 0;

  const payback = (cost: number): number | null => {
    if (cost <= 0) return 0;
    let prev = 0;
    for (const r of years) {
      if (r.cumulative >= cost) return r.year - 1 + (cost - prev) / (r.cumulative - prev);
      prev = r.cumulative;
    }
    return null;
  };

  const totalSavings25 = cumulative;
  const co2Kg = Math.min(annualGeneration, annualUse || annualGeneration) * inp.co2PerUnit;
  const billBefore = units * inp.tariff;
  const usedMonthly = Math.min(monthlyGeneration, units);

  return {
    requiredKw,
    systemKw,
    panels,
    dcKw,
    monthlyGeneration,
    annualGeneration,
    areaSqft,
    grossCost,
    subsidyCentral: sub.central,
    subsidyState: sub.state,
    netCost,
    billBeforeMonthly: billBefore,
    billAfterMonthly: Math.max(0, (units - usedMonthly) * inp.tariff),
    savingsYear1,
    paybackYears: payback(netCost),
    paybackYearsNoSubsidy: payback(grossCost),
    totalSavings25,
    netGain25: totalSavings25 - netCost,
    roiPct: netCost > 0 ? (savingsYear1 / netCost) * 100 : 0,
    co2TonnesPerYear: co2Kg / 1000,
    treesEquivalent: Math.round(co2Kg / KG_CO2_PER_TREE_YEAR),
    coveragePct: annualUse > 0 ? Math.min(100, (annualGeneration / annualUse) * 100) : 0,
    generationExceedsUse: annualUse > 0 && annualGeneration > annualUse * 1.1,
    years,
  };
}

/** Converts a monthly bill in ₹ to approximate units, using the flat average tariff. */
export function unitsFromBill(bill: number, tariff: number): number {
  return tariff > 0 ? Math.round(bill / tariff) : 0;
}
