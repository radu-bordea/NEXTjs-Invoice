import { InvoiceForm } from "@/components/invoice/InvoiceForm"

export default function NewInvoicePage() {
  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">New invoice</h1>
      <InvoiceForm />
    </main>
  )
}