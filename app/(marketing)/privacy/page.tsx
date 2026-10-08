import { getFormatter, getTranslations } from "next-intl/server"
import { LegalPage, type LegalSection } from "@/components/LegalPage"
import { LEGAL } from "@/lib/legal-info"

export default async function PrivacyPage() {
  const t = await getTranslations("Privacy")
  const tl = await getTranslations("Legal")
  const format = await getFormatter()

  return (
    <LegalPage
      title={t("title")}
      updated={tl("lastUpdated", {
        date: format.dateTime(new Date(LEGAL.lastUpdated), {
          dateStyle: "long",
          timeZone: "UTC",
        }),
      })}
      intro={t.raw("intro") as string}
      sections={t.raw("sections") as LegalSection[]}
    />
  )
}