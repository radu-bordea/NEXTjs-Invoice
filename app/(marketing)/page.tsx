export default function HomePage() {
  return (
    <main className="flex flex-col flex-1">
      <section className="flex flex-col items-center justify-center flex-1 p-8 text-center py-24">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 max-w-2xl">
          Invoicing built for Norwegian freelancers
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-xl">
          Create professional invoices, track hours or fixed-price projects,
          and download Skatteetaten-ready PDFs in minutes — no spreadsheets,
          no Google Docs templates.
        </p>

        <a
          href="/dashboard/invoices"
          className="bg-teal-700 text-white rounded-full font-medium px-6 py-3 hover:bg-teal-800 transition-colors"
        >
          Go to Dashboard
        </a>
    </section><section className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto px-8 pb-24">
        <div className="text-center">
          <h3 className="font-semibold text-lg mb-2">Built for Norway</h3>
          <p className="text-gray-600 text-sm">
            Org.nr, MVA thresholds, and IBAN/KID fields — set up the way
            Skatteetaten expects.
          </p>
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-lg mb-2">Hourly or fixed price</h3>
          <p className="text-gray-600 text-sm">
            Log hours against a rate, or bill a flat project price — switch
            per invoice.
          </p>
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-lg mb-2">Draft, edit, download</h3>
          <p className="text-gray-600 text-sm">
            Save incomplete invoices as drafts, edit anytime, and export a
            clean PDF when ready to send.
          </p>
        </div>
      </section>
    </main>
  )
}