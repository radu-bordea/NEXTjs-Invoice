import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ClientSearchInput } from "@/components/invoice/ClientSearchInput";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";

import { Eye, Pencil, FileDown, Copy } from "lucide-react";

/**
 * Invoice list page. Supports filtering by status and searching by
 * client name via the URL (?status=DRAFT&client=acme).
 */
export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; client?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { status, client } = await searchParams;

  const t = await getTranslations("Invoices");
  const tStatus = await getTranslations("Status");
  const tBilling = await getTranslations("BillingType");
  const format = await getFormatter();

  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      ...(status ? { status: status as "DRAFT" | "SENT" | "PAID" } : {}),
      ...(client
        ? { clientName: { contains: client, mode: "insensitive" } }
        : {}),
    },
    orderBy: { invoiceDate: "desc" },
    include: { lineItems: true },
  });

  const dateOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  } as const;

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href="/dashboard/invoices/new"
          className="bg-teal-700 text-white rounded-full font-medium px-5 py-2.5 hover:bg-teal-800 transition-colors"
        >
          {t("newInvoice")}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          <FilterLink
            label={t("all")}
            status={undefined}
            current={status}
            client={client}
          />
          <FilterLink
            label={tStatus("DRAFT")}
            status="DRAFT"
            current={status}
            client={client}
          />
          <FilterLink
            label={tStatus("SENT")}
            status="SENT"
            current={status}
            client={client}
          />
          <FilterLink
            label={tStatus("PAID")}
            status="PAID"
            current={status}
            client={client}
          />
        </div>

        <ClientSearchInput />
      </div>

      {invoices.length === 0 ? (
        <p className="text-gray-500">{t("noInvoices")}</p>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-[#d6e4db]">
          <table className="w-full min-w-225 text-sm border-collapse text-left">
            <thead>
              <tr className="bg-[#dcebe2] text-left text-[#1f4d3f]">
                <th className="py-3 px-3 text-left font-medium whitespace-nowrap">
                  {t("number")}
                </th>
                <th className="py-3 px-3 text-left font-medium whitespace-nowrap">
                  {t("client")}
                </th>
                <th className="py-3 px-3 text-left font-medium whitespace-nowrap">
                  {t("date")}
                </th>
                <th className="py-3 px-3 text-left font-medium whitespace-nowrap">
                  {t("due")}
                </th>
                <th className="py-3 px-3 text-left font-medium whitespace-nowrap">
                  {t("type")}
                </th>
                <th className="py-3 px-3 text-left font-medium whitespace-nowrap">
                  {t("amount")}
                </th>
                <th className="py-3 px-3 text-left font-medium whitespace-nowrap">
                  {t("status")}
                </th>
                <th className="py-3 px-3 text-left font-medium whitespace-nowrap">
                  {t("actions")}
                </th>
              </tr>
            </thead>

            <tbody>
              {invoices.map((invoice, index) => (
                <tr
                  key={invoice.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-[#f3f8f5]"}
                >
                  <td className="py-2.5 px-3 text-left whitespace-nowrap">
                    {invoice.invoiceNumber}
                  </td>

                  <td className="py-2.5 px-3 text-left whitespace-nowrap">
                    {invoice.clientName}
                  </td>

                  <td className="py-2.5 px-3 text-left whitespace-nowrap">
                    {format.dateTime(
                      new Date(invoice.invoiceDate),
                      dateOptions,
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-left whitespace-nowrap">
                    {format.dateTime(new Date(invoice.dueDate), dateOptions)}
                  </td>

                  <td className="py-2.5 px-3 text-left whitespace-nowrap">
                    {tBilling(invoice.billingType)}
                  </td>

                  <td className="py-2.5 px-3 text-left whitespace-nowrap">
                    {invoice.currency}{" "}
                    {format.number(
                      calculateInvoiceTotals({
                        billingType: invoice.billingType,
                        fixedPrice: invoice.fixedPrice
                          ? Number(invoice.fixedPrice)
                          : null,
                        lineItems: invoice.lineItems,
                        mvaRegisteredFrom: invoice.mvaRegisteredFrom,
                        invoiceDate: invoice.invoiceDate,
                        vatRate: invoice.vatRate,
                      }).grandTotal,
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-left whitespace-nowrap">
                    <StatusBadge status={invoice.status} />
                  </td>

                  <td className="py-2.5 px-3 text-left whitespace-nowrap">
                    <div className="flex gap-3">
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="text-gray-600 hover:text-teal-700"
                        title={t("view")}
                      >
                        <Eye
                          className="text-green-600 cursor-pointer"
                          size={16}
                        />
                      </Link>

                      <Link
                        href={`/dashboard/invoices/${invoice.id}/edit`}
                        className="text-gray-600 hover:text-teal-700"
                        title={t("edit")}
                      >
                        <Pencil
                          className="text-yellow-500 cursor-pointer"
                          size={16}
                        />
                      </Link>

                      <a
                        href={`/dashboard/invoices/${invoice.id}/pdf`}
                        className="text-gray-600 hover:text-teal-700"
                        title={t("downloadPdf")}
                      >
                        <FileDown
                          className="text-red-700 cursor-pointer"
                          size={16}
                        />
                      </a>

                      <Link
                        href={`/dashboard/invoices/new?from=${invoice.id}`}
                        className="text-gray-600 hover:text-teal-700"
                        title={t("duplicate")}
                      >
                        <Copy
                          className="text-blue-600 cursor-pointer"
                          size={16}
                        />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination placeholder */}
      <div className="flex justify-center mt-6 text-sm text-gray-400">
        {/* Pagination controls go here */}
      </div>
    </main>
  );
}

/**
 * A single status filter pill: a plain link that sets/clears the
 * "status" query param while preserving any active client search.
 */
function FilterLink({
  label,
  status,
  current,
  client,
}: {
  label: string;
  status: string | undefined;
  current: string | undefined;
  client: string | undefined;
}) {
  const isActive = status === current;

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (client) params.set("client", client);
  const query = params.toString();
  const href = `/dashboard/invoices${query ? `?${query}` : ""}`;

  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-sm border ${
        isActive
          ? "bg-teal-700 text-white border-teal-700"
          : "border-gray-300 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}
