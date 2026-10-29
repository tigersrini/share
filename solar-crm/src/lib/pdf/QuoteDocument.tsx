/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image is not an HTML <img> and has no alt prop */
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { HERO_JPG, LOGO_PNG, WORDMARK_PNG } from "./assets";
import type { MakeRow, PaymentTermRow, Settings } from "../settings";
import type { CalcResult } from "../solar";

// Keep words whole (the default hyphenation produces things like "Equiva-lent").
Font.registerHyphenationCallback((word) => [word]);

const GREEN = "#3F7D3A";
const SUN = "#F4A261";
const INK = "#1b2217";
const MUTED = "#5f6b58";

const n = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const num = (v: number) => n.format(Math.round(v));

export interface QuotePdfData {
  number: string;
  /** dd.mm.yyyy */
  date: string;
  customerName: string;
  customerAddress: string;
  title: string;
  systemKw: number;
  systemType: string;
  company: Settings["company"];
  bank: Settings["bank"];
  lines: { description: string; uom: string; qty: string }[];
  makes: MakeRow[];
  scopeText: string;
  total: number;
  subsidyCentral: number;
  subsidyState: number;
  net: number;
  paymentTerms: PaymentTermRow[];
  warranty: string;
  performanceRatio: string;
  timeline: string;
  otherTerms: string;
  validityDays: number;
  subsidyDocs: string[];
  savings: (CalcResult & { tariff: number; monthlyUnits: number }) | null;
}

const s = StyleSheet.create({
  page: { paddingTop: 92, paddingBottom: 70, paddingHorizontal: 40, fontSize: 10, fontFamily: "Helvetica", color: INK, lineHeight: 1.35 },
  header: { position: "absolute", top: 22, left: 40, right: 40, flexDirection: "row", alignItems: "center" },
  headerLogo: { width: 46, height: 38, marginRight: 10 },
  headerWord: { width: 300, height: 34 },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, textAlign: "center", color: GREEN, fontSize: 7.5, letterSpacing: 1, borderTop: `1pt solid ${SUN}`, paddingTop: 6 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GREEN, marginTop: 14, marginBottom: 6, letterSpacing: 0.3 },
  p: { marginBottom: 6 },
  bold: { fontFamily: "Helvetica-Bold" },
  // tables
  table: { borderTop: "0.75pt solid #222", borderLeft: "0.75pt solid #222" },
  tr: { flexDirection: "row" },
  th: { borderRight: "0.75pt solid #222", borderBottom: "0.75pt solid #222", padding: 4, fontFamily: "Helvetica-Bold", textAlign: "center" },
  td: { borderRight: "0.75pt solid #222", borderBottom: "0.75pt solid #222", padding: 4 },
  center: { textAlign: "center" },
  right: { textAlign: "right" },
  bullet: { flexDirection: "row", marginBottom: 4 },
  bulletDot: { width: 12, color: GREEN, fontFamily: "Helvetica-Bold" },
  // cover
  coverTop: { flexDirection: "row", height: 250 },
  coverLogoCol: { width: "56%", paddingTop: 26, paddingLeft: 36, paddingRight: 12 },
  coverOrange: { width: "44%", backgroundColor: SUN, padding: 22, justifyContent: "flex-start" },
  coverOfferLine: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: "#1b1b1b", marginBottom: 8 },
  coverTitleBand: { backgroundColor: SUN, paddingVertical: 20, paddingHorizontal: 36, position: "absolute", bottom: 0, left: 0, right: 0 },
  coverTitle: { fontFamily: "Helvetica-Bold", fontSize: 14, color: "#fff", letterSpacing: 0.4 },
});

function Header() {
  return (
    <View style={s.header} fixed>
      <Image src={LOGO_PNG} style={s.headerLogo} />
      <Image src={WORDMARK_PNG} style={s.headerWord} />
    </View>
  );
}

function Footer({ c }: { c: Settings["company"] }) {
  return (
    <View style={s.footer} fixed>
      <Text>{c.address.toUpperCase()}</Text>
      <Text style={{ marginTop: 2 }}>
        {c.phone}, {c.website}, {c.email}
      </Text>
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.bullet} wrap={false}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}

const SCOPE = [
  ["1. Permits and Licensing", ["Load Flow Processes", "Facilitation of DISCOM Approval", "Facilitation of Power Evacuation Approval", "Exemption Certificates (if any)", "Facilitation of CIEG Clearances", "Other required approvals"]],
  ["2. Feasibility", ["Site Selection", "Solar Resources & Geotechnical", "Grid Connection Availability"]],
  ["3. Construction", ["Site Preparation", "Power Plant construction"]],
] as const;

export default function QuoteDocument({ d }: { d: QuotePdfData }) {
  const sub = d.subsidyCentral + d.subsidyState;
  const subsidyText = [d.subsidyCentral ? `Rs. ${num(d.subsidyCentral)}` : null, d.subsidyState ? `Rs. ${num(d.subsidyState)}` : null].filter(Boolean).join(" and ");
  const docs = d.subsidyDocs.filter(Boolean);

  return (
    <Document title={`Proposal ${d.number}`} author={d.company.name}>
      {/* ───── Cover ───── */}
      <Page size="A4" style={{ padding: 0, fontFamily: "Helvetica" }}>
        <View style={s.coverTop}>
          <View style={s.coverLogoCol}>
            <Image src={LOGO_PNG} style={{ width: 150, height: 124 }} />
            <Image src={WORDMARK_PNG} style={{ width: 240, height: 27, marginTop: 8 }} />
          </View>
          <View style={s.coverOrange}>
            <Text style={s.coverOfferLine}>Offer No: {d.number}</Text>
            <Text style={s.coverOfferLine}>Date: {d.date}</Text>
            <Text style={[s.coverOfferLine, { marginTop: 14 }]}>{d.customerName},</Text>
            {d.customerAddress.split("\n").map((l, i) => (
              <Text key={i} style={s.coverOfferLine}>
                {l}
              </Text>
            ))}
          </View>
        </View>
        <Image src={HERO_JPG} style={{ width: "100%", height: 470, objectFit: "cover" }} />
        <View style={s.coverTitleBand}>
          <Text style={s.coverTitle}>{d.title}</Text>
        </View>
      </Page>

      {/* ───── Letter, scope ───── */}
      <Page size="A4" style={s.page}>
        <Header />
        <Footer c={d.company} />
        <Text style={s.p}>Dear Sir / Madam,</Text>
        <Text style={s.p}>We would like to thank you for giving us an opportunity to quote for this prestigious project.</Text>
        <Text style={s.p}>
          We appreciate your decision to look into solar energy as a sustainable and cost-effective source of green power. We would be delighted to serve you with our fullest commitment.
        </Text>
        <Text style={s.p}>With reference to our discussion, we are pleased to submit our detailed Techno Commercial offer for your kind perusal.</Text>
        <Text style={s.p}>
          We hope our offer is competitive and assure you of our commitments towards better solar construction. We would be more than happy to provide further details based on your feedback.
        </Text>
        <Text style={s.p}>We look forward to receiving your valuable order for the same.</Text>
        <Text style={{ marginTop: 6 }}>Thanks & Regards</Text>
        <Text style={s.bold}>{d.company.signatory}</Text>
        <View style={{ marginTop: 14 }}>
          <Text style={[s.bold, { color: GREEN }]}>{d.company.name}</Text>
          <Text>{d.company.tagline}</Text>
          <Text>{d.company.address}</Text>
          <Text>Mob: {d.company.phone}</Text>
          <Text>
            Email: {d.company.email} | URL: {d.company.website}
          </Text>
        </View>

        <Text style={[s.h2, { fontSize: 13, marginTop: 22 }]}>WHAT WE DO?</Text>
        <Text style={[s.bold, { marginBottom: 4 }]}>A. EPC:</Text>
        <Text style={s.p}>
          Design, engineering, procurement, supply, installation, testing and commissioning of this fully operational Photovoltaic (PV) system to be installed
        </Text>
        {SCOPE.map(([title, items]) => (
          <View key={title} wrap={false} style={{ marginBottom: 5 }}>
            <Text style={s.bold}>{title}</Text>
            {items.map((it, i) => (
              <Text key={it} style={{ marginLeft: 16 }}>
                {String.fromCharCode(97 + i)}. {it}
              </Text>
            ))}
          </View>
        ))}
        <View wrap={false} style={{ marginBottom: 5 }}>
          <Text style={s.bold}>4. Design, Engineering & Supply:</Text>
          <Text style={{ marginLeft: 16 }}>The products of the proposed Solar Power plant include</Text>
          <Text style={{ marginLeft: 28 }}>
            Solar PV modules · Array Junction Box · Combiner Box · Solar On Grid / Hybrid Inverter · ACDB · Lightning arrestors · AC Cables & DC Cables · Earthing System
          </Text>
        </View>
        <View wrap={false}>
          <Text style={s.bold}>5. Installation, Testing and Commissioning:</Text>
          <Text style={{ marginLeft: 16 }}>This includes Installation, Testing and Commissioning of above-mentioned items.</Text>
        </View>
      </Page>

      {/* ───── BOM, makes, commercial ───── */}
      <Page size="A4" style={s.page}>
        <Header />
        <Footer c={d.company} />
        <Text style={[s.h2, { marginTop: 0 }]}>BILL OF MATERIALS-{d.systemKw.toFixed(2)} KW:</Text>
        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.th, { width: 40 }]}>Sl. No:</Text>
            <Text style={[s.th, { flex: 1 }]}>Particulars</Text>
            <Text style={[s.th, { width: 50 }]}>UOM</Text>
            <Text style={[s.th, { width: 44 }]}>QTY</Text>
          </View>
          {d.lines.map((l, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.td, s.center, { width: 40 }]}>{i + 1}</Text>
              <Text style={[s.td, { flex: 1 }]}>{l.description}</Text>
              <Text style={[s.td, s.center, { width: 50 }]}>{l.uom}</Text>
              <Text style={[s.td, s.center, { width: 44 }]}>{l.qty}</Text>
            </View>
          ))}
        </View>

        {d.makes.length > 0 && (
          <View wrap={false}>
            <Text style={s.h2}>MAKES OF ITEMS:</Text>
            <View style={s.table}>
              <View style={s.tr}>
                <Text style={[s.th, { width: 40 }]}>Sl. No</Text>
                <Text style={[s.th, { width: 140 }]}>Particulars</Text>
                <Text style={[s.th, { flex: 1 }]}>Makes</Text>
              </View>
              {d.makes.map((m, i) => (
                <View key={i} style={s.tr}>
                  <Text style={[s.td, s.center, { width: 40 }]}>{i + 1}</Text>
                  <Text style={[s.td, s.center, { width: 140 }]}>{m.item}</Text>
                  <Text style={[s.td, s.center, { flex: 1 }]}>{m.makes}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View wrap={false}>
          <Text style={s.h2}>COMMERCIAL PROPOSALS:</Text>
          <Text style={[s.bold, { marginBottom: 6 }]}>
            The cost of {d.systemKw} kW {d.systemType}
            {sub > 0 ? " (Subsidy)" : ""} Solar PV Power Plant is given below:
          </Text>
          <View style={s.table}>
            <View style={s.tr}>
              <Text style={[s.th, { width: 40 }]}>Sl. No:</Text>
              <Text style={[s.th, { flex: 1 }]}>Particulars</Text>
              <Text style={[s.th, { width: 110 }]}>Total Amount (INR)</Text>
            </View>
            <View style={s.tr}>
              <Text style={[s.td, { width: 40 }]}> </Text>
              <Text style={[s.td, { flex: 1 }]}>{d.scopeText}</Text>
              <Text style={[s.td, s.center, { width: 110, paddingTop: 12 }]}>{num(d.total)}</Text>
            </View>
            {sub > 0 && (
              <>
                <View style={s.tr}>
                  <Text style={[s.td, { width: 40 }]}> </Text>
                  <Text style={[s.td, { flex: 1 }]}>Govt. Subsidy {d.subsidyCentral && d.subsidyState ? "(Central & State)" : d.subsidyCentral ? "(Central)" : "(State)"}</Text>
                  <Text style={[s.td, s.center, { width: 110 }]}>{num(sub)}</Text>
                </View>
                <View style={s.tr}>
                  <Text style={[s.td, { width: 40 }]}> </Text>
                  <Text style={[s.td, s.bold, { flex: 1 }]}>Final Plant Cost after Subsidy</Text>
                  <Text style={[s.td, s.center, s.bold, { width: 110 }]}>{num(d.net)}</Text>
                </View>
              </>
            )}
          </View>
          <View style={{ marginTop: 10 }}>
            <Bullet>
              <Text style={s.bold}>Net total amount to be paid to us.</Text>
            </Bullet>
            {sub > 0 && (
              <Bullet>
                <Text style={s.bold}>
                  Govt. Subsidy of {subsidyText} shall be credited to your bank account directly after obtaining necessary approvals from TNEB and related authorities.
                </Text>
              </Bullet>
            )}
          </View>
        </View>

        {sub > 0 && docs.length > 0 && (
          <View wrap={false}>
            <Text style={[s.h2, { color: GREEN }]}>DOCUMENTS REQUIRED FOR APPLYING SOLAR SUBSIDY:</Text>
            {docs.map((x, i) => (
              <Text key={i} style={{ marginLeft: 18, marginBottom: 2 }}>
                {i + 1}. {x}
              </Text>
            ))}
          </View>
        )}

        <Text style={s.h2}>TERMS & CONDITIONS:</Text>
        <View style={s.table}>
          <TermRow label="Payment Terms:">
            {d.paymentTerms.map((t, i) => (
              <Bullet key={i}>
                {t.percent}% {t.label}
              </Bullet>
            ))}
            <Bullet>Net Meter Payment and EB-related Costs under your scope.</Bullet>
          </TermRow>
          <TermRow label="Approvals:">
            <Bullet>(Necessary assistance will be provided)</Bullet>
          </TermRow>
          <TermRow label="Validity">
            <Bullet>{d.validityDays} days from the date of offer.</Bullet>
          </TermRow>
          {d.warranty ? (
            <TermRow label="Warranty">
              <Bullet>{d.warranty}</Bullet>
            </TermRow>
          ) : null}
          {d.performanceRatio ? (
            <TermRow label="Performance Ratio">
              <Bullet>{d.performanceRatio}</Bullet>
            </TermRow>
          ) : null}
          {d.timeline ? (
            <TermRow label="Project Timeline">
              <Bullet>{d.timeline}</Bullet>
            </TermRow>
          ) : null}
          {d.otherTerms ? (
            <TermRow label="Other activities">
              <Bullet>{d.otherTerms}</Bullet>
            </TermRow>
          ) : null}
        </View>

        <View wrap={false}>
          <Text style={[s.h2, { color: GREEN }]}>OUR BANKING DETAILS</Text>
          <View style={s.table}>
            {(
              [
                ["BANK", d.bank.name.toUpperCase()],
                ["BRANCH", d.bank.branch.toUpperCase()],
                ["IFSC CODE", d.bank.ifsc],
                ["ACCOUNT NO", d.bank.accountNo],
                ["BENEFICIARY", d.bank.beneficiary.toUpperCase()],
              ] as const
            ).map(([k, v]) => (
              <View key={k} style={s.tr}>
                <Text style={[s.td, s.bold, { width: 120 }]}>{k}</Text>
                <Text style={[s.td, s.center, { flex: 1 }]}>{v}</Text>
              </View>
            ))}
          </View>
          <Text style={{ marginTop: 14, fontFamily: "Helvetica-Bold" }}>We look forward to receiving your valuable order</Text>
        </View>
      </Page>

      {/* ───── Optional savings page ───── */}
      {d.savings && d.savings.systemKw > 0 && (
        <Page size="A4" style={s.page}>
          <Header />
          <Footer c={d.company} />
          <Text style={[s.h2, { marginTop: 0, fontSize: 13 }]}>YOUR SOLAR SAVINGS (ESTIMATE)</Text>
          <Text style={[s.p, { color: MUTED }]}>
            Based on your average usage of {num(d.savings.monthlyUnits)} units per month and an average tariff of Rs. {d.savings.tariff.toFixed(2)} per unit.
          </Text>
          <View style={s.table}>
            {(
              [
                ["Recommended system", `${d.savings.systemKw} kW (${d.savings.panels} panels, ${d.savings.dcKw.toFixed(2)} kWp)`],
                ["Shadow-free roof area needed", `approx. ${num(d.savings.areaSqft)} sq ft`],
                ["Expected generation", `${num(d.savings.monthlyGeneration)} units / month · ${num(d.savings.annualGeneration)} units / year`],
                ["Share of your usage covered", `${Math.round(d.savings.coveragePct)}%`],
                ["Monthly bill: now / after solar", `Rs. ${num(d.savings.billBeforeMonthly)} to Rs. ${num(d.savings.billAfterMonthly)}`],
                ["Savings in year 1", `Rs. ${num(d.savings.savingsYear1)}`],
                ["Payback period (after subsidy)", d.savings.paybackYears === null ? "more than 25 years" : `${d.savings.paybackYears.toFixed(1)} years`],
                ["Estimated savings over 25 years", `Rs. ${num(d.savings.totalSavings25)}`],
                ["CO2 avoided", `${d.savings.co2TonnesPerYear.toFixed(1)} tonnes / year (equal to ${num(d.savings.treesEquivalent)} trees)`],
              ] as const
            ).map(([k, v]) => (
              <View key={k} style={s.tr} wrap={false}>
                <Text style={[s.td, s.bold, { width: 190 }]}>{k}</Text>
                <Text style={[s.td, { flex: 1 }]}>{v}</Text>
              </View>
            ))}
          </View>
          <Text style={{ marginTop: 10, fontSize: 8.5, color: MUTED }}>
            Estimates assume a small yearly drop in panel output and a modest yearly tariff increase. Actual generation depends on weather, shading and maintenance; figures are indicative and not a guarantee.
          </Text>
        </Page>
      )}
    </Document>
  );
}

function TermRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.tr} wrap={false}>
      <Text style={[s.td, s.bold, { width: 120 }]}>{label}</Text>
      <View style={[s.td, { flex: 1 }]}>{children}</View>
    </View>
  );
}
