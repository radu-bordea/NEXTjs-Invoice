"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { invoiceSchema } from "@/lib/zod/invoice.schema"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/**
 * Shape of the object returned by `createInvoice`.
 * Consumed by `useActionState` on the client, same pattern as
 * SaveCompanyProfileState.
 */
export type CreateInvoiceState = {
  success: boolean
  errors?: Record<string, string[] | undefined>
  message?: string
  submittedValues?: Record<string, string>
}

/**
 * Generates the next invoice number for the current user, scoped
 * per calendar year — e.g. "2026-01", "2026-02", ...
 *
 * Looks at the highest existing number for the current year and
 * increments it. Starts fresh at "-01" each new year.
 */
async function getNextInvoiceNumber(userId: string): Promise<string> {
  const currentYear = new Date().getFullYear()

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      userId,
      invoiceNumber: { startsWith: `${currentYear}-` },
    },
    orderBy: { invoiceNumber: "desc" },
  })

  if (!lastInvoice) {
    return `${currentYear}-01`
  }

  const lastSequence = parseInt(lastInvoice.invoiceNumber.split("-")[1], 10)
  const nextSequence = (lastSequence + 1).toString().padStart(2, "0")

  return `${currentYear}-${nextSequence}`
}

/**
 * Creates a new invoice for the logged-in user.
 *
 * Pulls issuer details (name, org.nr, address, IBAN, etc.) from the
 * user's CompanyProfile and snapshots them onto the invoice — so
 * future edits to the profile never retroactively change past
 * invoices. Also snapshots mvaRegisteredFrom the same way, for the
 * per-line-item VAT calculation we'll do at PDF-generation time.
 *
 * On failed validation, echoes back the submitted values so the
 * form doesn't reset to blank — same pattern as CompanyProfile.
 *
 * @param _prevState - previous action state (useActionState convention)
 * @param formData - submitted form fields, including a JSON-encoded
 *   "lineItems" field for HOURLY invoices
 */
export async function createInvoice(
  _prevState: CreateInvoiceState,
  formData: FormData
): Promise<CreateInvoiceState> {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const companyProfile = await prisma.companyProfile.findUnique({
    where: { userId },
  })

  if (!companyProfile) {
    return {
      success: false,
      message: "Please complete your company profile before creating an invoice.",
    }
  }

  const lineItemsRaw = formData.get("lineItems")
  let lineItems: unknown[] = []
  if (typeof lineItemsRaw === "string" && lineItemsRaw.length > 0) {
    try {
      lineItems = JSON.parse(lineItemsRaw)
    } catch {
      return {
        success: false,
        message: "Invalid line items data.",
      }
    }
  }

  const raw = {
    invoiceDate: formData.get("invoiceDate"),
    dueDate: formData.get("dueDate"),
    periodStart: formData.get("periodStart") || undefined,
    periodEnd: formData.get("periodEnd") || undefined,
    projectRef: formData.get("projectRef") || undefined,
    clientName: formData.get("clientName"),
    clientOrgNr: formData.get("clientOrgNr") || undefined,
    clientAddress: formData.get("clientAddress"),
    clientEmail: formData.get("clientEmail") || "",
    billingType: formData.get("billingType"),
    fixedPrice: formData.get("fixedPrice") || undefined,
    currency: formData.get("currency") || "NOK",
    lineItems,
    // invoiceNumber is generated server-side below, not submitted
    // by the form — placeholder here just so the schema has
    // something to validate against before we overwrite it.
    invoiceNumber: "pending",
  }

  const parsed = invoiceSchema.safeParse(raw)

  if (!parsed.success) {
    return {
      success: false,
      errors: z.flattenError(parsed.error).fieldErrors,
      message: "Please fix the errors below.",
      submittedValues: {
        clientName: String(raw.clientName ?? ""),
        clientOrgNr: String(raw.clientOrgNr ?? ""),
        clientAddress: String(raw.clientAddress ?? ""),
        clientEmail: String(raw.clientEmail ?? ""),
        invoiceDate: String(raw.invoiceDate ?? ""),
        dueDate: String(raw.dueDate ?? ""),
        periodStart: String(raw.periodStart ?? ""),
        periodEnd: String(raw.periodEnd ?? ""),
        projectRef: String(raw.projectRef ?? ""),
        currency: String(raw.currency ?? "NOK"),
        fixedPrice: String(raw.fixedPrice ?? ""),
      },
    }
  }

  const data = parsed.data
  const invoiceNumber = await getNextInvoiceNumber(userId)

  await prisma.invoice.create({
    data: {
      userId,
      invoiceNumber,
      invoiceDate: new Date(data.invoiceDate),
      dueDate: new Date(data.dueDate),
      periodStart: data.periodStart ? new Date(data.periodStart) : null,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
      projectRef: data.projectRef || null,

      issuerName: companyProfile.name,
      issuerOrgNr: companyProfile.orgNr,
      issuerAddress: companyProfile.address,
      issuerPhone: companyProfile.phone,
      issuerEmail: companyProfile.email,

      clientName: data.clientName,
      clientOrgNr: data.clientOrgNr || null,
      clientAddress: data.clientAddress,
      clientEmail: data.clientEmail || null,

      billingType: data.billingType,
      fixedPrice: data.fixedPrice ?? null,
      currency: data.currency,

      ibanOrAccount: companyProfile.ibanOrAccount,
      bic: companyProfile.bic,
      bankName: companyProfile.bankName,

      mvaRegisteredFrom: companyProfile.mvaRegisteredFrom,

      status: "DRAFT",

      lineItems: {
        create: data.lineItems?.map((item) => ({
          date: new Date(item.date),
          description: item.description,
          hours: item.hours,
          rate: item.rate,
        })),
      },
    },
  })

  revalidatePath("/dashboard/invoices")
  redirect("/dashboard/invoices")
}

/**
 * Updates just the status field of an invoice (DRAFT -> SENT -> PAID).
 * Confirms the invoice belongs to the logged-in user before updating,
 * since invoice IDs are visible/guessable in the URL.
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  newStatus: "DRAFT" | "SENT" | "PAID"
) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  })

  if (!invoice || invoice.userId !== userId) {
    throw new Error("Invoice not found")
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: newStatus },
  })

  revalidatePath(`/dashboard/invoices/${invoiceId}`)
  revalidatePath("/dashboard/invoices")
}