import { auth } from "@clerk/nextjs/server"
import { InvoiceForm } from "@/components/invoice/InvoiceForm"
import { UpgradePrompt } from "@/components/UpgradePrompt"
import { getInvoiceQuota } from "@/lib/subscription"

export default async function NewInvoicePage() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const quota = await getInvoiceQuota(userId)

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
          <InvoiceForm />
        </>
      )}
    </main>
  )
}