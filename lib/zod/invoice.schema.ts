import { z } from "zod";

/**
 * A single row in the invoice's work log — one line of billed work.
 * Used only when billingType is HOURLY; ignored for FIXED invoices.
 */
const workLogItemSchema = z.object({
  date: z.string().min(1, "dateRequired"),
  description: z.string().min(1, "descriptionRequired"),
  hours: z.coerce.number().positive("hoursPositive"),
  rate: z.coerce.number().positive("ratePositive"),
});

/**
 * Base fields shared by every invoice, regardless of billing type.
 * billingType-specific rules (fixedPrice vs lineItems) are layered
 * on top via .superRefine() below, since Zod's discriminated
 * unions get awkward with FormData's flat string/array shape.
 */
const baseInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "invoiceNumberRequired"),
  invoiceDate: z.string().min(1, "invoiceDateRequired"),
  dueDate: z.string().min(1, "dueDateRequired"),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  projectRef: z.string().optional(),

  clientName: z.string().min(1, "clientNameRequired"),
  clientOrgNr: z.string().optional(),
  clientAddress: z.string().min(1, "clientAddressRequired"),
  clientEmail: z.email("emailInvalid").optional().or(z.literal("")),

  billingType: z.enum(["HOURLY", "FIXED"]),
  fixedPrice: z.coerce.number().positive("fixedPricePositive").optional(),
  currency: z.literal("NOK").default("NOK"),
  vatRate: z.coerce
    .number()
    .refine((v) => [0, 12, 15, 25].includes(v), "vatRateInvalid")
    .default(25),

  lineItems: z.array(workLogItemSchema).optional(),
});

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
        message: "lineItemsRequired",
        path: ["lineItems"],
      });
    }
  }

  if (data.billingType === "FIXED") {
    if (!data.fixedPrice) {
      ctx.addIssue({
        code: "custom",
        message: "fixedPriceRequired",
        path: ["fixedPrice"],
      });
    }
  }
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
