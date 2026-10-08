import Link from "next/link"
import { useTranslations } from "next-intl"

export default function HomePage() {
  const t = useTranslations("Home")

  return (
    <main className="flex flex-col flex-1">
      <section className="flex flex-col items-center justify-center flex-1 p-8 text-center py-24">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 max-w-2xl">
          {t("title")}
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-xl">{t("subtitle")}</p>

        <Link
          href="/dashboard/invoices"
          className="bg-teal-700 text-white rounded-full font-medium px-6 py-3 hover:bg-teal-800 transition-colors"
        >
          {t("cta")}
        </Link>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto px-8 pb-24">
        <div className="text-center">
          <h3 className="font-semibold text-lg mb-2">{t("norwayTitle")}</h3>
          <p className="text-gray-600 text-sm">{t("norwayText")}</p>
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-lg mb-2">{t("billingTitle")}</h3>
          <p className="text-gray-600 text-sm">{t("billingText")}</p>
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-lg mb-2">{t("draftTitle")}</h3>
          <p className="text-gray-600 text-sm">{t("draftText")}</p>
        </div>
      </section>
    </main>
  )
}