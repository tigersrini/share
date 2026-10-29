/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image is not an HTML <img> and has no alt prop */
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { LOGO_PNG } from "./assets";
import type { Settings } from "../settings";
import type { InvoiceTotals } from "../gst";

Font.registerHyphenationCallback((word) => [word]);

const money = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const m = (v: number) => money.format(v);

export interface InvoicePdfData {
  number: string;
  date: string;
  company: Settings["company"];
  bank: Settings["bank"];
  intra: boolean;
  placeOfSupplyName: string;
  placeOfSupplyCode: string;
  buyerOrderNo: string | null;
  buyerOrderDate: string | null;
  paymentTerms: string | null;
  terms: string | null;
  billName: string;
  billAddress: string;
  billGstin: string | null;
  shipName: string | null;
  shipAddress: string | null;
  shipGstin: string | null;
  totals: InvoiceTotals;
  totalInWords: string;
  taxInWords: string;
  cancelled: boolean;
}

const B = "0.75pt solid #222";
const s = StyleSheet.create({
  page: { padding: 28, fontSize: 8.5, fontFamily: "Helvetica", color: "#111", lineHeight: 1.3 },
  title: { textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 13, paddingVertical: 4, border: B },
  row: { flexDirection: "row" },
  cell: { borderLeft: B, borderRight: B, borderBottom: B, padding: 4 },
  bold: { fontFamily: "Helvetica-Bold" },
  label: { fontSize: 7.5, color: "#444" },
  th: { fontFamily: "Helvetica-Bold", textAlign: "center", padding: 3, borderRight: B, borderBottom: B },
  td: { padding: 3, borderRight: B },
  right: { textAlign: "right" },
  center: { textAlign: "center" },
});

const COLS = { sl: 24, hsn: 48, qty: 56, rate: 56, per: 34, amt: 72 };

export default function InvoiceDocument({ d }: { d: InvoicePdfData }) {
  const t = d.totals;
  const shipName = d.shipName ?? d.billName;
  const shipAddress = d.shipAddress ?? d.billAddress;
  const shipGstin = d.shipName || d.shipAddress ? d.shipGstin : d.billGstin;

  return (
    <Document title={`Tax Invoice ${d.number}`} author={d.company.legalName}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>TAX Invoice{d.cancelled ? "  (CANCELLED)" : ""}</Text>

        {/* Seller + invoice meta */}
        <View style={s.row}>
          <View style={[s.cell, { width: "50%", flexDirection: "row" }]}>
            <Image src={LOGO_PNG} style={{ width: 44, height: 36, marginRight: 6 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.bold}>{d.company.legalName}</Text>
              <Text>{d.company.address}</Text>
              <Text style={[s.bold, { marginTop: 3 }]}>GSTIN/UIN: {d.company.gstin}</Text>
              <Text>State: {d.company.state}   Code: {d.company.stateCode}</Text>
              <Text>Contact: {d.company.phone}</Text>
              <Text>e-Mail : {d.company.email}</Text>
            </View>
          </View>
          <View style={{ width: "50%" }}>
            <View style={s.row}>
              <View style={[s.cell, { width: "50%", borderLeft: 0 }]}><Text style={s.label}>Invoice Number</Text><Text style={s.bold}>{d.number}</Text></View>
              <View style={[s.cell, { width: "50%", borderLeft: 0 }]}><Text style={s.label}>Invoice Date</Text><Text style={s.bold}>{d.date}</Text></View>
            </View>
            <View style={s.row}>
              <View style={[s.cell, { width: "50%", borderLeft: 0 }]}><Text style={s.label}>Buyer&apos;s Order No.</Text><Text>{d.buyerOrderNo ?? " "}</Text></View>
              <View style={[s.cell, { width: "50%", borderLeft: 0 }]}><Text style={s.label}>Dated</Text><Text>{d.buyerOrderDate ?? " "}</Text></View>
            </View>
            <View style={s.row}>
              <View style={[s.cell, { width: "100%", borderLeft: 0 }]}><Text style={s.label}>Place of Supply</Text><Text>{d.placeOfSupplyName} (Code: {d.placeOfSupplyCode})</Text></View>
            </View>
          </View>
        </View>

        {/* Consignee / buyer + terms */}
        <View style={s.row}>
          <View style={{ width: "50%" }}>
            <View style={[s.cell, { minHeight: 70 }]}>
              <Text style={s.label}>Consignee (Ship to)</Text>
              <Text style={s.bold}>{shipName}</Text>
              <Text>{shipAddress}</Text>
              {shipGstin ? <Text>GSTIN/UIN: {shipGstin}</Text> : null}
            </View>
            <View style={[s.cell, { minHeight: 70 }]}>
              <Text style={s.label}>Buyer (Bill to)</Text>
              <Text style={s.bold}>{d.billName}</Text>
              <Text>{d.billAddress}</Text>
              {d.billGstin ? <Text>GSTIN/UIN: {d.billGstin}</Text> : null}
            </View>
          </View>
          <View style={[s.cell, { width: "50%", borderLeft: 0 }]}>
            {d.paymentTerms ? (
              <>
                <Text style={s.bold}>Payment Terms</Text>
                <Text>{d.paymentTerms}</Text>
              </>
            ) : null}
            {d.terms ? (
              <>
                <Text style={[s.bold, { marginTop: 5 }]}>Terms & Conditions</Text>
                <Text>{d.terms}</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Items */}
        <View style={[s.row, { borderLeft: B, borderTop: 0 }]}>
          <Text style={[s.th, { width: COLS.sl }]}>Sl.{"\n"}No.</Text>
          <Text style={[s.th, { flex: 1 }]}>Description of Goods</Text>
          <Text style={[s.th, { width: COLS.hsn }]}>HSN/SAC</Text>
          <Text style={[s.th, { width: COLS.qty }]}>Quantity</Text>
          <Text style={[s.th, { width: COLS.rate }]}>Rate</Text>
          <Text style={[s.th, { width: COLS.per }]}>per</Text>
          <Text style={[s.th, { width: COLS.amt }]}>Amount</Text>
        </View>
        <View style={{ borderLeft: B, borderBottom: B }}>
          {t.lines.map((l, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={[s.td, s.center, { width: COLS.sl }]}>{i + 1}</Text>
              <Text style={[s.td, { flex: 1 }]}>{l.description}</Text>
              <Text style={[s.td, s.center, { width: COLS.hsn }]}>{l.hsn ?? ""}</Text>
              <Text style={[s.td, s.right, { width: COLS.qty }]}>{l.qty.toFixed(2)} {l.unit}</Text>
              <Text style={[s.td, s.right, { width: COLS.rate }]}>{m(l.rate)}</Text>
              <Text style={[s.td, s.center, { width: COLS.per }]}>{l.unit}</Text>
              <Text style={[s.td, s.right, s.bold, { width: COLS.amt }]}>{m(l.amount)}</Text>
            </View>
          ))}
          <View style={{ minHeight: 24 }} />
          {t.rateRows.map((r) =>
            d.intra ? (
              <View key={r.rate}>
                <TaxLine label={`Output CGST @${r.rate / 2}%`} rate={r.rate / 2} amount={r.cgst} />
                <TaxLine label={`Output SGST @${r.rate / 2}%`} rate={r.rate / 2} amount={r.sgst} />
              </View>
            ) : (
              <TaxLine key={r.rate} label={`Output IGST @${r.rate}%`} rate={r.rate} amount={r.igst} />
            ),
          )}
          {t.roundOff !== 0 && <TaxLine label="Round Off" amount={t.roundOff} />}
          <View style={[s.row, { borderTop: B }]}>
            <Text style={[s.td, s.bold, s.right, { flex: 1 }]}>Total</Text>
            <Text style={[s.td, s.bold, s.right, { width: COLS.amt + 70 }]}>INR {m(t.total)}</Text>
          </View>
        </View>

        <View style={[s.cell, { flexDirection: "row", justifyContent: "space-between" }]}>
          <View>
            <Text style={s.label}>Amount Chargeable (in words)</Text>
            <Text style={s.bold}>{d.totalInWords}</Text>
          </View>
          <Text style={{ fontSize: 7.5 }}>E. & O.E</Text>
        </View>

        {/* HSN summary */}
        <View wrap={false}>
          <View style={[s.row, { borderLeft: B }]}>
            <Text style={[s.th, { flex: 1 }]}>HSN/SAC</Text>
            <Text style={[s.th, { width: 70 }]}>Taxable Value</Text>
            {d.intra ? (
              <>
                <Text style={[s.th, { width: 100 }]}>CGST (Rate / Amount)</Text>
                <Text style={[s.th, { width: 100 }]}>SGST/UTGST (Rate / Amount)</Text>
              </>
            ) : (
              <Text style={[s.th, { width: 200 }]}>IGST (Rate / Amount)</Text>
            )}
            <Text style={[s.th, { width: 66 }]}>Total Tax Amount</Text>
          </View>
          {t.hsnRows.map((r, i) => (
            <View key={i} style={[s.row, { borderLeft: B, borderBottom: B }]}>
              <Text style={[s.td, { flex: 1 }]}>{r.hsn}</Text>
              <Text style={[s.td, s.right, { width: 70 }]}>{m(r.taxable)}</Text>
              {d.intra ? (
                <>
                  <Text style={[s.td, s.right, { width: 100 }]}>{r.rate / 2}%   {m(r.cgst)}</Text>
                  <Text style={[s.td, s.right, { width: 100 }]}>{r.rate / 2}%   {m(r.sgst)}</Text>
                </>
              ) : (
                <Text style={[s.td, s.right, { width: 200 }]}>{r.rate}%   {m(r.igst)}</Text>
              )}
              <Text style={[s.td, s.right, { width: 66 }]}>{m(r.tax)}</Text>
            </View>
          ))}
          <View style={[s.row, { borderLeft: B, borderBottom: B }]}>
            <Text style={[s.td, s.bold, s.right, { flex: 1 }]}>Total</Text>
            <Text style={[s.td, s.bold, s.right, { width: 70 }]}>{m(t.subtotal)}</Text>
            {d.intra ? (
              <>
                <Text style={[s.td, s.bold, s.right, { width: 100 }]}>{m(t.cgst)}</Text>
                <Text style={[s.td, s.bold, s.right, { width: 100 }]}>{m(t.sgst)}</Text>
              </>
            ) : (
              <Text style={[s.td, s.bold, s.right, { width: 200 }]}>{m(t.igst)}</Text>
            )}
            <Text style={[s.td, s.bold, s.right, { width: 66 }]}>{m(t.totalTax)}</Text>
          </View>
          <View style={[s.cell]}>
            <Text>
              <Text style={s.label}>Tax Amount (in words) : </Text>
              <Text style={s.bold}>{d.taxInWords}</Text>
            </Text>
          </View>
        </View>

        {/* Declaration / bank / signatures */}
        <View style={s.row} wrap={false}>
          <View style={[s.cell, { width: "50%" }]}>
            <Text style={[s.bold, { textDecoration: "underline" }]}>Declaration</Text>
            <Text>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</Text>
          </View>
          <View style={[s.cell, { width: "50%", borderLeft: 0 }]}>
            <Text style={[s.bold, { textDecoration: "underline" }]}>Bank Details</Text>
            <Text>Bank Name: {d.bank.name}</Text>
            <Text>Branch: {d.bank.branch}   IFSC Code: {d.bank.ifsc}</Text>
            <Text>Account No: {d.bank.accountNo}</Text>
            <Text>Beneficiary: {d.bank.beneficiary}</Text>
          </View>
        </View>
        <View style={s.row} wrap={false}>
          <View style={[s.cell, { width: "50%", minHeight: 62, justifyContent: "flex-end" }]}>
            <Text style={s.bold}>Customer&apos;s Seal and Signature</Text>
          </View>
          <View style={[s.cell, { width: "50%", borderLeft: 0, minHeight: 62, justifyContent: "space-between" }]}>
            <Text style={[s.bold, s.right]}>For {d.company.legalName.toUpperCase()}</Text>
            <Text style={[s.bold, s.right]}>Authorised Signatory</Text>
          </View>
        </View>
        <Text style={{ textAlign: "center", marginTop: 6, fontSize: 7.5, color: "#555" }}>This is a computer generated invoice.</Text>
      </Page>
    </Document>
  );
}

function TaxLine({ label, rate, amount }: { label: string; rate?: number; amount: number }) {
  return (
    <View style={s.row}>
      <Text style={[s.td, s.bold, s.right, { flex: 1, fontFamily: "Helvetica-BoldOblique" }]}>{label}</Text>
      <Text style={[s.td, s.right, { width: COLS.hsn + COLS.qty + COLS.rate - 56 }]}> </Text>
      <Text style={[s.td, s.right, { width: 56 }]}>{rate !== undefined ? rate : ""}</Text>
      <Text style={[s.td, s.center, { width: COLS.per }]}>{rate !== undefined ? "%" : ""}</Text>
      <Text style={[s.td, s.right, s.bold, { width: COLS.amt }]}>{m(amount)}</Text>
    </View>
  );
}
