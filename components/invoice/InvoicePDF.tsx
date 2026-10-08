import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer"
import type { Invoice, WorkLogItem } from "@/app/generated/prisma/client"
import { calculateInvoiceTotals } from "@/lib/invoice-calculations"
import type { PdfT } from "@/lib/pdf-i18n"

/**
 * React-PDF styles. Unlike Tailwind, this is a JS object passed to
 * StyleSheet.create — property names are camelCase versions of CSS
 * (fontSize not font-size), and only a subset of CSS is supported
 * (no CSS grid, limited flexbox, no gap — spacing is done with
 * marginBottom/marginRight instead).
 */
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    marginVertical: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  column: {
    flexDirection: "column",
    width: "48%",
  },
  label: {
    color: "#666666",
    marginBottom: 2,
  },
  bold: {
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
  },
  table: {
    marginTop: 4,
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
  colDate: { width: "15%" },
  colDescription: { width: "45%" },
  colHours: { width: "13%" },
  colRate: { width: "13%" },
  colTotal: { width: "14%", textAlign: "right" },
  totalsSection: {
    marginTop: 8,
  },
  grandTotal: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 8,
  },
  italic: {
    fontStyle: "italic",
    color: "#666666",
  },
})

/**
 * The printable invoice layout, rendered with React-PDF's own
 * primitives (View/Text, not div/span) since this targets an
 * actual PDF document, not HTML. Mirrors the same data and
 * calculations shown on the on-screen View page, using the same
 * shared calculateInvoiceTotals helper so the numbers always match.
 *
 * Texts come from the `t` translator and dates/numbers are formatted
 * with `dateLocale`, both prepared by getPdfI18n() in the route.
 */
export function InvoicePDF({
  invoice,
  t,
  dateLocale,
}: {
  invoice: Invoice & { lineItems: WorkLogItem[] }
  t: PdfT
  dateLocale: string
}) {
  const { subtotalBefore, subtotalAfter, vatAmount, grandTotal } =
    calculateInvoiceTotals({
      billingType: invoice.billingType,
      fixedPrice: invoice.fixedPrice ? Number(invoice.fixedPrice) : null,
      lineItems: invoice.lineItems,
      mvaRegisteredFrom: invoice.mvaRegisteredFrom,
      invoiceDate: invoice.invoiceDate,
    })

  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString(dateLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  const fmtMoney = (n: number) =>
    n.toLocaleString(dateLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          {t("title")}: {invoice.projectRef ? `${invoice.projectRef} - ` : ""}
          {invoice.invoiceNumber}
        </Text>
        <View style={styles.divider} />

        {/* Issuer / client */}
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={[styles.bold, { marginBottom: 4 }]}>
              {invoice.issuerName}
            </Text>
            <Text>
              {t("orgNr")}: {invoice.issuerOrgNr}
            </Text>
            <Text>{invoice.issuerAddress}</Text>
            <Text>{invoice.issuerPhone}</Text>
            <Text>{invoice.issuerEmail}</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>{t("billTo")}</Text>
            <Text style={styles.bold}>{invoice.clientName}</Text>
            {invoice.clientOrgNr && (
              <Text>
                {t("orgNr")}: {invoice.clientOrgNr}
              </Text>
            )}
            <Text>{invoice.clientAddress}</Text>
            {invoice.clientEmail && <Text>{invoice.clientEmail}</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Invoice meta */}
        <Text style={[styles.bold, { marginBottom: 4 }]}>
          {t("invoiceNumber")}: {invoice.invoiceNumber}
        </Text>
        <Text>
          {t("invoiceDate")}: {fmtDate(invoice.invoiceDate)}
        </Text>
        <Text>
          {t("dueDate")}: {fmtDate(invoice.dueDate)}
        </Text>
        {invoice.periodStart && invoice.periodEnd && (
          <Text>
            {t("period")}: {fmtDate(invoice.periodStart)} –{" "}
            {fmtDate(invoice.periodEnd)}
          </Text>
        )}
        {invoice.projectRef && (
          <Text>
            {t("projectRef")}: {invoice.projectRef}
          </Text>
        )}

        <View style={styles.divider} />

        {/* Work log or fixed price */}
        {invoice.billingType === "HOURLY" ? (
          <View>
            <Text style={styles.sectionTitle}>{t("workLog")}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.colDate, styles.bold]}>
                  {t("colDate")}
                </Text>
                <Text style={[styles.colDescription, styles.bold]}>
                  {t("colDescription")}
                </Text>
                <Text style={[styles.colHours, styles.bold]}>
                  {t("colHours")}
                </Text>
                <Text style={[styles.colRate, styles.bold]}>
                  {t("colRate")}
                </Text>
                <Text style={[styles.colTotal, styles.bold]}>
                  {t("colTotal")}
                </Text>
              </View>
              {invoice.lineItems.map((item) => (
                <View style={styles.tableRow} key={item.id}>
                  <Text style={styles.colDate}>{fmtDate(item.date)}</Text>
                  <Text style={styles.colDescription}>
                    {item.description}
                  </Text>
                  <Text style={styles.colHours}>{item.hours.toString()}</Text>
                  <Text style={styles.colRate}>{item.rate.toString()}</Text>
                  <Text style={styles.colTotal}>
                    {fmtMoney(Number(item.hours) * Number(item.rate))}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text>
            {t("projectPrice")}: {invoice.currency}{" "}
            {fmtMoney(Number(invoice.fixedPrice))}
          </Text>
        )}

        <View style={styles.divider} />

        {/* Totals, including MVA breakdown — applies to both
            HOURLY and FIXED invoices now, since the calculation
            helper handles both cases correctly. */}
        <View style={styles.totalsSection}>
          {invoice.mvaRegisteredFrom &&
            (subtotalBefore > 0 || subtotalAfter > 0) && (
              <>
                {subtotalBefore > 0 && (
                  <Text>
                    {t("workBefore")} — {invoice.currency}{" "}
                    {fmtMoney(subtotalBefore)} {t("workBeforeHint")}
                  </Text>
                )}
                {subtotalAfter > 0 && (
                  <Text>
                    {t("workAfter")} — {invoice.currency}{" "}
                    {fmtMoney(subtotalAfter)}
                  </Text>
                )}
                <Text>
                  {t("vat")} = {invoice.currency} {fmtMoney(vatAmount)}
                </Text>
              </>
            )}

          {!invoice.mvaRegisteredFrom && (
            <Text style={styles.italic}>{t("noVat")}</Text>
          )}

          <Text style={styles.grandTotal}>
            {t("totalDue")}: {invoice.currency} {fmtMoney(grandTotal)}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Payment details */}
        <View>
          <Text style={[styles.bold, { marginBottom: 4 }]}>
            {t("paymentDetails")}:
          </Text>
          <Text>
            {t("account")}: {invoice.ibanOrAccount}
          </Text>
          {invoice.bic && <Text>BIC/SWIFT: {invoice.bic}</Text>}
          <Text>
            {t("bank")}: {invoice.bankName}
          </Text>
          <Text>
            {t("currency")}: {invoice.currency}
          </Text>
        </View>

        <View style={styles.divider} />
        <Text style={styles.italic}>{t("taxNote")}</Text>
      </Page>
    </Document>
  )
}