import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { InvoicePDF } from "@/components/invoice/InvoicePDF"
import { NextResponse } from "next/server"

/**
 * Serves a generated PDF for the given invoice.
 * Opens inline in the browser's native PDF viewer.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { id } = await params

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      lineItems: {
        orderBy: { date: "asc" },
      },
    },
  })

  // Invoice must exist and belong to the current user.
  if (!invoice || invoice.userId !== userId) {
    return new NextResponse("Not found", { status: 404 })
  }

  const pdfBuffer = await renderToBuffer(
    <InvoicePDF invoice={invoice} />
  )

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    },
  })
}