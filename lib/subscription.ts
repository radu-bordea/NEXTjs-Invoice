import prisma from "@/lib/prisma"

// Stripe keeps a subscription "active" until the paid period actually ends,
// even if the user has already cancelled, so this is safe to gate on.
const ACTIVE_STATUSES = ["active", "trialing"]

export async function isUserSubscribed(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  return !!sub && ACTIVE_STATUSES.includes(sub.status)
}

export async function getActiveSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub || !ACTIVE_STATUSES.includes(sub.status)) return null
  return sub
}

export const FREE_INVOICE_LIMIT = 3

export async function getMonthlyInvoiceCount(userId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return prisma.invoice.count({
    where: { userId, createdAt: { gte: startOfMonth } },
  })
}

export async function getInvoiceQuota(userId: string) {
  const subscribed = await isUserSubscribed(userId)
  const used = await getMonthlyInvoiceCount(userId)
  return {
    subscribed,
    used,
    limit: FREE_INVOICE_LIMIT,
    canCreate: subscribed || used < FREE_INVOICE_LIMIT,
  }
}