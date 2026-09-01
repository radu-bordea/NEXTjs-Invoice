import type { WorkLogItem } from "@/app/generated/prisma/client"

/**
 * The MVA rate applied once a business is registered — 25%,
 * the standard Norwegian rate this app supports.
 */
const MVA_RATE = 0.25

/**
 * Result of calculating an invoice's totals, including the
 * before/after-MVA-registration breakdown for hourly invoices.
 * Shared by the View page and the PDF renderer so both always
 * show identical numbers, computed by the same logic.
 */
export type InvoiceTotals = {
  subtotalBefore: number
  subtotalAfter: number
  vatAmount: number
  grandTotal: number
}

/**
 * Calculates an invoice's totals.
 *
 * For FIXED invoices, the grand total is simply the fixed price —
 * MVA logic doesn't apply (this app's line-item-level VAT split
 * only makes sense for hourly work billed across a date range).
 *
 * For HOURLY invoices, splits line items into "before" and "after"
 * the invoice's snapshotted mvaRegisteredFrom date, sums each
 * group separately, and applies 25% VAT only to the "after" group.
 * If mvaRegisteredFrom is null (never registered), nothing is
 * taxed and everything falls into subtotalBefore.
 *
 * @param billingType - "HOURLY" or "FIXED"
 * @param fixedPrice - the flat price, used only when billingType is FIXED
 * @param lineItems - the work log rows, used only when billingType is HOURLY
 * @param mvaRegisteredFrom - the invoice's snapshotted MVA registration
 *   date, or null if not registered at the time this invoice was created
 */
export function calculateInvoiceTotals({
  billingType,
  fixedPrice,
  lineItems,
  mvaRegisteredFrom,
}: {
  billingType: "HOURLY" | "FIXED"
  fixedPrice: number | null
  lineItems: WorkLogItem[]
  mvaRegisteredFrom: Date | null
}): InvoiceTotals {
  if (billingType === "FIXED") {
    return {
      subtotalBefore: 0,
      subtotalAfter: 0,
      vatAmount: 0,
      grandTotal: fixedPrice ?? 0,
    }
  }

  const beforeItems = lineItems.filter(
    (item) => !mvaRegisteredFrom || item.date < mvaRegisteredFrom
  )
  const afterItems = lineItems.filter(
    (item) => mvaRegisteredFrom && item.date >= mvaRegisteredFrom
  )

  const subtotalBefore = beforeItems.reduce(
    (sum, item) => sum + Number(item.hours) * Number(item.rate),
    0
  )
  const subtotalAfter = afterItems.reduce(
    (sum, item) => sum + Number(item.hours) * Number(item.rate),
    0
  )
  const vatAmount = subtotalAfter * MVA_RATE

  return {
    subtotalBefore,
    subtotalAfter,
    vatAmount,
    grandTotal: subtotalBefore + subtotalAfter + vatAmount,
  }
}