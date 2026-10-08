import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { getFormatter, getTranslations } from "next-intl/server"
import { getPlanInfo } from "@/lib/subscription"

export async function PlanBadge() {
  const { userId } = await auth()
  if (!userId) return null

  const t = await getTranslations("PlanBadge")
  const format = await getFormatter()
  const info = await getPlanInfo(userId)

  if (info.plan === "pro") {
    const cancelling = info.cancelAtPeriodEnd && info.periodEnd
    const date = info.periodEnd
      ? format.dateTime(info.periodEnd, { day: "numeric", month: "short" })
      : ""

    return (
      <Link
        href="/pricing"
        className={
          cancelling
            ? "text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-800"
            : "text-xs px-3 py-1 rounded-full bg-teal-100 text-teal-800"
        }
      >
        {cancelling ? t("proCancels", { date }) : t("pro")}
      </Link>
    )
  }

  const atLimit = info.used >= info.limit
  const values = { used: info.used, limit: info.limit }

  return (
    <Link
      href="/pricing"
      className={
        atLimit
          ? "text-xs px-3 py-1 rounded-full bg-red-100 text-red-800"
          : "text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700"
      }
    >
      {atLimit ? t("freeAtLimit", values) : t("free", values)}
    </Link>
  )
}