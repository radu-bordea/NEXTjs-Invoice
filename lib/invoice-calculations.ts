import type { WorkLogItem } from "@/app/generated/prisma/client"

/**
 * The MVA rate applied once a business is registered — 25%,
 * the standard Norwegian rate this app supports.
 */
const MVA_RATE = 0.25

/**
 * Result of calculating an invoice's totals, including the
 * before/after-MVA-registration breakdown. Shared by the View
 * page, the list page, and the PDF renderer so all three always
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
 * For FIXED invoices, MVA applies as an all-or-nothing decision
 * based on the invoice's own date compared to mvaRegisteredFrom —
 * there's no per-line-item date range to split, so the whole price
 * is either taxed or not.
 *
 * For HOURLY invoices, splits line items into "before" and "after"
 * the invoice's snapshotted mvaRegisteredFrom date, sums each
 * group separately, and applies 25% VAT only to the "after" group.
 *
 * If mvaRegisteredFrom is null (never registered), nothing is
 * taxed in either case.
 *
 * @param billingType - "HOURLY" or "FIXED"
 * @param fixedPrice - the flat price, used only when billingType is FIXED
 * @param lineItems - the work log rows, used only when billingType is HOURLY
 * @param mvaRegisteredFrom - the invoice's snapshotted MVA registration
 *   date, or null if not registered at the time this invoice was created
 * @param invoiceDate - the invoice's own date, used for the FIXED
 *   all-or-nothing MVA decision
 */
export function calculateInvoiceTotals({
  billingType,
  fixedPrice,
  lineItems,
  mvaRegisteredFrom,
  invoiceDate,
}: {
  billingType: "HOURLY" | "FIXED"
  fixedPrice: number | null
  lineItems: WorkLogItem[]
  mvaRegisteredFrom: Date | null
  invoiceDate: Date
}): InvoiceTotals {
  if (billingType === "FIXED") {
    const price = fixedPrice ?? 0
    const isTaxable =
      mvaRegisteredFrom !== null && invoiceDate >= mvaRegisteredFrom

    return {
      subtotalBefore: isTaxable ? 0 : price,
      subtotalAfter: isTaxable ? price : 0,
      vatAmount: isTaxable ? price * MVA_RATE : 0,
      grandTotal: isTaxable ? price + price * MVA_RATE : price,
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