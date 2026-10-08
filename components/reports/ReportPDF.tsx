import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import { calculateInvoiceTotals } from "@/lib/invoice-calculations"
import type { Invoice, WorkLogItem } from "@/app/generated/prisma/client"
import type { PdfT } from "@/lib/pdf-i18n"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#666666",
    marginBottom: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    marginVertical: 12,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#999999",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eeeeee",
  },
  totalRow: {
    flexDirection: "row",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#333333",
    marginTop: 2,
  },
  colNumber: { width: "16%" },
  colClient: { width: "26%" },
  colDate: { width: "16%" },
  colStatus: { width: "14%" },
  colAmount: { width: "14%", textAlign: "right" },
  colVat: { width: "14%", textAlign: "right" },
  bold: { fontWeight: "bold" },
  footer: {
    marginTop: 20,
    fontSize: 8,
    color: "#999999",
  },
})

/**
 * Printable summary of issued invoices for a period. Texts come from
 * the `t` / `tStatus` translators and dates/numbers are formatted
 * with `dateLocale`, all prepared by getPdfI18n() in the route.
 */
export function ReportPDF({
  invoices,
  periodLabel,
  generatedAt,
  t,
  tStatus,
  dateLocale,
}: {
  invoices: (Invoice & { lineItems: WorkLogItem[] })[]
  periodLabel: string
  generatedAt: Date
  t: PdfT
  tStatus: PdfT
  dateLocale: string
}) {
  const fmtInt = (n: number) =>
    n.toLocaleString(dateLocale, { maximumFractionDigits: 0 })

  const rows = invoices.map((invoice) => {
    const { grandTotal, vatAmount } = calculateInvoiceTotals({
      billingType: invoice.billingType,
      fixedPrice: invoice.fixedPrice ? Number(invoice.fixedPrice) : null,
      lineItems: invoice.lineItems,
      mvaRegisteredFrom: invoice.mvaRegisteredFrom,
      invoiceDate: invoice.invoiceDate,
    })
    return { invoice, grandTotal, vatAmount }
  })

  const totalAmount = rows.reduce((sum, r) => sum + r.grandTotal, 0)
  const totalVat = rows.reduce((sum, r) => sum + r.vatAmount, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{t("title")}</Text>
        <Text style={styles.subtitle}>
          {t("period")}: {periodLabel} — {t("generated")}:{" "}
          {generatedAt.toLocaleDateString(dateLocale)}{" "}
          {generatedAt.toLocaleTimeString(dateLocale)}
        </Text>

        <View style={styles.divider} />

        <View style={styles.tableHeaderRow}>
          <Text style={[styles.colNumber, styles.bold]}>{t("colNumber")}</Text>
          <Text style={[styles.colClient, styles.bold]}>{t("colClient")}</Text>
          <Text style={[styles.colDate, styles.bold]}>{t("colDate")}</Text>
          <Text style={[styles.colStatus, styles.bold]}>{t("colStatus")}</Text>
          <Text style={[styles.colAmount, styles.bold]}>{t("colAmount")}</Text>
          <Text style={[styles.colVat, styles.bold]}>{t("colVat")}</Text>
        </View>

        {rows.length === 0 ? (
          <Text style={{ marginTop: 8, color: "#666666" }}>
            {t("noInvoices")}
          </Text>
        ) : (
          rows.map(({ invoice, grandTotal, vatAmount }) => (
            <View style={styles.tableRow} key={invoice.id}>
              <Text style={styles.colNumber}>{invoice.invoiceNumber}</Text>
              <Text style={styles.colClient}>{invoice.clientName}</Text>
              <Text style={styles.colDate}>
                {new Date(invoice.invoiceDate).toLocaleDateString(dateLocale)}
              </Text>
              <Text style={styles.colStatus}>{tStatus(invoice.status)}</Text>
              <Text style={styles.colAmount}>{fmtInt(grandTotal)}</Text>
              <Text style={styles.colVat}>{fmtInt(vatAmount)}</Text>
            </View>
          ))
        )}

        {rows.length > 0 && (
          <View style={styles.totalRow}>
            <Text style={[styles.colNumber, styles.bold]}>{t("total")}</Text>
            <Text style={styles.colClient}></Text>
            <Text style={styles.colDate}></Text>
            <Text style={styles.colStatus}></Text>
            <Text style={[styles.colAmount, styles.bold]}>
              {fmtInt(totalAmount)}
            </Text>
            <Text style={[styles.colVat, styles.bold]}>{fmtInt(totalVat)}</Text>
          </View>
        )}

        <Text style={styles.footer}>{t("footer")}</Text>
      </Page>
    </Document>
  )
}