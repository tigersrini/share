import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatINR } from "@/lib/format";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#18181b" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  brand: { fontSize: 18, fontWeight: 700, color: "#c2410c" },
  brandSub: { fontSize: 9, color: "#71717a", marginTop: 2 },
  invoiceTitle: { fontSize: 14, fontWeight: 700, textAlign: "right" },
  invoiceMeta: { fontSize: 9, color: "#71717a", textAlign: "right", marginTop: 2 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  infoBlock: { width: "48%" },
  infoLabel: { fontSize: 8, color: "#a1a1aa", textTransform: "uppercase", marginBottom: 3 },
  infoValue: { fontSize: 10, marginBottom: 1 },
  complaint: {
    marginBottom: 14,
    padding: 8,
    backgroundColor: "#fafafa",
    borderRadius: 3,
  },
  complaintLabel: { fontSize: 8, color: "#a1a1aa", textTransform: "uppercase", marginBottom: 3 },
  table: { marginTop: 4, borderTop: "1px solid #e4e4e7" },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e4e4e7",
    paddingVertical: 6,
    backgroundColor: "#fafafa",
  },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #f4f4f5", paddingVertical: 6 },
  colItem: { width: "46%", paddingHorizontal: 4 },
  colQty: { width: "12%", paddingHorizontal: 4, textAlign: "right" },
  colPrice: { width: "20%", paddingHorizontal: 4, textAlign: "right" },
  colAmount: { width: "22%", paddingHorizontal: 4, textAlign: "right" },
  thText: { fontSize: 8, color: "#71717a", textTransform: "uppercase", fontWeight: 700 },
  totalsBlock: { marginTop: 14, alignSelf: "flex-end", width: "45%" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalsLabel: { color: "#71717a" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1px solid #18181b",
    marginTop: 4,
    paddingTop: 6,
  },
  grandTotalLabel: { fontSize: 12, fontWeight: 700 },
  grandTotalValue: { fontSize: 12, fontWeight: 700 },
  footer: {
    position: "absolute",
    bottom: 36,
    left: 36,
    right: 36,
    textAlign: "center",
    fontSize: 8,
    color: "#a1a1aa",
    borderTop: "1px solid #e4e4e7",
    paddingTop: 10,
  },
});

export interface InvoiceLine {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
  isLabor?: boolean;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  vehicleLabel: string;
  regNumber: string;
  odometer?: number | null;
  complaints: string;
  lines: InvoiceLine[];
  partsTotal: number;
  laborTotal: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
}

export default function InvoiceDocument({ data }: { data: InvoiceData }) {
  return (
    <Document title={`Invoice ${data.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Sparks Racing & Garage</Text>
            <Text style={styles.brandSub}>Motorcycle Sales, Service & Spares</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMeta}>#{data.invoiceNumber}</Text>
            <Text style={styles.invoiceMeta}>{data.invoiceDate}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Billed To</Text>
            <Text style={styles.infoValue}>{data.customerName}</Text>
            <Text style={styles.infoValue}>{data.customerPhone}</Text>
            {data.customerAddress && <Text style={styles.infoValue}>{data.customerAddress}</Text>}
          </View>
          <View style={[styles.infoBlock, { alignItems: "flex-end" }]}>
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>{data.vehicleLabel}</Text>
            <Text style={styles.infoValue}>Reg: {data.regNumber}</Text>
            {data.odometer != null && <Text style={styles.infoValue}>Odometer: {data.odometer} km</Text>}
          </View>
        </View>

        <View style={styles.complaint}>
          <Text style={styles.complaintLabel}>Reported Complaint</Text>
          <Text>{data.complaints}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colItem, styles.thText]}>Item</Text>
            <Text style={[styles.colQty, styles.thText]}>Qty</Text>
            <Text style={[styles.colPrice, styles.thText]}>Price</Text>
            <Text style={[styles.colAmount, styles.thText]}>Amount</Text>
          </View>
          {data.lines.map((line, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colItem}>
                {line.description}
                {line.isLabor ? " (labor)" : ""}
              </Text>
              <Text style={styles.colQty}>{line.qty}</Text>
              <Text style={styles.colPrice}>{formatINR(line.unitPrice)}</Text>
              <Text style={styles.colAmount}>{formatINR(line.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Parts total</Text>
            <Text>{formatINR(data.partsTotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Labor total</Text>
            <Text>{formatINR(data.laborTotal)}</Text>
          </View>
          {data.discount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text>-{formatINR(data.discount)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>{formatINR(data.grandTotal)}</Text>
          </View>
          {data.taxAmount > 0 && (
            <Text style={{ fontSize: 8, color: "#a1a1aa", marginTop: 4, textAlign: "right" }}>
              Price is MRP, inclusive of GST @{data.taxPercent}% ({formatINR(data.taxAmount)})
            </Text>
          )}
        </View>

        <Text style={styles.footer}>
          Thank you for servicing with Sparks Racing & Garage. This is a computer-generated invoice.
          {"\n"}All prices are MRP, inclusive of applicable taxes.
        </Text>
      </Page>
    </Document>
  );
}
