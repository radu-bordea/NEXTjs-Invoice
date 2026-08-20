import { z } from "zod"

/**
 * A single row in the invoice's work log — one line of billed work.
 * Used only when billingType is HOURLY; ignored for FIXED invoices.
 */
const workLogItemSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  hours: z.coerce.number().positive("Hours must be greater than 0"),
  rate: z.coerce.number().positive("Rate must be greater than 0"),
})

/**
 * Base fields shared by every invoice, regardless of billing type.
 * billingType-specific rules (fixedPrice vs lineItems) are layered
 * on top via .superRefine() below, since Zod's discriminated
 * unions get awkward with FormData's flat string/array shape.
 */
const baseInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  projectRef: z.string().optional(),

  clientName: z.string().min(1, "Client name is required"),
  clientOrgNr: z.string().optional(),
  clientAddress: z.string().min(1, "Client address is required"),
  clientEmail: z.email("Invalid email address").optional().or(z.literal("")),

  billingType: z.enum(["HOURLY", "FIXED"]),
  fixedPrice: z.coerce.number().positive().optional(),
  currency: z.enum(["NOK", "EUR", "USD"]).default("NOK"),

  lineItems: z.array(workLogItemSchema).optional(),
})

/**
 * Full invoice schema with conditional validation:
 * - HOURLY invoices must have at least one line item
 * - FIXED invoices must have a fixedPrice set
 *
 * superRefine lets us add custom cross-field checks that a plain
 * object schema can't express (e.g. "field A is required only if
 * field B equals X").
 */
export const invoiceSchema = baseInvoiceSchema.superRefine((data, ctx) => {
  if (data.billingType === "HOURLY") {
    if (!data.lineItems || data.lineItems.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one work log entry for an hourly invoice",
        path: ["lineItems"],
      })
    }
  }

  if (data.billingType === "FIXED") {
    if (!data.fixedPrice) {
      ctx.addIssue({
        code: "custom",
        message: "Fixed price is required for a fixed-price invoice",
        path: ["fixedPrice"],
      })
    }
  }
})

export type InvoiceInput = z.infer<typeof invoiceSchema>