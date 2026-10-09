import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import { calculateInvoiceTotals } from "@/lib/invoice-calculations"
import type { Invoice, WorkLogItem } from "@/app/generated/prisma/client"
import type { PdfT } from "@/lib/pdf-i18n"
import { pdfColors as c } from "@/lib/pdf-theme"

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 40,
    paddingBottom: 64,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: c.ink,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  brand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    letterSpacing: 2,
    color: c.dark,
    textTransform: "uppercase",
    maxWidth: "55%",
  },
  headerInfo: {
    alignItems: "flex-end",
    fontSize: 9,
    color: c.muted,
  },
  headerLine: {
    marginBottom: 2,
  },

  title: {
    fontFamily: "Times-Bold",
    fontSize: 30,
    color: c.dark,
    marginTop: 20,
  },
  subtitle: {
    fontFamily: "Times-Roman",
    fontSize: 13,
    color: c.dark,
    marginTop: 2,
    marginBottom: 16,
  },

  cards: {
    flexDirection: "row",
    marginBottom: 18,
  },
  card: {
    width: "31%",
    backgroundColor: c.panel,
    borderRadius: 6,
    padding: 10,
    marginRight: 10,
  },
  cardLabel: {
    fontSize: 8,
    color: c.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: c.dark,
  },

  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: c.headerRow,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    fontFamily: "Helvetica-Bold",
    color: c.dark,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  totalBar: {
    flexDirection: "row",
    backgroundColor: c.headerRow,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    fontFamily: "Helvetica-Bold",
    color: c.dark,
  },
  colNumber: { width: "16%" },
  colClient: { width: "26%" },
  colDate: { width: "16%" },
  colStatus: { width: "14%" },
  colAmount: { width: "14%", textAlign: "right" },
  colVat: { width: "14%", textAlign: "right" },

  empty: {
    marginTop: 10,
    color: c.muted,
  },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: c.line,
    paddingTop: 6,
    fontSize: 8,
    color: c.muted,
  },
})

/**
 * Printable summary of issued invoices for a period. Texts come from
 * the `t` / `tStatus` translators and dates/numbers are formatted
 * with `dateLocale`, all prepared by getPdfI18n() in the route.
 * Each invoice is calculated with its own vatRate.
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
      vatRate: invoice.vatRate,
    })
    return { invoice, grandTotal, vatAmount }
  })

  const totalAmount = rows.reduce((sum, r) => sum + r.grandTotal, 0)
  const totalVat = rows.reduce((sum, r) => sum + r.vatAmount, 0)

  // Company name/org.nr for the header come from the invoices
  // themselves (they snapshot the issuer), so no extra prop is needed.
  const issuer = invoices[0]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>{issuer ? issuer.issuerName : ""}</Text>
          <View style={styles.headerInfo}>
            {issuer ? (
              <Text style={styles.headerLine}>
                {t("orgNr")}: {issuer.issuerOrgNr}
              </Text>
            ) : null}
            <Text style={styles.headerLine}>
              {t("generated")}: {generatedAt.toLocaleDateString(dateLocale)}{" "}
              {generatedAt.toLocaleTimeString(dateLocale)}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{t("title")}</Text>
        <Text style={styles.subtitle}>
          {t("period")}: {periodLabel}
        </Text>

        {/* Summary cards */}
        {rows.length > 0 ? (
          <View style={styles.cards}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t("colAmount")}</Text>
              <Text style={styles.cardValue}>NOK {fmtInt(totalAmount)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t("colVat")}</Text>
              <Text style={styles.cardValue}>NOK {fmtInt(totalVat)}</Text>
            </View>
          </View>
        ) : null}

        {/* Table */}
        <View style={styles.tableHeaderRow}>
          <Text style={styles.colNumber}>{t("colNumber")}</Text>
          <Text style={styles.colClient}>{t("colClient")}</Text>
          <Text style={styles.colDate}>{t("colDate")}</Text>
          <Text style={styles.colStatus}>{t("colStatus")}</Text>
          <Text style={styles.colAmount}>{t("colAmount")}</Text>
          <Text style={styles.colVat}>{t("colVat")}</Text>
        </View>

        {rows.length === 0 ? (
          <Text style={styles.empty}>{t("noInvoices")}</Text>
        ) : (
          rows.map(({ invoice, grandTotal, vatAmount }, index) => (
            <View
              style={[
                styles.tableRow,
                { backgroundColor: index % 2 === 0 ? c.white : c.zebra },
              ]}
              key={invoice.id}
              wrap={false}
            >
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

        {rows.length > 0 ? (
          <View style={styles.totalBar} wrap={false}>
            <Text style={styles.colNumber}>{t("total")}</Text>
            <Text style={styles.colClient}></Text>
            <Text style={styles.colDate}></Text>
            <Text style={styles.colStatus}></Text>
            <Text style={styles.colAmount}>{fmtInt(totalAmount)}</Text>
            <Text style={styles.colVat}>{fmtInt(totalVat)}</Text>
          </View>
        ) : null}

        {/* Footer on every page */}
        <View style={styles.footer} fixed>
          <Text>{t("footer")}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}