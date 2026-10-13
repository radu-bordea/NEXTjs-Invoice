import { auth } from "@clerk/nextjs/server"
import { getTranslations } from "next-intl/server"
import {
  getTrialInfo,
  isUserSubscribed,
  TRIAL_DAYS,
  TRIAL_INVOICE_LIMIT,
} from "@/lib/subscription"

/**
 * Banner shown to non-paying users during their first-month offer.
 * Renders nothing for Pro users or when the offer has ended.
 */
export async function TrialNotice() {
  const { userId } = await auth()
  if (!userId) return null
  if (await isUserSubscribed(userId)) return null

  const trial = await getTrialInfo(userId)
  if (!trial.active) return null

  const t = await getTranslations("Trial")

  return (
    <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
      <p className="font-medium">{t("title")}</p>
      <p>{t("included", { limit: TRIAL_INVOICE_LIMIT })}</p>
      <p className="text-teal-800">
        {trial.started
          ? t("daysLeft", { days: trial.daysLeft })
          : t("notStarted", { days: TRIAL_DAYS })}
      </p>
    </div>
  )
}