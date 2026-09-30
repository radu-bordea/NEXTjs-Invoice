import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import {
  aggregateByMonth,
  summarizeYear,
  MVA_PERIODS,
  getMvaPeriod,
  getPeriodDateRange,
} from "@/lib/invoice-reports";
import { RevenueChart } from "@/components/reports/RevenueChart";

import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import { StatusBadge } from "@/components/invoice/StatusBadge";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { year: yearParam, period: periodParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  const selectedPeriod = getMvaPeriod(periodParam);

  const dateRange = selectedPeriod
    ? getPeriodDateRange(year, selectedPeriod)
    : {
        start: new Date(`${year}-01-01`),
        end: new Date(`${year + 1}-01-01`),
      };

  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      invoiceDate: {
        gte: dateRange.start,
        lt: dateRange.end,
      },
    },
    include: { lineItems: true },
  });

  const monthly = aggregateByMonth(invoices);
  const summary = summarizeYear(monthly);

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const pdfHref =
    "/dashboard/reports/pdf?year=" +
    year +
    (selectedPeriod ? "&period=" + selectedPeriod.id : "");

  return (
    <main className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            {yearOptions.map((y) => (
              <YearLink
                key={y}
                year={y}
                isActive={y === year}
                period={periodParam}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Period filter — matches Skatteetaten's actual bi-monthly
      MVA filing terms, alongside an "All year" option */}
      <div className="flex flex-wrap gap-2 mb-8">
        <PeriodLink
          label="All year"
          periodId={undefined}
          year={year}
          isActive={!selectedPeriod}
        />
        {MVA_PERIODS.map((p) => (
          <PeriodLink
            key={p.id}
            label={p.label}
            periodId={p.id}
            year={year}
            isActive={selectedPeriod?.id === p.id}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <SummaryCard
          label="Total billed"
          value={summary.billedTotal}
          hint="All invoices, any status"
        />
        <SummaryCard
          label="Total received"
          value={summary.paidTotal}
          hint="Paid invoices only"
          variant="highlight"
        />
        <SummaryCard
          label="VAT collected"
          value={summary.vatCollected}
          hint="From paid invoices"
          variant="warning"
        />
      </div>

      <div className="rounded-lg border p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          Revenue by month — {year}
          {selectedPeriod ? ` (${selectedPeriod.label})` : ""}
        </h2>
        <RevenueChart data={monthly} />
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          Invoices in this period
        </h2>

        {invoices.length === 0 ? (
          <p className="text-gray-500 text-sm">No invoices in this period.</p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm border-collapse text-left">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-3 whitespace-nowrap">Invoice #</th>
                  <th className="py-2 px-3 whitespace-nowrap">Client</th>
                  <th className="py-2 px-3 whitespace-nowrap">Date</th>
                  <th className="py-2 px-3 whitespace-nowrap">Status</th>
                  <th className="py-2 px-3 whitespace-nowrap">Amount</th>
                  <th className="py-2 px-3 whitespace-nowrap">VAT</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, index) => {
                  const { grandTotal, vatAmount } = calculateInvoiceTotals({
                    billingType: invoice.billingType,
                    fixedPrice: invoice.fixedPrice
                      ? Number(invoice.fixedPrice)
                      : null,
                    lineItems: invoice.lineItems,
                    mvaRegisteredFrom: invoice.mvaRegisteredFrom,
                    invoiceDate: invoice.invoiceDate,
                  });

                  return (
                    <tr
                      key={invoice.id}
                      className={
                        (index % 2 === 0 ? "bg-white" : "bg-green-50") +
                        " hover:bg-gray-100 transition-colors"
                      }
                    >
                      <td className="py-2 px-3 whitespace-nowrap">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {invoice.clientName}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        NOK{" "}
                        {grandTotal.toLocaleString("nb-NO", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        NOK{" "}
                        {vatAmount.toLocaleString("nb-NO", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="py-2 px-3" colSpan={4}>
                    Total
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    NOK{" "}
                    {invoices
                      .reduce((sum, invoice) => {
                        const { grandTotal } = calculateInvoiceTotals({
                          billingType: invoice.billingType,
                          fixedPrice: invoice.fixedPrice
                            ? Number(invoice.fixedPrice)
                            : null,
                          lineItems: invoice.lineItems,
                          mvaRegisteredFrom: invoice.mvaRegisteredFrom,
                          invoiceDate: invoice.invoiceDate,
                        });
                        return sum + grandTotal;
                      }, 0)
                      .toLocaleString("nb-NO", { maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    NOK{" "}
                    {invoices
                      .reduce((sum, invoice) => {
                        const { vatAmount } = calculateInvoiceTotals({
                          billingType: invoice.billingType,
                          fixedPrice: invoice.fixedPrice
                            ? Number(invoice.fixedPrice)
                            : null,
                          lineItems: invoice.lineItems,
                          mvaRegisteredFrom: invoice.mvaRegisteredFrom,
                          invoiceDate: invoice.invoiceDate,
                        });
                        return sum + vatAmount;
                      }, 0)
                      .toLocaleString("nb-NO", { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <a
          href={pdfHref}
          download={`report-${selectedPeriod ? selectedPeriod.id : "year-" + year}.pdf`}
          className="inline-block bg-teal-700 text-white rounded-full font-medium px-6 py-3 hover:bg-teal-800 transition-colors cursor-pointer"
        >
          Download PDF
        </a>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  variant = "default",
}: {
  label: string;
  value: number;
  hint: string;
  variant?: "default" | "highlight" | "warning";
}) {
  const cardClass =
    variant === "highlight"
      ? "rounded-lg border p-5 bg-teal-50 border-teal-200"
      : variant === "warning"
        ? "rounded-lg border p-5 bg-red-50 border-red-200"
        : "rounded-lg border p-5";

  const valueClass =
    variant === "highlight"
      ? "text-2xl font-bold text-teal-800"
      : variant === "warning"
        ? "text-2xl font-bold text-red-800"
        : "text-2xl font-bold";

  const formattedValue =
    "NOK " + value.toLocaleString("nb-NO", { maximumFractionDigits: 0 });

  return (
    <div className={cardClass}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={valueClass}>{formattedValue}</p>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

function YearLink({
  year,
  isActive,
  period,
}: {
  year: number;
  isActive: boolean;
  period: string | undefined;
}) {
  const href =
    "/dashboard/reports?year=" + year + (period ? "&period=" + period : "");
  const linkClass = isActive
    ? "px-3 py-1.5 rounded-full text-sm border cursor-pointer bg-teal-700 text-white border-teal-700"
    : "px-3 py-1.5 rounded-full text-sm border cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-50";

  return (
    <a href={href} className={linkClass}>
      {year}
    </a>
  );
}

function PeriodLink({
  label,
  periodId,
  year,
  isActive,
}: {
  label: string;
  periodId: string | undefined;
  year: number;
  isActive: boolean;
}) {
  const href =
    "/dashboard/reports?year=" + year + (periodId ? "&period=" + periodId : "");
  const linkClass = isActive
    ? "px-3 py-1.5 rounded-full text-sm border cursor-pointer bg-teal-700 text-white border-teal-700"
    : "px-3 py-1.5 rounded-full text-sm border cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-50";

  return (
    <a href={href} className={linkClass}>
      {label}
    </a>
  );
}
