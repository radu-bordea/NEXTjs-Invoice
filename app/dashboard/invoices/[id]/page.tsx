import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { StatusButtons } from "@/components/invoice/StatusButtons";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { ViewNotice } from "@/components/invoice/ViewNotice";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";

/**
 * Read-only invoice detail page. Confirms the invoice belongs to
 * the logged-in user, calculates the MVA breakdown and offers
 * status-change buttons.
 */
export default async function InvoiceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { id } = await params;

  const t = await getTranslations("InvoiceView");
  const format = await getFormatter();

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { lineItems: { orderBy: { date: "asc" } } },
  });

  // Ownership check: the invoice must exist AND belong to this user.
  if (!invoice || invoice.userId !== userId) {
    notFound();
  }

  const { subtotalBefore, subtotalAfter, vatAmount, grandTotal } =
    calculateInvoiceTotals({
      billingType: invoice.billingType,
      fixedPrice: invoice.fixedPrice ? Number(invoice.fixedPrice) : null,
      lineItems: invoice.lineItems,
      mvaRegisteredFrom: invoice.mvaRegisteredFrom,
      invoiceDate: invoice.invoiceDate,
    });

  const dateOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  } as const;
  const fmtDate = (d: Date | string) =>
    format.dateTime(new Date(d), dateOptions);
  const fmtMoney = (n: number) =>
    format.number(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <main className="max-w-3xl mx-auto p-8">
        <ViewNotice />
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {t("title", { number: invoice.invoiceNumber })}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/invoices/${invoice.id}/edit`}
              className="px-4 py-2 rounded-lg border-b text-sm hover:bg-gray-50 cursor-pointer"
            >
              {t("edit")}
            </Link>
            <Link
              href={`/dashboard/invoices/${invoice.id}/pdf`}
              className="px-4 py-2 rounded-lg border-b text-sm hover:bg-gray-50 cursor-pointer"
            >
              {t("downloadPdf")}
            </Link>
          </div>
        </div>

        <StatusButtons invoiceId={invoice.id} currentStatus={invoice.status} />

        <div className="rounded-lg border p-6 space-y-6 mt-6">
          {/* Issuer / client */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">{t("from")}</p>
              <p className="font-medium">{invoice.issuerName}</p>
              <p className="text-sm">
                {t("orgNr")}: {invoice.issuerOrgNr}
              </p>
              <p className="text-sm">{invoice.issuerAddress}</p>
              <p className="text-sm">{invoice.issuerPhone}</p>
              <p className="text-sm">{invoice.issuerEmail}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">{t("billTo")}</p>
              <p className="font-medium">{invoice.clientName}</p>
              {invoice.clientOrgNr && (
                <p className="text-sm">
                  {t("orgNr")}: {invoice.clientOrgNr}
                </p>
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
              <span className="text-gray-500">{t("invoiceDate")}</span>{" "}
              {fmtDate(invoice.invoiceDate)}
            </p>
            <p>
              <span className="text-gray-500">{t("dueDate")}</span>{" "}
              {fmtDate(invoice.dueDate)}
            </p>
            {invoice.periodStart && invoice.periodEnd && (
              <p className="col-span-2">
                <span className="text-gray-500">{t("period")}</span>{" "}
                {fmtDate(invoice.periodStart)} – {fmtDate(invoice.periodEnd)}
              </p>
            )}
            {invoice.projectRef && (
              <p className="col-span-2">
                <span className="text-gray-500">{t("projectRef")}</span>{" "}
                {invoice.projectRef}
              </p>
            )}
          </div>

          <hr />

          {/* Work log or fixed price */}
          {invoice.billingType === "HOURLY" ? (
            <div>
              <p className="text-sm font-medium mb-2">{t("workLog")}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-gray-500">
                    <th className="py-1 pr-4">{t("colDate")}</th>
                    <th className="py-1 pr-4">{t("colDescription")}</th>
                    <th className="py-1 pr-4">{t("colHours")}</th>
                    <th className="py-1 pr-4">{t("colRate")}</th>
                    <th className="py-1 pr-4">{t("colTotal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-1 pr-4">{fmtDate(item.date)}</td>
                      <td className="py-1 pr-4">{item.description}</td>
                      <td className="py-1 pr-4">{item.hours.toString()}</td>
                      <td className="py-1 pr-4">{item.rate.toString()}</td>
                      <td className="py-1 pr-4">
                        {fmtMoney(Number(item.hours) * Number(item.rate))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm">
              <span className="text-gray-500">{t("projectPrice")}</span>{" "}
              {invoice.currency} {fmtMoney(Number(invoice.fixedPrice))}
            </div>
          )}

          <hr />

          {/* Totals, including MVA breakdown when applicable */}
          <div className="space-y-1 text-sm">
            {invoice.mvaRegisteredFrom &&
              (subtotalBefore > 0 || subtotalAfter > 0) && (
                <>
                  {subtotalBefore > 0 && (
                    <p>
                      {t("workBefore")} — {invoice.currency}{" "}
                      {fmtMoney(subtotalBefore)}{" "}
                      <span className="text-gray-500">
                        {t("workBeforeHint")}
                      </span>
                    </p>
                  )}
                  {subtotalAfter > 0 && (
                    <p>
                      {t("workAfter")} — {invoice.currency}{" "}
                      {fmtMoney(subtotalAfter)}
                    </p>
                  )}
                  <p>
                    {t("vat")} = {invoice.currency} {fmtMoney(vatAmount)}
                  </p>
                </>
              )}

            {!invoice.mvaRegisteredFrom && (
              <p className="text-gray-500 italic">{t("noVat")}</p>
            )}

            <p className="text-lg font-semibold pt-2">
              {t("totalDue")} {invoice.currency} {fmtMoney(grandTotal)}
            </p>
          </div>

          <hr />

          {/* Payment details */}
          <div className="text-sm space-y-1">
            <p className="font-medium mb-1">{t("paymentDetails")}</p>
            <p>
              {t("account")} {invoice.ibanOrAccount}
            </p>
            {invoice.bic && <p>BIC/SWIFT: {invoice.bic}</p>}
            <p>
              {t("bank")} {invoice.bankName}
            </p>
            <p>
              {t("currency")} {invoice.currency}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}