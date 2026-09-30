import type { Invoice, WorkLogItem } from "@/app/generated/prisma/client"
import { calculateInvoiceTotals } from "@/lib/invoice-calculations"

type InvoiceWithLineItems = Invoice & { lineItems: WorkLogItem[] }

/**
 * One month's worth of aggregated figures, used to feed the
 * revenue chart and the year-summary cards.
 */
export type MonthlyReport = {
  month: number // 1-12
  monthLabel: string // "Jan", "Feb", ...
  billedTotal: number // every invoice, any status
  paidTotal: number // PAID invoices only — actual received income
  vatCollected: number // VAT portion of PAID invoices only
}

/**
 * Aggregates a set of invoices (already filtered to one year) into
 * per-month totals. "Billed" counts every invoice regardless of
 * status — it's what you've charged clients. "Paid" and
 * "vatCollected" count only PAID invoices — actual money received
 * and the tax portion of it, which is what matters for real
 * revenue tracking and MVA reporting.
 */
export function aggregateByMonth(
  invoices: InvoiceWithLineItems[]
): MonthlyReport[] {
  const months: MonthlyReport[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthLabel: new Date(2000, i, 1).toLocaleString("en", { month: "short" }),
    billedTotal: 0,
    paidTotal: 0,
    vatCollected: 0,
  }))

 for (const invoice of invoices) {
  const { grandTotal, vatAmount } = calculateInvoiceTotals({
    billingType: invoice.billingType,
    fixedPrice: invoice.fixedPrice ? Number(invoice.fixedPrice) : null,
    lineItems: invoice.lineItems,
    mvaRegisteredFrom: invoice.mvaRegisteredFrom,
    invoiceDate: invoice.invoiceDate,
  })

  const monthIndex = new Date(invoice.invoiceDate).getMonth()

  // Only count invoices that have actually been sent — a DRAFT
  // hasn't been billed to anyone yet, so it shouldn't count toward
  // "billed" revenue.
  if (invoice.status === "SENT" || invoice.status === "PAID") {
    months[monthIndex].billedTotal += grandTotal
  }

  if (invoice.status === "PAID") {
    months[monthIndex].paidTotal += grandTotal
    months[monthIndex].vatCollected += vatAmount
  }
}

  return months
}

/**
 * Summary totals across the whole filtered set (typically a year),
 * derived from the same monthly breakdown so the cards and the
 * chart never disagree with each other.
 */
export function summarizeYear(monthly: MonthlyReport[]) {
  return monthly.reduce(
    (acc, m) => ({
      billedTotal: acc.billedTotal + m.billedTotal,
      paidTotal: acc.paidTotal + m.paidTotal,
      vatCollected: acc.vatCollected + m.vatCollected,
    }),
    { billedTotal: 0, paidTotal: 0, vatCollected: 0 }
  )
}


/**
 * Norway's standard MVA filing periods — six bi-monthly terms per
 * year, matching Skatteetaten's actual reporting schedule (not
 * arbitrary calendar months). Each period is defined by its
 * starting and ending month (1-12, inclusive).
 */
export const MVA_PERIODS = [
  { id: "jan-feb", label: "Jan–Feb", startMonth: 1, endMonth: 2 },
  { id: "mar-apr", label: "Mar–Apr", startMonth: 3, endMonth: 4 },
  { id: "may-jun", label: "May–Jun", startMonth: 5, endMonth: 6 },
  { id: "jul-aug", label: "Jul–Aug", startMonth: 7, endMonth: 8 },
  { id: "sep-oct", label: "Sep–Oct", startMonth: 9, endMonth: 10 },
  { id: "nov-dec", label: "Nov–Dec", startMonth: 11, endMonth: 12 },
] as const

export type MvaPeriodId = (typeof MVA_PERIODS)[number]["id"]

/**
 * Finds a period definition by its id, or returns undefined if the
 * id doesn't match any known period (e.g. bad/missing query param).
 */
export function getMvaPeriod(id: string | undefined) {
  return MVA_PERIODS.find((p) => p.id === id)
}

/**
 * Builds the inclusive start/end Date range for a given period and
 * year — used directly in the Prisma query's invoiceDate filter.
 */
export function getPeriodDateRange(year: number, period: (typeof MVA_PERIODS)[number]) {
  const start = new Date(year, period.startMonth - 1, 1)
  // First day of the month AFTER the period ends — used with `lt`
  // (less than) in the Prisma query, so it correctly includes the
  // entire last day of the period's final month.
  const end = new Date(year, period.endMonth, 1)
  return { start, end }
}