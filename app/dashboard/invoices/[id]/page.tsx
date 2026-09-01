import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StatusButtons } from "@/components/invoice/StatusButtons";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { ViewNotice } from "@/components/invoice/ViewNotice";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";

/**
 * Read-only invoice detail page. Confirms the invoice belongs to
 * the logged-in user (not just that the id exists), calculates the
 * MVA breakdown for hourly invoices that straddle the registration
 * date, and offers status-change buttons.
 */
export default async function InvoiceViewPage({
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

  // Ownership check: the invoice must exist AND belong to this
  // user — without this, anyone could view any invoice by guessing
  // or typing another user's invoice id into the URL.
  if (!invoice || invoice.userId !== userId) {
    notFound();
  }

  const { subtotalBefore, subtotalAfter, vatAmount, grandTotal } =
    calculateInvoiceTotals({
      billingType: invoice.billingType,
      fixedPrice: invoice.fixedPrice ? Number(invoice.fixedPrice) : null,
      lineItems: invoice.lineItems,
      mvaRegisteredFrom: invoice.mvaRegisteredFrom,
    });

  return (
    <>
      <main className="max-w-3xl mx-auto p-8">
        <ViewNotice />
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              Invoice {invoice.invoiceNumber}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/invoices/${invoice.id}/edit`}
              className="px-4 py-2 rounded-lg border-b text-sm hover:bg-gray-50 cursor-pointer"
            >
              Edit
            </Link>
            <Link
              href={`/dashboard/invoices/${invoice.id}/pdf`}
              className="px-4 py-2 rounded-lg border-b text-sm hover:bg-gray-50 cursor-pointer"
            >
              Download PDF
            </Link>
          </div>
        </div>

        <StatusButtons invoiceId={invoice.id} currentStatus={invoice.status} />

        <div className="rounded-lg border p-6 space-y-6 mt-6">
          {/* Issuer / client */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">From</p>
              <p className="font-medium">{invoice.issuerName}</p>
              <p className="text-sm">Org.nr: {invoice.issuerOrgNr}</p>
              <p className="text-sm">{invoice.issuerAddress}</p>
              <p className="text-sm">{invoice.issuerPhone}</p>
              <p className="text-sm">{invoice.issuerEmail}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Bill to</p>
              <p className="font-medium">{invoice.clientName}</p>
              {invoice.clientOrgNr && (
                <p className="text-sm">Org.nr: {invoice.clientOrgNr}</p>
              )}
              <p className="text-sm">{invoice.clientAddress}</p>
              {invoice.clientEmail && (
                <p className="text-sm">{invoice.clientEmail}</p>
              )}
            </div>
          </div>

          <hr />

          {/* Invoice meta */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>
              <span className="text-gray-500">Invoice date:</span>{" "}
              {new Date(invoice.invoiceDate).toLocaleDateString()}
            </p>
            <p>
              <span className="text-gray-500">Due date:</span>{" "}
              {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
            {invoice.periodStart && invoice.periodEnd && (
              <p className="col-span-2">
                <span className="text-gray-500">Period:</span>{" "}
                {new Date(invoice.periodStart).toLocaleDateString()} –{" "}
                {new Date(invoice.periodEnd).toLocaleDateString()}
              </p>
            )}
            {invoice.projectRef && (
              <p className="col-span-2">
                <span className="text-gray-500">Project reference:</span>{" "}
                {invoice.projectRef}
              </p>
            )}
          </div>

          <hr />

          {/* Work log or fixed price */}
          {invoice.billingType === "HOURLY" ? (
            <div>
              <p className="text-sm font-medium mb-2">Work log</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-gray-500">
                    <th className="py-1 pr-4">Date</th>
                    <th className="py-1 pr-4">Description</th>
                    <th className="py-1 pr-4">Hours</th>
                    <th className="py-1 pr-4">Rate</th>
                    <th className="py-1 pr-4">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-1 pr-4">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="py-1 pr-4">{item.description}</td>
                      <td className="py-1 pr-4">{item.hours.toString()}</td>
                      <td className="py-1 pr-4">{item.rate.toString()}</td>
                      <td className="py-1 pr-4">
                        {(Number(item.hours) * Number(item.rate)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm">
              <span className="text-gray-500">Project price:</span>{" "}
              {invoice.currency} {Number(invoice.fixedPrice).toFixed(2)}
            </div>
          )}

          <hr />

          {/* Totals, including MVA breakdown when applicable */}
          <div className="space-y-1 text-sm">
            {invoice.billingType === "HOURLY" && invoice.mvaRegisteredFrom && (
              <>
                {subtotalBefore > 0 && (
                  <p>
                    Work before registration of 25% VAT — {invoice.currency}{" "}
                    {subtotalBefore.toFixed(2)}{" "}
                    <span className="text-gray-500">
                      (over 50,000 NOK must be taxed)
                    </span>
                  </p>
                )}
                {subtotalAfter > 0 && (
                  <p>
                    Work after registration of 25% VAT — {invoice.currency}{" "}
                    {subtotalAfter.toFixed(2)}
                  </p>
                )}
                <p>
                  25% VAT = {invoice.currency} {vatAmount.toFixed(2)}
                </p>
              </>
            )}

            {invoice.billingType === "HOURLY" && !invoice.mvaRegisteredFrom && (
              <p className="text-gray-500 italic">
                This invoice does not include VAT (MVA). VAT registration will be
                added once revenue exceeds NOK 50,000 in a 12-month period.
              </p>
            )}

            <p className="text-lg font-semibold pt-2">
              Total due: {invoice.currency} {grandTotal.toFixed(2)}
            </p>
          </div>

          <hr />

          {/* Payment details */}
          <div className="text-sm space-y-1">
            <p className="font-medium mb-1">Payment details</p>
            <p>IBAN / account: {invoice.ibanOrAccount}</p>
            {invoice.bic && <p>BIC/SWIFT: {invoice.bic}</p>}
            <p>Bank: {invoice.bankName}</p>
            <p>Currency: {invoice.currency}</p>
          </div>
        </div>
      </main>
    </>
  );
}