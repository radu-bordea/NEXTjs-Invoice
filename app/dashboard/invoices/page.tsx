export default function InvoicesPage() {
  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>

        <a
        href="/dashboard/invoices/new"
        className="bg-teal-700 text-white rounded-full font-medium px-6 py-3 hover:bg-teal-800 transition-colors"
        >
        + New Invoice
      </a>
      </div>
      <p className="text-gray-500">No invoices yet.</p>
    </main>
  )
}