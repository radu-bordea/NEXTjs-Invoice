import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { aggregateByMonth, summarizeYear } from "@/lib/invoice-reports"
import { RevenueChart } from "@/components/reports/RevenueChart"

/**
 * Reports page — shows revenue, VAT collected, and a month-by-month
 * chart for a selected year. Defaults to the current year if none
 * is specified in the URL.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const { year: yearParam } = await searchParams
  const currentYear = new Date().getFullYear()
  const year = yearParam ? parseInt(yearParam, 10) : currentYear

  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      invoiceDate: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
    include: { lineItems: true },
  })

  const monthly = aggregateByMonth(invoices)
  const summary = summarizeYear(monthly)

  // Offer the current year plus the last 4 as filter options — a
  // freelancer's history won't usually go back further than that
  // in this app, and it keeps the year picker short.
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          {yearOptions.map((y) => (
            <YearLink key={y} year={y} isActive={y === year} />
          ))}
        </div>
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
          highlight
        />
        <SummaryCard
          label="VAT collected"
          value={summary.vatCollected}
          hint="From paid invoices"
        />
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          Revenue by month — {year}
        </h2>
        <RevenueChart data={monthly} />
      </div>
    </main>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string
  value: number
  hint: string
  highlight?: boolean
}) {
  const cardClass = highlight
    ? "rounded-lg border p-5 bg-teal-50 border-teal-200"
    : "rounded-lg border p-5"
  const valueClass = highlight
    ? "text-2xl font-bold text-teal-800"
    : "text-2xl font-bold"
  const formattedValue = value.toLocaleString("nb-NO", {
    maximumFractionDigits: 0,
  })

  return (
    <div className={cardClass}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={valueClass}>{formattedValue}</p>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  )
}

function YearLink({ year, isActive }: { year: number; isActive: boolean }) {
  const href = "/dashboard/reports?year=" + year
  const linkClass = isActive
    ? "px-3 py-1.5 rounded-full text-sm border cursor-pointer bg-teal-700 text-white border-teal-700"
    : "px-3 py-1.5 rounded-full text-sm border cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-50"

  return (
    <a href={href} className={linkClass}>
      {year}
    </a>
  )
}