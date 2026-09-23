import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#18181b" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  brand: { fontSize: 18, fontWeight: 700, color: "#c2410c" },
  brandSub: { fontSize: 9, color: "#71717a", marginTop: 2 },
  docTitle: { fontSize: 14, fontWeight: 700, textAlign: "right" },
  docMeta: { fontSize: 9, color: "#71717a", textAlign: "right", marginTop: 2 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  infoBlock: { width: "48%" },
  infoLabel: { fontSize: 8, color: "#a1a1aa", textTransform: "uppercase", marginBottom: 3 },
  infoValue: { fontSize: 10, marginBottom: 1 },
  section: {
    marginBottom: 14,
    padding: 8,
    backgroundColor: "#fafafa",
    borderRadius: 3,
  },
  sectionLabel: { fontSize: 8, color: "#a1a1aa", textTransform: "uppercase", marginBottom: 3 },
  estimateBox: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1px solid #18181b",
    paddingTop: 8,
  },
  estimateLabel: { fontSize: 12, fontWeight: 700 },
  estimateValue: { fontSize: 12, fontWeight: 700 },
  disclaimer: { marginTop: 10, fontSize: 8, color: "#a1a1aa" },
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

export interface AcknowledgementData {
  jobCardNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  vehicleLabel: string;
  regNumber: string;
  odometer?: number | null;
  complaints: string;
  notes?: string | null;
  estimatedAmount?: number | null;
}

export default function AcknowledgementDocument({ data }: { data: AcknowledgementData }) {
  return (
    <Document title={`Job Card Acknowledgement ${data.jobCardNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Sparks Racing & Garage</Text>
            <Text style={styles.brandSub}>Motorcycle Sales, Service & Spares</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>JOB CARD RECEIVED</Text>
            <Text style={styles.docMeta}>#{data.jobCardNumber}</Text>
            <Text style={styles.docMeta}>{data.date}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValue}>{data.customerName}</Text>
            <Text style={styles.infoValue}>{data.customerPhone}</Text>
          </View>
          <View style={[styles.infoBlock, { alignItems: "flex-end" }]}>
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>{data.vehicleLabel}</Text>
            <Text style={styles.infoValue}>Reg: {data.regNumber}</Text>
            {data.odometer != null && <Text style={styles.infoValue}>Odometer: {data.odometer} km</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Reported Complaint</Text>
          <Text>{data.complaints}</Text>
        </View>

        {data.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Service Notes</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        {data.estimatedAmount != null && (
          <View style={styles.estimateBox}>
            <Text style={styles.estimateLabel}>Estimated Cost</Text>
            <Text style={styles.estimateValue}>
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
                data.estimatedAmount
              )}
            </Text>
          </View>
        )}

        <Text style={styles.disclaimer}>
          This is an acknowledgement that your vehicle has been received for service. The estimate
          above is approximate — the final billed amount may vary based on the actual work and
          parts required, and will be confirmed before final billing.
        </Text>

        <Text style={styles.footer}>Thank you for choosing Sparks Racing & Garage.</Text>
      </Page>
    </Document>
  );
}
