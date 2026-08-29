import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Eye, Pencil, FileDown } from "lucide-react";
import { ClientSearchInput } from "@/components/invoice/ClientSearchInput";
import { StatusBadge } from "@/components/invoice/StatusBadge";

/**
 * Invoice list page. Supports filtering by status and searching by
 * client name via the URL (?status=DRAFT&client=acme) — using
 * searchParams keeps this a server component with no extra client
 * JS, and makes filtered views shareable/bookmarkable links.
 */
export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; client?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { status, client } = await searchParams;

  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      ...(status ? { status: status as "DRAFT" | "SENT" | "PAID" } : {}),
      ...(client
        ? { clientName: { contains: client, mode: "insensitive" } }
        : {}),
    },
    orderBy: { invoiceDate: "desc" },
  });

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Link
          href="/dashboard/invoices/new"
          className="bg-teal-700 text-white rounded-full font-medium px-5 py-2.5 hover:bg-teal-800 transition-colors"
        >
          + New Invoice
        </Link>
      </div>

      {/* Filter bar: status pills + client name search, both drive
          the same URL-based filtering via a GET form for the search
          box (no client JS needed — submitting reloads with ?client=) */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          <FilterLink
            label="All"
            status={undefined}
            current={status}
            client={client}
          />
          <FilterLink
            label="Draft"
            status="DRAFT"
            current={status}
            client={client}
          />
          <FilterLink
            label="Sent"
            status="SENT"
            current={status}
            client={client}
          />
          <FilterLink
            label="Paid"
            status="PAID"
            current={status}
            client={client}
          />
        </div>

        <ClientSearchInput />
      </div>

      {invoices.length === 0 ? (
        <p className="text-gray-500">No invoices found.</p>
      ) : (
        <table className="w-full text-sm border-collapse text-left">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-3 text-left">Invoice #</th>
              <th className="py-2 px-3 text-left">Client</th>
              <th className="py-2 px-3 text-left">Date</th>
              <th className="py-2 px-3 text-left">Due</th>
              <th className="py-2 px-3 text-left">Type</th>
              <th className="py-2 px-3 text-left">Amount</th>
              <th className="py-2 px-3 text-left">Status</th>
              <th className="py-2 px-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, index) => (
              <tr
                key={invoice.id}
                className={index % 2 === 0 ? "bg-white" : "bg-green-50"}
              >
                <td className="py-2 px-3 text-left">{invoice.invoiceNumber}</td>
                <td className="py-2 px-3 text-left">{invoice.clientName}</td>
                <td className="py-2 px-3 text-left">
                  {new Date(invoice.invoiceDate).toLocaleDateString()}
                </td>
                <td className="py-2 px-3 text-left">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </td>
                <td className="py-2 px-3 text-left">{invoice.billingType}</td>
                <td className="py-2 px-3 text-left">
                  {invoice.currency}{" "}
                  {invoice.fixedPrice ? invoice.fixedPrice.toString() : "—"}
                </td>
                <td className="py-2 px-3 text-left">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="py-2 px-3 text-left">
                  <div className="flex gap-3">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="text-gray-600 hover:text-teal-700"
                      title="View"
                    >
                      <Eye
                        className="text-green-600 cursor-pointer"
                        size={16}
                      />
                    </Link>
                    <Link
                      href={`/dashboard/invoices/${invoice.id}/edit`}
                      className="text-gray-600 hover:text-teal-700"
                      title="Edit"
                    >
                      <Pencil
                        className="text-yellow-500 cursor-pointer"
                        size={16}
                      />
                    </Link>
                    <a
                      href={`/dashboard/invoices/${invoice.id}/pdf`}
                      className="text-gray-600 hover:text-teal-700"
                      title="Download PDF"
                    >
                      <FileDown
                        className="text-red-700 cursor-pointer"
                        size={16}
                      />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination placeholder — wired up properly once there's
          enough test data for it to matter. Keeping the slot here
          now so the layout doesn't shift later. */}
      <div className="flex justify-center mt-6 text-sm text-gray-400">
        {/* Pagination controls go here */}
      </div>
    </main>
  );
}

/**
 * A single status filter pill — a plain link that sets/clears the
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
