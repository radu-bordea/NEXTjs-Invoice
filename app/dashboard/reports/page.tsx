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
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { isUserSubscribed } from "@/lib/subscription";
import { UpgradePrompt } from "@/components/UpgradePrompt";

import { calculateInvoiceTotals } from "@/lib/invoice-calculations";
import { StatusBadge } from "@/components/invoice/StatusBadge";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const t = await getTranslations("Reports");
  const format = await getFormatter();

  const fmtNok = (n: number) =>
    "NOK " + format.number(n, { maximumFractionDigits: 0 });
  const fmtDate = (d: Date | string) =>
    format.dateTime(new Date(d), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  if (!(await isUserSubscribed(userId))) {
    return (
      <main className="p-4 sm:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
        <UpgradePrompt title={t("lockedTitle")} message={t("lockedMessage")} />
      </main>
    );
  }

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
      status: { in: ["SENT", "PAID"] },
      invoiceDate: {
        gte: dateRange.start,
        lt: dateRange.end,
      },
    },
    include: { lineItems: true },
  });

  const monthly = aggregateByMonth(invoices);
  const summary = summarizeYear(monthly);

  // One calculation per invoice, using the invoice's own vatRate.
  // The table rows and the totals row both come from these results.
  const rows = invoices.map((invoice) => {
    const { grandTotal, vatAmount } = calculateInvoiceTotals({
      billingType: invoice.billingType,
      fixedPrice: invoice.fixedPrice ? Number(invoice.fixedPrice) : null,
      lineItems: invoice.lineItems,
      mvaRegisteredFrom: invoice.mvaRegisteredFrom,
      invoiceDate: invoice.invoiceDate,
      vatRate: invoice.vatRate,
    });
    return { invoice, grandTotal, vatAmount };
  });
  const totalAmount = rows.reduce((sum, r) => sum + r.grandTotal, 0);
  const totalVat = rows.reduce((sum, r) => sum + r.vatAmount, 0);

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const pdfHref =
    "/dashboard/reports/pdf?year=" +
    year +
    (selectedPeriod ? "&period=" + selectedPeriod.id : "");

  return (
    <main className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
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
          label={t("allYear")}
          periodId={undefined}
          year={year}
          isActive={!selectedPeriod}
        />
        {MVA_PERIODS.map((p) => (
          <PeriodLink
            key={p.id}
            label={t(`periods.${p.id}`)}
            periodId={p.id}
            year={year}
            isActive={selectedPeriod?.id === p.id}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <SummaryCard
          label={t("totalBilled")}
          value={fmtNok(summary.billedTotal)}
          hint={t("totalBilledHint")}
        />
        <SummaryCard
          label={t("totalReceived")}
          value={fmtNok(summary.paidTotal)}
          hint={t("totalReceivedHint")}
          variant="highlight"
        />
        <SummaryCard
          label={t("vatCollected")}
          value={fmtNok(summary.vatCollected)}
          hint={t("vatCollectedHint")}
          variant="warning"
        />
      </div>

      <div className="rounded-xl border border-[#d6e4db] p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          {t("revenueByMonth", { year })}
          {selectedPeriod ? ` (${t(`periods.${selectedPeriod.id}`)})` : ""}
        </h2>
        <RevenueChart data={monthly} />
      </div>

      <div className="rounded-xl border border-[#d6e4db] p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          {t("invoicesInPeriod")}
        </h2>

        {rows.length === 0 ? (
          <p className="text-gray-500 text-sm">{t("noInvoices")}</p>
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border border-[#d6e4db] mb-6">
            <table className="w-full min-w-[600px] text-sm border-collapse text-left">
              <thead>
                <tr className="bg-[#dcebe2] text-left text-[#1f4d3f]">
                  <th className="py-3 px-3 font-medium whitespace-nowrap">
                    {t("colInvoice")}
                  </th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">
                    {t("colClient")}
                  </th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">
                    {t("colDate")}
                  </th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">
                    {t("colStatus")}
                  </th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">
                    {t("colAmount")}
                  </th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">
                    {t("colVat")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ invoice, grandTotal, vatAmount }, index) => (
                  <tr
                    key={invoice.id}
                    className={
                      (index % 2 === 0 ? "bg-white" : "bg-[#f3f8f5]") +
                      " hover:bg-[#eaf3ee] transition-colors"
                    }
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {invoice.clientName}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {fmtDate(invoice.invoiceDate)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {fmtNok(grandTotal)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {fmtNok(vatAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#dcebe2] font-semibold text-[#1f4d3f]">
                  <td className="py-3 px-3" colSpan={4}>
                    {t("total")}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {fmtNok(totalAmount)}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {fmtNok(totalVat)}
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
          {t("downloadPdf")}
        </a>
      </div>
    </main>
  );
}

/**
 * `value` is already formatted by the page (NOK + locale number format).
 */
function SummaryCard({
  label,
  value,
  hint,
  variant = "default",
}: {
  label: string;
  value: string;
  hint: string;
  variant?: "default" | "highlight" | "warning";
}) {
  const cardClass =
    variant === "highlight"
      ? "rounded-xl border p-5 bg-teal-50 border-teal-200"
      : variant === "warning"
        ? "rounded-xl border p-5 bg-red-50 border-red-200"
        : "rounded-xl border p-5 bg-[#eaf3ee] border-[#d6e4db]";

  const valueClass =
    variant === "highlight"
      ? "text-2xl font-bold text-teal-800"
      : variant === "warning"
        ? "text-2xl font-bold text-red-800"
        : "text-2xl font-bold text-[#1f4d3f]";

  return (
    <div className={cardClass}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={valueClass}>{value}</p>
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
    <Link href={href} className={linkClass}>
      {year}
    </Link>
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
    <Link href={href} className={linkClass}>
      {label}
    </Link>
  );
}
