import { cookies } from "next/headers"
import { createTranslator } from "next-intl"
import { defaultLocale, locales, type Locale } from "@/i18n/request"

/** Simple translator signature the PDF components can rely on. */
export type PdfT = (
  key: string,
  values?: Record<string, string | number>
) => string

/**
 * Builds translators for PDF rendering. The PDFs are generated
 * outside the normal React tree, so next-intl's hooks are not
 * available — instead we read the "locale" cookie ourselves and
 * create standalone translators from the same message files.
 *
 * `t` is the translator for the given namespace; `getT(ns)` gives
 * a translator for any other namespace (e.g. "Status", "Reports").
 */
export async function getPdfI18n(namespace: string) {
  const cookieValue = (await cookies()).get("locale")?.value
  const locale: Locale = locales.includes(cookieValue as Locale)
    ? (cookieValue as Locale)
    : defaultLocale

  const messages = (await import(`../messages/${locale}.json`)).default

  const getT = (ns: string) =>
    createTranslator({ locale, messages, namespace: ns }) as unknown as PdfT

  // Locale used for dates and numbers inside the PDF.
  const dateLocale = locale === "nb" ? "nb-NO" : "en-GB"

  return { t: getT(namespace), getT, locale, dateLocale }
}