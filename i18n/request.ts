import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"

export const locales = ["nb", "en"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "nb"

export default getRequestConfig(async () => {
  const store = await cookies()
  const saved = store.get("locale")?.value
  const locale: Locale = locales.includes(saved as Locale)
    ? (saved as Locale)
    : defaultLocale

  return {
    // English uses British formatting (day/month/year), which matches
    // the PDFs and is what Norwegian users expect. Messages still come
    // from the short locale ("en") below.
    locale: locale === "en" ? "en-GB" : locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})