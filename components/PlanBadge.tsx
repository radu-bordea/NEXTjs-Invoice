import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { getPlanInfo } from "@/lib/subscription"

export async function PlanBadge() {
  const { userId } = await auth()
  if (!userId) return null

  const info = await getPlanInfo(userId)

  if (info.plan === "pro") {
    const date = info.periodEnd?.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    })
    return (
      <Link
        href="/pricing"
        className={
          info.cancelAtPeriodEnd
            ? "text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-800"
            : "text-xs px-3 py-1 rounded-full bg-teal-100 text-teal-800"
        }
      >
        {info.cancelAtPeriodEnd ? `Pro · cancels ${date}` : "Pro"}
      </Link>
    )
  }

  const atLimit = info.used >= info.limit
  return (
    <Link
      href="/pricing"
      className={
        atLimit
          ? "text-xs px-3 py-1 rounded-full bg-red-100 text-red-800"
          : "text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700"
      }
    >
      Free · {info.used} of {info.limit} used{atLimit ? " · Upgrade" : ""}
    </Link>
  )
}