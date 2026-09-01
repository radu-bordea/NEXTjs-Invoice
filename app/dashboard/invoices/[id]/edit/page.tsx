import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";

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

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">
        Edit invoice {invoice.invoiceNumber}
      </h1>
      <InvoiceForm invoice={invoice} />
    </main>
  );
}
