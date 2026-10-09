import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { StatusButtons } from "@/components/invoice/StatusButtons";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { ViewNotice } from "@/components/invoice/ViewNotice";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";

/** Removes a trailing colon from labels like "Fakturadato:" */
const lbl = (s: string) => s.replace(/:\s*$/, "");

/**
 * Read-only invoice detail page. Confirms the invoice belongs to
 * the logged-in user, calculates the MVA breakdown (using the
 * invoice's own vatRate) and offers status-change buttons.
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
      vatRate: invoice.vatRate,
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

  const hasVatBreakdown =
    invoice.mvaRegisteredFrom && (subtotalBefore > 0 || subtotalAfter > 0);

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

        <div className="rounded-xl border border-[#d6e4db] bg-white overflow-hidden mt-6">
          {/* Header: issuer */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 px-6 py-5 border-b border-[#d6e4db]">
            <div>
              <p className="text-xs text-gray-500 mb-1">{t("from")}</p>
              <p className="font-semibold uppercase tracking-widest text-[#1f4d3f]">
                {invoice.issuerName}
              </p>
            </div>
            <div className="text-sm text-gray-600 sm:text-right space-y-0.5">
              <p>{invoice.issuerEmail}</p>
              <p>{invoice.issuerPhone}</p>
              <p>{invoice.issuerAddress}</p>
              <p>
                {lbl(t("orgNr"))}: {invoice.issuerOrgNr}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Client box + invoice details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="rounded-lg bg-[#eaf3ee] p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                  {t("billTo")}
                </p>
                <p className="font-semibold">{invoice.clientName}</p>
                {invoice.clientOrgNr && (
                  <p className="text-sm">
                    {lbl(t("orgNr"))}: {invoice.clientOrgNr}
                  </p>
                )}
                <p className="text-sm">{invoice.clientAddress}</p>
                {invoice.clientEmail && (
                  <p className="text-sm">{invoice.clientEmail}</p>
                )}
              </div>

              <div className="text-sm space-y-2 pt-1">
                <p className="flex justify-between gap-4">
                  <span className="text-gray-500">{lbl(t("invoiceDate"))}</span>
                  <span>{fmtDate(invoice.invoiceDate)}</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-gray-500">{lbl(t("dueDate"))}</span>
                  <span>{fmtDate(invoice.dueDate)}</span>
                </p>
                {invoice.periodStart && invoice.periodEnd && (
                  <p className="flex justify-between gap-4">
                    <span className="text-gray-500">{lbl(t("period"))}</span>
                    <span>
                      {fmtDate(invoice.periodStart)} –{" "}
                      {fmtDate(invoice.periodEnd)}
                    </span>
                  </p>
                )}
                {invoice.projectRef && (
                  <p className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      {lbl(t("projectRef"))}
                    </span>
                    <span>{invoice.projectRef}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Work log or fixed price */}
            {invoice.billingType === "HOURLY" ? (
              <div>
                <p className="font-semibold text-[#1f4d3f] mb-2">
                  {t("workLog")}
                </p>
                <div className="overflow-x-auto rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#dcebe2] text-left text-[#1f4d3f]">
                        <th className="py-2 px-3 font-medium">{t("colDate")}</th>
                        <th className="py-2 px-3 font-medium">
                          {t("colDescription")}
                        </th>
                        <th className="py-2 px-3 font-medium text-right">
                          {t("colHours")}
                        </th>
                        <th className="py-2 px-3 font-medium text-right">
                          {t("colRate")}
                        </th>
                        <th className="py-2 px-3 font-medium text-right">
                          {t("colTotal")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.lineItems.map((item) => (
                        <tr
                          key={item.id}
                          className="odd:bg-white even:bg-[#f3f8f5]"
                        >
                          <td className="py-2 px-3">{fmtDate(item.date)}</td>
                          <td className="py-2 px-3">{item.description}</td>
                          <td className="py-2 px-3 text-right">
                            {item.hours.toString()}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {fmtMoney(Number(item.rate))}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {fmtMoney(Number(item.hours) * Number(item.rate))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex justify-between rounded-lg bg-[#f3f8f5] px-3 py-3 text-sm">
                <span>{lbl(t("projectPrice"))}</span>
                <span>
                  {invoice.currency} {fmtMoney(Number(invoice.fixedPrice))}
                </span>
              </div>
            )}

            {/* Totals, including MVA breakdown when applicable */}
            <div className="rounded-lg border border-[#d6e4db] overflow-hidden text-sm">
              <div className="p-4 space-y-1">
                {hasVatBreakdown && (
                  <>
                    {subtotalBefore > 0 && (
                      <div className="flex justify-between gap-4">
                        <div>
                          <p>{t("workBefore")}</p>
                          <p className="text-xs text-gray-500">
                            {t("workBeforeHint")}
                          </p>
                        </div>
                        <p>
                          {invoice.currency} {fmtMoney(subtotalBefore)}
                        </p>
                      </div>
                    )}
                    {subtotalAfter > 0 && (
                      <div className="flex justify-between gap-4">
                        <p>{t("workAfter", { rate: invoice.vatRate })}</p>
                        <p>
                          {invoice.currency} {fmtMoney(subtotalAfter)}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <p>{t("vat", { rate: invoice.vatRate })}</p>
                      <p>
                        {invoice.currency} {fmtMoney(vatAmount)}
                      </p>
                    </div>
                  </>
                )}

                {!invoice.mvaRegisteredFrom && (
                  <p className="text-gray-500 italic">{t("noVat")}</p>
                )}
              </div>
              <div className="flex justify-between gap-4 bg-[#dcebe2] px-4 py-3 text-lg font-semibold text-[#1f4d3f]">
                <span>{lbl(t("totalDue"))}</span>
                <span>
                  {invoice.currency} {fmtMoney(grandTotal)}
                </span>
              </div>
            </div>

            {/* Payment details */}
            <div className="rounded-lg border border-[#d6e4db] p-4 text-sm space-y-1">
              <p className="font-semibold text-[#1f4d3f] mb-1">
                {t("paymentDetails")}
              </p>
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
        </div>
      </main>
    </>
  );
}