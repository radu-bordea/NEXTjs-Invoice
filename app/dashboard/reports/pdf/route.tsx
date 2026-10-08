import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportPDF } from "@/components/reports/ReportPDF";
import { getMvaPeriod, getPeriodDateRange } from "@/lib/invoice-reports";
import { NextResponse } from "next/server";
import { isUserSubscribed } from "@/lib/subscription";
import { getPdfI18n } from "@/lib/pdf-i18n";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!(await isUserSubscribed(userId))) {
    return new NextResponse("Pro subscription required", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const periodParam = searchParams.get("period") ?? undefined;

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
    orderBy: { invoiceDate: "asc" },
  });

  const { t, getT, dateLocale } = await getPdfI18n("ReportPDF");
  const tReports = getT("Reports");
  const tStatus = getT("Status");

  const periodLabel = selectedPeriod
    ? `${tReports(`periods.${selectedPeriod.id}`)} ${year}`
    : t("fullYear", { year });

  const pdfBuffer = await renderToBuffer(
    <ReportPDF
      invoices={invoices}
      periodLabel={periodLabel}
      generatedAt={new Date()}
      t={t}
      tStatus={tStatus}
      dateLocale={dateLocale}
    />,
  );

  const filenamePart = selectedPeriod ? selectedPeriod.id : `year-${year}`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="report-${filenamePart}.pdf"`,
    },
  });
}