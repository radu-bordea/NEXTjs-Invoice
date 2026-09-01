import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer"
import type { Invoice, WorkLogItem } from "@/app/generated/prisma/client"
import { calculateInvoiceTotals } from "@/lib/invoice-calculations"

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
 */
export function InvoicePDF({
  invoice,
}: {
  invoice: Invoice & { lineItems: WorkLogItem[] }
}) {
  const { subtotalBefore, subtotalAfter, vatAmount, grandTotal } =
    calculateInvoiceTotals({
      billingType: invoice.billingType,
      fixedPrice: invoice.fixedPrice ? Number(invoice.fixedPrice) : null,
      lineItems: invoice.lineItems,
      mvaRegisteredFrom: invoice.mvaRegisteredFrom,
    })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>INVOICE: {invoice.projectRef} - {invoice.invoiceNumber}</Text>
        <View style={styles.divider} />

        {/* Issuer / client */}
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={[styles.bold, { marginBottom: 4 }]}>
              {invoice.issuerName}
            </Text>
            <Text>Org.nr: {invoice.issuerOrgNr}</Text>
            <Text>{invoice.issuerAddress}</Text>
            <Text>{invoice.issuerPhone}</Text>
            <Text>{invoice.issuerEmail}</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>Bill To:</Text>
            <Text style={styles.bold}>{invoice.clientName}</Text>
            {invoice.clientOrgNr && <Text>Org.nr: {invoice.clientOrgNr}</Text>}
            <Text>{invoice.clientAddress}</Text>
            {invoice.clientEmail && <Text>{invoice.clientEmail}</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Invoice meta */}
        <Text style={[styles.bold, { marginBottom: 4 }]}>
          Invoice Number: {invoice.invoiceNumber}
        </Text>
        <Text>
          Invoice Date: {new Date(invoice.invoiceDate).toLocaleDateString()}
        </Text>
        <Text>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</Text>
        {invoice.periodStart && invoice.periodEnd && (
          <Text>
            Period of Work:{" "}
            {new Date(invoice.periodStart).toLocaleDateString()} –{" "}
            {new Date(invoice.periodEnd).toLocaleDateString()}
          </Text>
        )}
        {invoice.projectRef && (
          <Text>Project Reference: {invoice.projectRef}</Text>
        )}

        <View style={styles.divider} />

        {/* Work log or fixed price */}
        {invoice.billingType === "HOURLY" ? (
          <View>
            <Text style={styles.sectionTitle}>Work Log</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.colDate, styles.bold]}>Date</Text>
                <Text style={[styles.colDescription, styles.bold]}>
                  Description
                </Text>
                <Text style={[styles.colHours, styles.bold]}>Hours</Text>
                <Text style={[styles.colRate, styles.bold]}>Rate</Text>
                <Text style={[styles.colTotal, styles.bold]}>Total</Text>
              </View>
              {invoice.lineItems.map((item) => (
                <View style={styles.tableRow} key={item.id}>
                  <Text style={styles.colDate}>
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.colDescription}>
                    {item.description}
                  </Text>
                  <Text style={styles.colHours}>{item.hours.toString()}</Text>
                  <Text style={styles.colRate}>{item.rate.toString()}</Text>
                  <Text style={styles.colTotal}>
                    {(Number(item.hours) * Number(item.rate)).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text>
            Project price: {invoice.currency}{" "}
            {Number(invoice.fixedPrice).toFixed(2)}
          </Text>
        )}

        <View style={styles.divider} />

        {/* Totals, including MVA breakdown */}
        <View style={styles.totalsSection}>
          {invoice.billingType === "HOURLY" && invoice.mvaRegisteredFrom && (
            <>
              {subtotalBefore > 0 && (
                <Text>
                  Work before registration of 25% VAT — {invoice.currency}{" "}
                  {subtotalBefore.toFixed(2)} (over 50,000 NOK must be taxed)
                </Text>
              )}
              {subtotalAfter > 0 && (
                <Text>
                  Work after registration of 25% VAT — {invoice.currency}{" "}
                  {subtotalAfter.toFixed(2)}
                </Text>
              )}
              <Text>
                25% VAT = {invoice.currency} {vatAmount.toFixed(2)}
              </Text>
            </>
          )}

          {invoice.billingType === "HOURLY" && !invoice.mvaRegisteredFrom && (
            <Text style={styles.italic}>
              This invoice does NOT include VAT (MVA). VAT registration will
              be added once revenue exceeds NOK 50,000 in a 12-month period.
            </Text>
          )}

          <Text style={styles.grandTotal}>
            Total Due: {invoice.currency} {grandTotal.toFixed(2)}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Payment details */}
        <View>
          <Text style={[styles.bold, { marginBottom: 4 }]}>
            Payment Details:
          </Text>
          <Text>IBAN / Account: {invoice.ibanOrAccount}</Text>
          {invoice.bic && <Text>BIC/SWIFT: {invoice.bic}</Text>}
          <Text>Bank: {invoice.bankName}</Text>
          <Text>Currency: {invoice.currency}</Text>
        </View>

        <View style={styles.divider} />
        <Text style={styles.italic}>
          Tax on income is the responsibility of the business owner and is
          not included in the invoice amount.
        </Text>
      </Page>
    </Document>
  )
}