import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { InvoiceForm } from "@/components/invoice/InvoiceForm"
import { UpgradePrompt } from "@/components/UpgradePrompt"
import { getInvoiceQuota } from "@/lib/subscription"

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const { from } = await searchParams
  const quota = await getInvoiceQuota(userId)

  // Build a prefilled "template" from an existing invoice.
  // Nothing is saved here. It only fills the form.
  let template = undefined
  if (from) {
    const original = await prisma.invoice.findUnique({
      where: { id: from },
      include: { lineItems: true },
    })
    if (original && original.userId === userId) {
      const today = new Date()
      const gapMs = original.dueDate.getTime() - original.invoiceDate.getTime()
      template = {
        ...original,
        invoiceDate: today,
        dueDate: new Date(today.getTime() + gapMs),
        periodStart: null,
        periodEnd: null,
        lineItems: original.lineItems.map((item) => ({ ...item, date: today })),
      }
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">New invoice</h1>

      {!quota.canCreate ? (
        <UpgradePrompt
          title="You've used your 3 free invoices this month"
          message="Upgrade to Pro for unlimited invoices, email delivery and Skatteetaten reports. Your limit resets on the 1st."
        />
      ) : (
        <>
          {!quota.subscribed && (
            <p className="text-sm text-gray-500 mb-4">
              {quota.used} of {quota.limit} free invoices used this month
            </p>
          )}
          <InvoiceForm template={template} />
        </>
      )}
    </main>
  )
}