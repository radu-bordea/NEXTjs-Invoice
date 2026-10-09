import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Invoice, WorkLogItem } from "@/app/generated/prisma/client";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import type { PdfT } from "@/lib/pdf-i18n";
import { pdfColors as c } from "@/lib/pdf-theme";

/**
 * React-PDF styles. This is a JS object passed to StyleSheet.create —
 * property names are camelCase versions of CSS, and only a subset of
 * CSS is supported (no CSS grid; spacing via margin/padding).
 * Fonts are PDF built-ins (Helvetica, Times) so nothing needs registering.
 */
const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 40,
    paddingBottom: 64,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: c.ink,
  },

  // Header: brand on the left, contact details on the right
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
    fontSize: 13,
    letterSpacing: 1.5,
    color: c.dark,
    textTransform: "uppercase",
    maxWidth: "62%",
  },
  contact: {
    alignItems: "flex-end",
    fontSize: 9,
    color: c.muted,
  },
  contactLine: {
    marginBottom: 2,
  },

  title: {
    fontFamily: "Times-Bold",
    fontSize: 34,
    color: c.dark,
    marginTop: 20,
  },
  subtitle: {
    fontFamily: "Times-Roman",
    fontSize: 13,
    color: c.dark,
    marginTop: 2,
    marginBottom: 18,
  },

  // Client box + invoice details
  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  clientBox: {
    width: "52%",
    backgroundColor: c.panel,
    borderRadius: 6,
    padding: 12,
  },
  boxLabel: {
    fontSize: 8,
    color: c.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 5,
  },
  clientName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginBottom: 3,
  },
  metaBox: {
    width: "42%",
    paddingTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  metaLabel: {
    color: c.muted,
  },

  sectionTitle: {
    fontFamily: "Times-Bold",
    fontSize: 14,
    color: c.dark,
    marginTop: 22,
    marginBottom: 6,
  },

  // Work log table
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
  colDate: { width: "16%" },
  colDescription: { width: "38%" },
  colHours: { width: "12%", textAlign: "right" },
  colRate: { width: "16%", textAlign: "right" },
  colTotal: { width: "18%", textAlign: "right" },

  fixedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: c.zebra,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  // Totals box
  totalsBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 6,
  },
  totalsBody: {
    padding: 10,
  },
  totalsLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  hint: {
    fontSize: 8,
    color: c.muted,
  },
  totalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: c.headerRow,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: c.dark,
  },

  // Payment box
  paymentBox: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 6,
    padding: 12,
  },
  paymentTitle: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    color: c.dark,
    marginBottom: 6,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  paymentLabel: {
    width: "28%",
    color: c.muted,
  },

  note: {
    marginTop: 14,
    fontSize: 8,
    fontStyle: "italic",
    color: c.muted,
  },
  italic: {
    fontStyle: "italic",
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
});

/**
 * The printable invoice layout, rendered with React-PDF's own
 * primitives (View/Text, not div/span) since this targets an
 * actual PDF document, not HTML. Uses the same shared
 * calculateInvoiceTotals helper as the View page so numbers match,
 * including the invoice's own vatRate.
 *
 * Texts come from the `t` translator and dates/numbers are formatted
 * with `dateLocale`, both prepared by getPdfI18n() in the route.
 */
export function InvoicePDF({
  invoice,
  t,
  dateLocale,
}: {
  invoice: Invoice & { lineItems: WorkLogItem[] };
  t: PdfT;
  dateLocale: string;
}) {
  const { subtotalBefore, subtotalAfter, vatAmount, grandTotal } =
    calculateInvoiceTotals({
      billingType: invoice.billingType,
      fixedPrice: invoice.fixedPrice ? Number(invoice.fixedPrice) : null,
      lineItems: invoice.lineItems,
      mvaRegisteredFrom: invoice.mvaRegisteredFrom,
      invoiceDate: invoice.invoiceDate,
      vatRate: invoice.vatRate,
    });

  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString(dateLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const fmtMoney = (n: number) =>
    n.toLocaleString(dateLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const hasVatBreakdown =
    invoice.mvaRegisteredFrom && (subtotalBefore > 0 || subtotalAfter > 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>{invoice.issuerName}</Text>
          <View style={styles.contact}>
            {invoice.issuerEmail ? (
              <Text style={styles.contactLine}>{invoice.issuerEmail}</Text>
            ) : null}
            {invoice.issuerPhone ? (
              <Text style={styles.contactLine}>{invoice.issuerPhone}</Text>
            ) : null}
            <Text style={styles.contactLine}>{invoice.issuerAddress}</Text>
            <Text style={styles.contactLine}>
              {t("orgNr")}: {invoice.issuerOrgNr}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{t("title")}</Text>

        {/* Client + invoice details */}
        <View style={styles.twoCol}>
          <View style={styles.clientBox}>
            <Text style={styles.boxLabel}>{t("billTo")}</Text>
            <Text style={styles.clientName}>{invoice.clientName}</Text>
            {invoice.clientOrgNr ? (
              <Text>
                {t("orgNr")}: {invoice.clientOrgNr}
              </Text>
            ) : null}
            <Text>{invoice.clientAddress}</Text>
            {invoice.clientEmail ? <Text>{invoice.clientEmail}</Text> : null}
          </View>

          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t("invoiceNumber")}</Text>
              <Text>{invoice.invoiceNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t("invoiceDate")}</Text>
              <Text>{fmtDate(invoice.invoiceDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t("dueDate")}</Text>
              <Text>{fmtDate(invoice.dueDate)}</Text>
            </View>
            {invoice.periodStart && invoice.periodEnd ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t("period")}</Text>
                <Text>
                  {fmtDate(invoice.periodStart)} – {fmtDate(invoice.periodEnd)}
                </Text>
              </View>
            ) : null}
            {invoice.projectRef ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t("projectRef")}</Text>
                <Text>{invoice.projectRef}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Work log or fixed price */}
        {invoice.billingType === "HOURLY" ? (
          <View>
            <Text style={styles.sectionTitle}>{t("workLog")}</Text>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.colDate}>{t("colDate")}</Text>
              <Text style={styles.colDescription}>{t("colDescription")}</Text>
              <Text style={styles.colHours}>{t("colHours")}</Text>
              <Text style={styles.colRate}>{t("colRate")}</Text>
              <Text style={styles.colTotal}>{t("colTotal")}</Text>
            </View>
            {invoice.lineItems.map((item, index) => (
              <View
                style={[
                  styles.tableRow,
                  { backgroundColor: index % 2 === 0 ? c.white : c.zebra },
                ]}
                key={item.id}
                wrap={false}
              >
                <Text style={styles.colDate}>{fmtDate(item.date)}</Text>
                <Text style={styles.colDescription}>{item.description}</Text>
                <Text style={styles.colHours}>{item.hours.toString()}</Text>
                <Text style={styles.colRate}>
                  {fmtMoney(Number(item.rate))}
                </Text>
                <Text style={styles.colTotal}>
                  {fmtMoney(Number(item.hours) * Number(item.rate))}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>{t("projectPrice")}</Text>
            <View style={styles.fixedRow}>
              <Text>{t("projectPrice")}</Text>
              <Text>
                {invoice.currency} {fmtMoney(Number(invoice.fixedPrice))}
              </Text>
            </View>
          </View>
        )}

        {/* Totals, including MVA breakdown (works for HOURLY and FIXED) */}
        <View style={styles.totalsBox} wrap={false}>
          <View style={styles.totalsBody}>
            {hasVatBreakdown ? (
              <>
                {subtotalBefore > 0 ? (
                  <View style={styles.totalsLine}>
                    <View>
                      <Text>{t("workBefore")}</Text>
                      <Text style={styles.hint}>{t("workBeforeHint")}</Text>
                    </View>
                    <Text>
                      {invoice.currency} {fmtMoney(subtotalBefore)}
                    </Text>
                  </View>
                ) : null}
                {subtotalAfter > 0 ? (
                  <View style={styles.totalsLine}>
                    <Text>{t("workAfter", { rate: invoice.vatRate })}</Text>
                    <Text>
                      {invoice.currency} {fmtMoney(subtotalAfter)}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.totalsLine}>
                  <Text>{t("vat", { rate: invoice.vatRate })}</Text>
                  <Text>
                    {invoice.currency} {fmtMoney(vatAmount)}
                  </Text>
                </View>
              </>
            ) : null}

            {!invoice.mvaRegisteredFrom ? (
              <Text style={styles.italic}>{t("noVat")}</Text>
            ) : null}
          </View>
          <View style={styles.totalBar}>
            <Text>{t("totalDue")}</Text>
            <Text>
              {invoice.currency} {fmtMoney(grandTotal)}
            </Text>
          </View>
        </View>

        {/* Payment details */}
        <View style={styles.paymentBox} wrap={false}>
          <Text style={styles.paymentTitle}>{t("paymentDetails")}</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>{t("account")}</Text>
            <Text>{invoice.ibanOrAccount}</Text>
          </View>
          {invoice.bic ? (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>BIC/SWIFT</Text>
              <Text>{invoice.bic}</Text>
            </View>
          ) : null}
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>{t("bank")}</Text>
            <Text>{invoice.bankName}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>{t("currency")}</Text>
            <Text>{invoice.currency}</Text>
          </View>
        </View>

        <Text style={styles.note}>{t("taxNote")}</Text>

        {/* Footer on every page */}
        <View style={styles.footer} fixed>
          <Text>
            {invoice.issuerName} · {t("orgNr")} {invoice.issuerOrgNr}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
