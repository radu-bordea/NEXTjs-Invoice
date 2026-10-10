import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { getTranslations } from "next-intl/server";

/**
 * Edit page for an existing invoice. Only DRAFT invoices can be
 * edited — once SENT or PAID, the record is treated as final and
 * this page redirects back to the read-only view instead.
 */
export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { id } = await params;

  const t = await getTranslations("EditInvoice");

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { lineItems: { orderBy: { date: "asc" } } },
  });

  // Same ownership check as the View page — must exist AND belong
  // to this user.
  if (!invoice || invoice.userId !== userId) {
    notFound();
  }

  // Editing is only allowed while still a draft — once sent or
  // paid, redirect to the read-only view instead of showing a form
  // that would silently fail anyway (updateInvoice blocks it too,
  // but this avoids showing the form at all in that case).
  if (invoice.status !== "DRAFT") {
    redirect(`/dashboard/invoices/${invoice.id}?notice=edit-blocked`);
  }

  // Drafts follow the CURRENT company profile when edited, so the form
  // shows the VAT rate dropdown only if the user is registered now.
  const companyProfile = await prisma.companyProfile.findUnique({
    where: { userId },
    select: { mvaRegisteredFrom: true },
  });
  const mvaRegistered = Boolean(companyProfile?.mvaRegisteredFrom);

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">
        {t("title", { number: invoice.invoiceNumber })}
      </h1>
      <InvoiceForm invoice={invoice} mvaRegistered={mvaRegistered} />
    </main>
  );
}