import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { ReportPDF } from "@/components/reports/ReportPDF"
import { getMvaPeriod, getPeriodDateRange, MVA_PERIODS } from "@/lib/invoice-reports"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const yearParam = searchParams.get("year")
  const periodParam = searchParams.get("period") ?? undefined

  const currentYear = new Date().getFullYear()
  const year = yearParam ? parseInt(yearParam, 10) : currentYear

  const selectedPeriod = getMvaPeriod(periodParam)

  const dateRange = selectedPeriod
    ? getPeriodDateRange(year, selectedPeriod)
    : {
        start: new Date(`${year}-01-01`),
        end: new Date(`${year + 1}-01-01`),
      }

  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      invoiceDate: {
        gte: dateRange.start,
        lt: dateRange.end,
      },
    },
    include: { lineItems: true },
    orderBy: { invoiceDate: "asc" },
  })

  const periodLabel = selectedPeriod
    ? `${selectedPeriod.label} ${year}`
    : `Full year ${year}`

  const pdfBuffer = await renderToBuffer(
    <ReportPDF
      invoices={invoices}
      periodLabel={periodLabel}
      generatedAt={new Date()}
    />
  )

  const filenamePart = selectedPeriod ? selectedPeriod.id : `year-${year}`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="report-${filenamePart}.pdf"`,
    },
  })
}