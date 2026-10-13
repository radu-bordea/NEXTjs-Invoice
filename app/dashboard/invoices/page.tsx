import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ClientSearchInput } from "@/components/invoice/ClientSearchInput";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import { TrialNotice } from "@/components/TrialNotice";

import {
  Eye,
  Pencil,
  FileDown,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from "lucide-react";

type SortKey = "number" | "client" | "date" | "due" | "amount" | "status";
type SortDir = "asc" | "desc";

const SORT_KEYS: SortKey[] = [
  "number",
  "client",
  "date",
  "due",
  "amount",
  "status",
];

/**
 * Database ordering for every sortable column except "amount".
 * Amount is calculated in code (not a database column), so it is
 * sorted afterwards. A tie-breaker keeps the order stable.
 */
function buildOrderBy(sort: SortKey, dir: SortDir) {
  // Drafts have no invoice number yet; "nulls: last" keeps them at the end.
  const numberDesc = {
    invoiceNumber: { sort: "desc" as const, nulls: "last" as const },
  };

  switch (sort) {
    case "number":
      return [{ invoiceNumber: { sort: dir, nulls: "last" as const } }];
    case "client":
      return [{ clientName: dir }, numberDesc];
    case "due":
      return [{ dueDate: dir }, numberDesc];
    case "status":
      return [{ status: dir }, numberDesc];
    case "date":
    case "amount":
    default:
      return [{ invoiceDate: dir }, numberDesc];
  }
}

/**
 * Invoice list page. Supports filtering by status, searching by client
 * name and sorting by column, all via the URL
 * (?status=DRAFT&client=acme&sort=due&dir=asc).
 */
export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    client?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { status, client, sort: sortParam, dir: dirParam } = await searchParams;

  // Only accept known values from the URL. Default: newest date first.
  const sort: SortKey = SORT_KEYS.includes(sortParam as SortKey)
    ? (sortParam as SortKey)
    : "date";
  const dir: SortDir =
    dirParam === "asc" || dirParam === "desc" ? dirParam : "desc";

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
    orderBy: buildOrderBy(sort, dir),
    include: { lineItems: true },
  });

  // Calculate each invoice total once; it is used for display and sorting.
  const rows = invoices.map((invoice) => ({
    invoice,
    total: calculateInvoiceTotals({
      billingType: invoice.billingType,
      fixedPrice: invoice.fixedPrice ? Number(invoice.fixedPrice) : null,
      lineItems: invoice.lineItems,
      mvaRegisteredFrom: invoice.mvaRegisteredFrom,
      invoiceDate: invoice.invoiceDate,
      vatRate: invoice.vatRate,
    }).grandTotal,
  }));

  if (sort === "amount") {
    const factor = dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const diff = Number(a.total) - Number(b.total);
      if (diff !== 0) return diff * factor;
      return (b.invoice.invoiceNumber ?? "").localeCompare(
        a.invoice.invoiceNumber ?? "",
      );
    });
  }

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

      <TrialNotice />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          <FilterLink
            label={t("all")}
            status={undefined}
            current={status}
            client={client}
            sort={sortParam}
            dir={dirParam}
          />
          <FilterLink
            label={tStatus("DRAFT")}
            status="DRAFT"
            current={status}
            client={client}
            sort={sortParam}
            dir={dirParam}
          />
          <FilterLink
            label={tStatus("SENT")}
            status="SENT"
            current={status}
            client={client}
            sort={sortParam}
            dir={dirParam}
          />
          <FilterLink
            label={tStatus("PAID")}
            status="PAID"
            current={status}
            client={client}
            sort={sortParam}
            dir={dirParam}
          />
        </div>

        <ClientSearchInput />
      </div>

      {rows.length === 0 ? (
        <p className="text-gray-500">{t("noInvoices")}</p>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-[#d6e4db]">
          <table className="w-full min-w-225 text-sm border-collapse text-left">
            <thead>
              <tr className="bg-[#dcebe2] text-left text-[#1f4d3f]">
                <SortHeader
                  label={t("number")}
                  column="number"
                  sort={sort}
                  dir={dir}
                  status={status}
                  client={client}
                />
                <SortHeader
                  label={t("client")}
                  column="client"
                  sort={sort}
                  dir={dir}
                  status={status}
                  client={client}
                />
                <SortHeader
                  label={t("date")}
                  column="date"
                  sort={sort}
                  dir={dir}
                  status={status}
                  client={client}
                />
                <SortHeader
                  label={t("due")}
                  column="due"
                  sort={sort}
                  dir={dir}
                  status={status}
                  client={client}
                />
                <th className="py-3 px-3 text-left font-medium whitespace-nowrap">
                  {t("type")}
                </th>
                <SortHeader
                  label={t("amount")}
                  column="amount"
                  sort={sort}
                  dir={dir}
                  status={status}
                  client={client}
                />
                <SortHeader
                  label={t("status")}
                  column="status"
                  sort={sort}
                  dir={dir}
                  status={status}
                  client={client}
                />
                <th className="py-3 px-3 text-left font-medium whitespace-nowrap">
                  {t("actions")}
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map(({ invoice, total }, index) => (
                <tr
                  key={invoice.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-[#f3f8f5]"}
                >
                  <td className="py-2.5 px-3 text-left whitespace-nowrap">
                    {invoice.invoiceNumber ?? (
                      <span className="text-gray-400">{t("draftNumber")}</span>
                    )}
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
                    {format.number(total, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
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
 * "status" query param while preserving the client search and sorting.
 */
function FilterLink({
  label,
  status,
  current,
  client,
  sort,
  dir,
}: {
  label: string;
  status: string | undefined;
  current: string | undefined;
  client: string | undefined;
  sort: string | undefined;
  dir: string | undefined;
}) {
  const isActive = status === current;

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (client) params.set("client", client);
  if (sort) params.set("sort", sort);
  if (dir) params.set("dir", dir);
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

/**
 * A clickable table header. First click on a column sorts ascending,
 * clicking the active column again flips the direction. Status filter
 * and client search are preserved.
 */
function SortHeader({
  label,
  column,
  sort,
  dir,
  status,
  client,
}: {
  label: string;
  column: SortKey;
  sort: SortKey;
  dir: SortDir;
  status: string | undefined;
  client: string | undefined;
}) {
  const isActive = sort === column;
  const nextDir: SortDir = isActive && dir === "asc" ? "desc" : "asc";

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (client) params.set("client", client);
  params.set("sort", column);
  params.set("dir", nextDir);
  const href = `/dashboard/invoices?${params.toString()}`;

  return (
    <th
      className="py-3 px-3 text-left font-medium whitespace-nowrap"
      aria-sort={
        isActive ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <Link
        href={href}
        className="inline-flex items-center gap-1 hover:text-teal-700"
      >
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ArrowUp size={14} />
          ) : (
            <ArrowDown size={14} />
          )
        ) : (
          <ChevronsUpDown size={14} className="opacity-40" />
        )}
      </Link>
    </th>
  );
}
