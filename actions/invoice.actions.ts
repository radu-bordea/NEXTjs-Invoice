"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { invoiceSchema } from "@/lib/zod/invoice.schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";

/**
 * Shape of the object returned by `createInvoice`.
 * Consumed by `useActionState` on the client, same pattern as
 * SaveCompanyProfileState.
 */
export type CreateInvoiceState = {
  success: boolean;
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

/**
 * Generates the next invoice number for the current user, scoped
 * per calendar year — e.g. "2026-01", "2026-02", ...
 *
 * Looks at the highest existing number for the current year and
 * increments it. Starts fresh at "-01" each new year.
 */
async function getNextInvoiceNumber(userId: string): Promise<string> {
  const currentYear = new Date().getFullYear();

  // Find this user's invoices from the current year only, sorted
  // so the most recent invoiceNumber comes first.
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      userId,
      invoiceNumber: { startsWith: `${currentYear}-` },
    },
    orderBy: { invoiceNumber: "desc" },
  });

  if (!lastInvoice) {
    return `${currentYear}-01`;
  }

  // invoiceNumber looks like "2026-07" — split on "-" and take the
  // second part as the sequence number, then increment it.
  const lastSequence = parseInt(lastInvoice.invoiceNumber.split("-")[1], 10);
  const nextSequence = (lastSequence + 1).toString().padStart(2, "0");

  return `${currentYear}-${nextSequence}`;
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
 * @param _prevState - previous action state (useActionState convention)
 * @param formData - submitted form fields, including a JSON-encoded
 *   "lineItems" field for HOURLY invoices
 */
export async function createInvoice(
  _prevState: CreateInvoiceState,
  formData: FormData,
): Promise<CreateInvoiceState> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Every invoice needs issuer details — pulled from the company
  // profile the user already filled out. Block invoice creation
  // entirely if there's no profile yet, since we'd have nothing
  // to put in the "from" section of the PDF.
  const companyProfile = await prisma.companyProfile.findUnique({
    where: { userId },
  });

  if (!companyProfile) {
    return {
      success: false,
      message:
        "Please complete your company profile before creating an invoice.",
    };
  }

  // Line items arrive as a JSON string from a hidden input in the
  // form (FormData can't represent nested arrays natively).
  const lineItemsRaw = formData.get("lineItems");
  let lineItems: unknown[] = [];
  if (typeof lineItemsRaw === "string" && lineItemsRaw.length > 0) {
    try {
      lineItems = JSON.parse(lineItemsRaw);
    } catch {
      return {
        success: false,
        message: "Invalid line items data.",
      };
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
  };

  const parsed = invoiceSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      errors: z.flattenError(parsed.error).fieldErrors,
      message: "Please fix the errors below.",
    };
  }

  const data = parsed.data;
  const invoiceNumber = await getNextInvoiceNumber(userId);

  await prisma.invoice.create({
    data: {
      userId,
      invoiceNumber,
      invoiceDate: new Date(data.invoiceDate),
      dueDate: new Date(data.dueDate),
      periodStart: data.periodStart ? new Date(data.periodStart) : null,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
      projectRef: data.projectRef || null,

      // Snapshot issuer details from the profile at creation time.
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

      // Snapshot the MVA registration date too, so past invoices
      // don't recalculate VAT if this changes later.
      mvaRegisteredFrom: companyProfile.mvaRegisteredFrom,

      status: "DRAFT",

      // Nested create: builds the related WorkLogItem rows in the
      // same database call as the invoice itself.
      lineItems: {
        create: data.lineItems?.map((item) => ({
          date: new Date(item.date),
          description: item.description,
          hours: item.hours,
          rate: item.rate,
        })),
      },
    },
  });

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}
