import type { WorkLogItem } from "@/app/generated/prisma/client"

/**
 * The default MVA rate: 25%, the standard Norwegian rate.
 * Other supported rates (15, 12, 0) are chosen per invoice.
 */
export const DEFAULT_MVA_RATE = 25

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
 * Two independent decisions:
 * 1. WHETHER MVA applies: depends on mvaRegisteredFrom (the date the
 *    business registered). Work before that date is never taxed.
 * 2. HOW MUCH: vatRate (percent) chosen on the invoice, e.g. 25, 15, 12, 0.
 *
 * For FIXED invoices it is all-or-nothing, based on the invoice date.
 * For HOURLY invoices, line items are split into "before" and "after"
 * the registration date, and VAT is applied only to the "after" group.
 *
 * If mvaRegisteredFrom is null (never registered), nothing is taxed.
 *
 * @param vatRate - percent, e.g. 25. Defaults to 25.
 */
export function calculateInvoiceTotals({
  billingType,
  fixedPrice,
  lineItems,
  mvaRegisteredFrom,
  invoiceDate,
  vatRate = DEFAULT_MVA_RATE,
}: {
  billingType: "HOURLY" | "FIXED"
  fixedPrice: number | null
  lineItems: WorkLogItem[]
  mvaRegisteredFrom: Date | null
  invoiceDate: Date
  vatRate?: number
}): InvoiceTotals {
  const rate = vatRate / 100

  if (billingType === "FIXED") {
    const price = fixedPrice ?? 0
    const isTaxable =
      mvaRegisteredFrom !== null && invoiceDate >= mvaRegisteredFrom

    return {
      subtotalBefore: isTaxable ? 0 : price,
      subtotalAfter: isTaxable ? price : 0,
      vatAmount: isTaxable ? price * rate : 0,
      grandTotal: isTaxable ? price + price * rate : price,
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
  const vatAmount = subtotalAfter * rate

  return {
    subtotalBefore,
    subtotalAfter,
    vatAmount,
    grandTotal: subtotalBefore + subtotalAfter + vatAmount,
  }
}